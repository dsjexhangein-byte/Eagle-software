import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.js';
import { AdminUser, UserRole } from '../types.js';

export interface AuthenticatedRequest extends Request {
  adminUser?: AdminUser;
}

export function requireAuth(requiredRoles: UserRole | UserRole[] = 'read_only') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ success: false, error: 'Authorization header missing.' });
      return;
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const user = AuthService.validateSession(token);

    if (!user) {
      res.status(401).json({ success: false, error: 'Session expired or invalid.' });
      return;
    }

    const rolesList = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    const isAuthorized = rolesList.some((reqRole) => AuthService.hasPermission(user.role, reqRole));

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        error: `Insufficient permissions. Current role: ${user.role}`,
      });
      return;
    }

    req.adminUser = user;
    next();
  };
}
