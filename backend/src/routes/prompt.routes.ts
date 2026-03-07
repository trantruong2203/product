import { Router } from 'express';
import * as promptController from '../controllers/prompt.controller';
import { validateBody } from '../middleware/validate';
import { createPromptSchema } from '../validations/index';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/', authenticate, validateBody(createPromptSchema), promptController.createPrompt);
router.get('/:projectId', authenticate, promptController.getPrompts);
router.delete('/:projectId/:promptId', authenticate, promptController.deletePrompt);

export default router;
