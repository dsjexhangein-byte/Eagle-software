import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { AuthService } from '../services/AuthService.js';
import { Database } from '../db/database.js';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';
import { AdminUser, UserRole } from '../types.js';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!username || !password) {
    res.status(400).json({ success: false, error: 'Username and password are required.' });
    return;
  }

  const result = AuthService.authenticate(username, password, ip);
  if (!result.success) {
    res.status(401).json({ success: false, error: result.error });
    return;
  }

  // Safe user representation (omit passwordHash and salt)
  const safeUser = {
    id: result.user?.id,
    username: result.user?.username,
    email: result.user?.email,
    name: result.user?.name,
    role: result.user?.role,
    lastLoginAt: result.user?.lastLoginAt,
  };

  res.json({
    success: true,
    token: result.token,
    user: safeUser,
  });
});

// GET /api/auth/me
authRouter.get('/me', (req: Request, res: Response): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = AuthService.validateSession(token);

  if (!user) {
    res.status(401).json({ success: false, error: 'Session expired or invalid.' });
    return;
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      lastLoginAt: user.lastLoginAt,
    },
  });
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    AuthService.logout(token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// PUT /api/auth/profile - Update current user profile
authRouter.put('/profile', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const { username, email, name } = req.body;
  const user = req.adminUser!;
  const admins = Database.getAdmins();
  const admin = admins.find((a) => a.id === user.id);

  if (!admin) {
    res.status(404).json({ success: false, error: 'User not found.' });
    return;
  }

  if (username && username.trim() !== admin.username) {
    const existing = admins.find((a) => a.id !== admin.id && a.username.toLowerCase() === username.trim().toLowerCase());
    if (existing) {
      res.status(400).json({ success: false, error: 'Username is already taken by another team member.' });
      return;
    }
    admin.username = username.trim();
  }

  if (email && email.trim() !== admin.email) {
    const existingEmail = admins.find((a) => a.id !== admin.id && a.email.toLowerCase() === email.trim().toLowerCase());
    if (existingEmail) {
      res.status(400).json({ success: false, error: 'Email address is already in use.' });
      return;
    }
    admin.email = email.trim();
  }

  if (name !== undefined) admin.name = name.trim();
  admin.updatedAt = new Date().toISOString();

  Database.saveAdmins(admins);
  Database.appendAuditLog({
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'PROFILE_UPDATED',
    entityType: 'AUTH',
    details: `Updated profile details for ${admin.username}`,
  });

  res.json({
    success: true,
    user: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt,
    },
  });
});

// POST /api/auth/change-password
authRouter.post('/change-password', requireAuth('read_only'), (req: AuthenticatedRequest, res: Response): void => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ success: false, error: 'Current password and new password are required.' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
    return;
  }

  const admins = Database.getAdmins();
  const admin = admins.find((a) => a.id === req.adminUser!.id);

  if (!admin) {
    res.status(404).json({ success: false, error: 'User not found.' });
    return;
  }

  const currentHash = AuthService.hashPassword(currentPassword, admin.salt);
  if (currentHash !== admin.passwordHash) {
    res.status(400).json({ success: false, error: 'Current password is incorrect.' });
    return;
  }

  // Update password with fresh salt
  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = AuthService.hashPassword(newPassword, newSalt);

  admin.passwordHash = newHash;
  admin.salt = newSalt;
  admin.updatedAt = new Date().toISOString();

  Database.saveAdmins(admins);

  Database.appendAuditLog({
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'PASSWORD_CHANGED',
    entityType: 'AUTH',
    details: `Password changed successfully for ${admin.username}`,
  });

  res.json({ success: true, message: 'Password changed successfully!' });
});

// GET /api/auth/team - List team members
authRouter.get('/team', requireAuth('manager'), (req: AuthenticatedRequest, res: Response): void => {
  const admins = Database.getAdmins();
  const safeTeam = admins.map((a) => ({
    id: a.id,
    username: a.username,
    email: a.email,
    name: a.name,
    role: a.role,
    isActive: a.isActive,
    lastLoginAt: a.lastLoginAt,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }));
  res.json({ success: true, team: safeTeam });
});

// POST /api/auth/team - Add new team member with granular permissions
authRouter.post('/team', requireAuth('admin'), (req: AuthenticatedRequest, res: Response): void => {
  const { username, email, name, password, role } = req.body;

  if (!username || !email || !password || !role) {
    res.status(400).json({ success: false, error: 'Username, email, password, and role are required.' });
    return;
  }

  const validRoles: UserRole[] = [
    'super_admin',
    'admin',
    'manager',
    'link_creator',
    'template_designer',
    'operator',
    'read_only',
  ];

  if (!validRoles.includes(role)) {
    res.status(400).json({ success: false, error: `Invalid role. Allowed roles: ${validRoles.join(', ')}` });
    return;
  }

  const admins = Database.getAdmins();
  const existingUsername = admins.find((a) => a.username.toLowerCase() === username.trim().toLowerCase());
  if (existingUsername) {
    res.status(400).json({ success: false, error: 'Username is already in use.' });
    return;
  }

  const existingEmail = admins.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  if (existingEmail) {
    res.status(400).json({ success: false, error: 'Email is already registered.' });
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = AuthService.hashPassword(password, salt);
  const id = 'adm_' + crypto.randomBytes(6).toString('hex');

  const newMember: AdminUser = {
    id,
    username: username.trim(),
    email: email.trim().toLowerCase(),
    name: name?.trim() || username.trim(),
    passwordHash,
    salt,
    role: role as UserRole,
    isActive: true,
    twoFactorEnabled: false,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  admins.push(newMember);
  Database.saveAdmins(admins);

  Database.appendAuditLog({
    adminId: req.adminUser!.id,
    adminUsername: req.adminUser!.username,
    action: 'TEAM_MEMBER_CREATED',
    entityType: 'TEAM',
    entityId: id,
    details: `Added new team member "${newMember.username}" with role "${newMember.role}"`,
  });

  res.status(201).json({
    success: true,
    member: {
      id: newMember.id,
      username: newMember.username,
      email: newMember.email,
      name: newMember.name,
      role: newMember.role,
      isActive: newMember.isActive,
      createdAt: newMember.createdAt,
    },
  });
});

// PUT /api/auth/team/:id - Update team member role/status/password
authRouter.put('/team/:id', requireAuth('admin'), (req: AuthenticatedRequest, res: Response): void => {
  const { name, email, role, isActive, newPassword } = req.body;
  const admins = Database.getAdmins();
  const target = admins.find((a) => a.id === req.params.id);

  if (!target) {
    res.status(404).json({ success: false, error: 'Team member not found.' });
    return;
  }

  if (role) {
    const validRoles: UserRole[] = [
      'super_admin',
      'admin',
      'manager',
      'link_creator',
      'template_designer',
      'operator',
      'read_only',
    ];
    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, error: 'Invalid role provided.' });
      return;
    }
    target.role = role;
  }

  if (name !== undefined) target.name = name.trim();
  if (email !== undefined) target.email = email.trim().toLowerCase();
  if (isActive !== undefined) target.isActive = Boolean(isActive);

  if (newPassword && newPassword.trim().length >= 6) {
    const salt = crypto.randomBytes(16).toString('hex');
    target.passwordHash = AuthService.hashPassword(newPassword.trim(), salt);
    target.salt = salt;
  }

  target.updatedAt = new Date().toISOString();
  Database.saveAdmins(admins);

  Database.appendAuditLog({
    adminId: req.adminUser!.id,
    adminUsername: req.adminUser!.username,
    action: 'TEAM_MEMBER_UPDATED',
    entityType: 'TEAM',
    entityId: target.id,
    details: `Updated team member "${target.username}" (role: ${target.role}, active: ${target.isActive})`,
  });

  res.json({
    success: true,
    member: {
      id: target.id,
      username: target.username,
      email: target.email,
      name: target.name,
      role: target.role,
      isActive: target.isActive,
      updatedAt: target.updatedAt,
    },
  });
});

// DELETE /api/auth/team/:id - Delete team member
authRouter.delete('/team/:id', requireAuth('admin'), (req: AuthenticatedRequest, res: Response): void => {
  if (req.params.id === req.adminUser!.id) {
    res.status(400).json({ success: false, error: 'You cannot delete your own account.' });
    return;
  }

  const admins = Database.getAdmins();
  const index = admins.findIndex((a) => a.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ success: false, error: 'Team member not found.' });
    return;
  }

  const [removed] = admins.splice(index, 1);
  Database.saveAdmins(admins);

  Database.appendAuditLog({
    adminId: req.adminUser!.id,
    adminUsername: req.adminUser!.username,
    action: 'TEAM_MEMBER_DELETED',
    entityType: 'TEAM',
    entityId: removed.id,
    details: `Deleted team member "${removed.username}"`,
  });

  res.json({ success: true, message: `Team member ${removed.username} removed.` });
});
