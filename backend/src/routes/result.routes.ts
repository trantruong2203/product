import { Router } from 'express';
import * as resultController from '../controllers/result.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/:projectId', authenticate, resultController.getProjectResults);
router.get('/:projectId/history', authenticate, resultController.getProjectHistory);
router.get('/:projectId/competitors', authenticate, resultController.getCompetitorComparison);
router.get('/:projectId/rankings', authenticate, resultController.getPromptRankings);
router.get('/:projectId/screenshots', authenticate, resultController.getScreenshots);

export default router;
