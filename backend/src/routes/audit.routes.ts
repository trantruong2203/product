import { Router } from 'express';
import { authenticate, type AuthRequest } from '../middleware/authenticate.js';
import { getRecentSecurityEvents, getSecuritySummary, getUserSecurityEvents } from '../utils/securityAudit.js';
import { Response } from 'express';

const router = Router();

/**
 * Get security summary (admin only)
 */
router.get('/summary', authenticate, (req: AuthRequest, res: Response) => {
  // In production, check if user is admin
  const summary = getSecuritySummary();
  res.json({
    success: true,
    data: summary,
  });
});

/**
 * Get recent security events (admin only)
 */
router.get('/events', authenticate, (req: AuthRequest, res: Response) => {
  // In production, check if user is admin
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
  const events = getRecentSecurityEvents(limit);
  res.json({
    success: true,
    data: events,
  });
});

/**
 * Get user's own security events
 */
router.get('/my-events', authenticate, (req: AuthRequest, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
  const events = getUserSecurityEvents(req.user!.id, limit);
  res.json({
    success: true,
    data: events,
  });
});

export default router;

