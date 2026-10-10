import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';
import { Database } from '../db/database.js';

export const auditLogRouter = Router();

// GET /api/audit-logs
auditLogRouter.get('/', requireAuth('admin'), (req: AuthenticatedRequest, res: Response): void => {
  const { action, entityType, search } = req.query;
  let logs = Database.getAuditLogs();

  if (action && typeof action === 'string') {
    logs = logs.filter((l) => l.action === action);
  }
  if (entityType && typeof entityType === 'string') {
    logs = logs.filter((l) => l.entityType === entityType);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    logs = logs.filter(
      (l) =>
        l.details.toLowerCase().includes(q) ||
        l.adminUsername.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, logs });
});
