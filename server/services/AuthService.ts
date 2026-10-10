import crypto from 'node:crypto';
import { Database } from '../db/database.js';
import { AdminUser, UserRole } from '../types.js';

interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

export class AuthService {
  private static loginAttempts = new Map<string, LoginAttempt>();
  private static activeSessions = new Map<string, { adminId: string; expiresAt: number }>();

  /**
   * Hash password with PBKDF2 sha512
   */
  public static hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  }

  /**
   * Rate limiting check: max 5 attempts within 10 minutes
   */
  public static checkRateLimit(ipOrUsername: string): { isLocked: boolean; waitMinutes?: number } {
    const attempt = this.loginAttempts.get(ipOrUsername);
    if (!attempt) return { isLocked: false };

    const now = Date.now();
    if (attempt.lockedUntil && attempt.lockedUntil > now) {
      const waitMinutes = Math.ceil((attempt.lockedUntil - now) / 60000);
      return { isLocked: true, waitMinutes };
    }

    // Reset if window has passed (10 minutes)
    if (now - attempt.lastAttempt > 10 * 60 * 1000) {
      this.loginAttempts.delete(ipOrUsername);
      return { isLocked: false };
    }

    return { isLocked: false };
  }

  public static recordFailedAttempt(ipOrUsername: string): void {
    const now = Date.now();
    const attempt = this.loginAttempts.get(ipOrUsername) || { count: 0, lastAttempt: now };
    attempt.count += 1;
    attempt.lastAttempt = now;

    if (attempt.count >= 5) {
      // Lock for 15 minutes
      attempt.lockedUntil = now + 15 * 60 * 1000;
    }

    this.loginAttempts.set(ipOrUsername, attempt);
  }

  public static clearFailedAttempts(ipOrUsername: string): void {
    this.loginAttempts.delete(ipOrUsername);
  }

  /**
   * Authenticate admin by username/email and password
   */
  public static authenticate(
    loginIdentifier: string,
    plainPassword: string,
    ipAddress = '127.0.0.1'
  ): { success: boolean; token?: string; user?: AdminUser; error?: string } {
    const rateCheck = this.checkRateLimit(loginIdentifier);
    if (rateCheck.isLocked) {
      return {
        success: false,
        error: `Too many failed login attempts. Account temporarily locked for ${rateCheck.waitMinutes} minutes.`,
      };
    }

    const admins = Database.getAdmins();
    const admin = admins.find(
      (a) =>
        (a.username.toLowerCase() === loginIdentifier.toLowerCase() ||
          a.email.toLowerCase() === loginIdentifier.toLowerCase()) &&
        a.isActive
    );

    if (!admin) {
      this.recordFailedAttempt(loginIdentifier);
      return { success: false, error: 'Invalid username/email or password.' };
    }

    const calculatedHash = this.hashPassword(plainPassword, admin.salt);
    if (calculatedHash !== admin.passwordHash) {
      this.recordFailedAttempt(loginIdentifier);
      Database.appendAuditLog({
        adminId: admin.id,
        adminUsername: admin.username,
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        details: 'Incorrect password attempt',
        ipAddress,
      });
      return { success: false, error: 'Invalid username/email or password.' };
    }

    // Login successful
    this.clearFailedAttempts(loginIdentifier);

    // Update lastLoginAt
    admin.lastLoginAt = new Date().toISOString();
    Database.saveAdmins(admins);

    // Generate cryptographic session token
    const token = 'sess_' + crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 8 * 3600 * 1000; // 8 hours session
    this.activeSessions.set(token, { adminId: admin.id, expiresAt });

    Database.appendAuditLog({
      adminId: admin.id,
      adminUsername: admin.username,
      action: 'LOGIN_SUCCESS',
      entityType: 'AUTH',
      details: 'Administrator logged in successfully',
      ipAddress,
    });

    return {
      success: true,
      token,
      user: admin,
    };
  }

  /**
   * Validate session token
   */
  public static validateSession(token: string | undefined): AdminUser | null {
    if (!token) return null;
    const session = this.activeSessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.activeSessions.delete(token);
      return null;
    }

    const admins = Database.getAdmins();
    return admins.find((a) => a.id === session.adminId && a.isActive) || null;
  }

  /**
   * Terminate session (logout)
   */
  public static logout(token: string): void {
    const session = this.activeSessions.get(token);
    if (session) {
      const admins = Database.getAdmins();
      const admin = admins.find((a) => a.id === session.adminId);
      if (admin) {
        Database.appendAuditLog({
          adminId: admin.id,
          adminUsername: admin.username,
          action: 'LOGOUT',
          entityType: 'AUTH',
          details: 'Session ended',
        });
      }
      this.activeSessions.delete(token);
    }
  }

  /**
   * Role-based permission check
   */
  public static hasPermission(userRole: UserRole, targetRole: UserRole): boolean {
    if (userRole === 'super_admin' || userRole === 'admin') return true;
    if (userRole === targetRole) return true;
    if (targetRole === 'read_only') return true;

    if (userRole === 'manager') {
      return ['manager', 'operator', 'link_creator', 'template_designer', 'read_only'].includes(targetRole);
    }

    if (userRole === 'operator') {
      return ['operator', 'link_creator', 'template_designer', 'read_only'].includes(targetRole);
    }

    if (userRole === 'link_creator') {
      return ['link_creator', 'read_only'].includes(targetRole);
    }

    if (userRole === 'template_designer') {
      return ['template_designer', 'read_only'].includes(targetRole);
    }

    return false;
  }
}
