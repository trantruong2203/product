import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';
import { updateAlertStatusSchema } from '../validations/index.js';
import * as alertController from '../controllers/alert.controller';

const router = Router();

router.get('/projects/:projectId', authenticate, alertController.getProjectAlerts);

router.patch(
  '/:alertId/status',
  authenticate,
  validateBody(updateAlertStatusSchema),
  alertController.updateAlertStatus
);

export default router;
