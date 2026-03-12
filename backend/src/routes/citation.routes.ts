import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import * as citationController from '../controllers/citation.controller';

const router = Router();

router.get('/projects/:projectId', authenticate, citationController.getProjectCitations);

router.get(
  '/projects/:projectId/summary',
  authenticate,
  citationController.getProjectCitationSummary
);

export default router;
