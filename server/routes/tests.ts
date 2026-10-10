import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.js';
import { TestSuiteRunner } from '../services/TestSuiteRunner.js';

export const testRouter = Router();

// POST /api/tests/run
testRouter.post('/run', requireAuth('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await TestSuiteRunner.runAllTests();
  res.json({ success: true, ...result });
});
