import { Router } from 'express';
import * as engineController from '../controllers/engine.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, engineController.getEngines);
router.put('/:id/toggle', authenticate, engineController.toggleEngine);

export default router;
