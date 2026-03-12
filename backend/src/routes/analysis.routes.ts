import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import * as analysisController from '../controllers/analysis.controller';

const router = Router();

router.get(
  '/projects/:projectId/sentiment',
  authenticate,
  analysisController.getProjectSentiment
);

router.get(
  '/projects/:projectId/narratives',
  authenticate,
  analysisController.getProjectNarratives
);

export default router;
