import { Router } from 'express';
import * as competitorController from '../controllers/competitor.controller';
import { validateBody } from '../middleware/validate';
import { createCompetitorSchema } from '../validations/index';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/:projectId/competitors', authenticate, validateBody(createCompetitorSchema), competitorController.createCompetitor);
router.get('/:projectId/competitors', authenticate, competitorController.getCompetitors);
router.delete('/:projectId/competitors/:competitorId', authenticate, competitorController.deleteCompetitor);

export default router;
