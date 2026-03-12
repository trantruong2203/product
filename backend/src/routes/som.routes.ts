import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import * as somController from '../controllers/som.controller';

const router = Router();

router.get('/projects/:projectId', authenticate, somController.getProjectSoM);

export default router;
