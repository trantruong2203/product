import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';
import { updateRecommendationStatusSchema } from '../validations/index.js';
import * as recommendationController from '../controllers/recommendation.controller';

const router = Router();

router.get(
  '/projects/:projectId',
  authenticate,
  recommendationController.getProjectRecommendations
);

router.get(
  '/projects/:projectId/content-gap',
  authenticate,
  recommendationController.getProjectContentGap
);

router.patch(
  '/:recommendationId/status',
  authenticate,
  validateBody(updateRecommendationStatusSchema),
  recommendationController.updateRecommendationStatus
);

export default router;
