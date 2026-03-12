import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();

router.get(
  '/projects/:projectId/table',
  authenticate,
  dashboardController.getProjectDashboardTable
);

export default router;
