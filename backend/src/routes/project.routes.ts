import { Router } from 'express';
import * as projectController from '../controllers/project.controller';
import { validateBody } from '../middleware/validate';
import { createProjectSchema, updateProjectSchema } from '../validations/index';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/', authenticate, validateBody(createProjectSchema), projectController.createProject);
router.get('/', authenticate, projectController.getProjects);
router.get('/:id', authenticate, projectController.getProject);
router.put('/:id', authenticate, validateBody(updateProjectSchema), projectController.updateProject);
router.delete('/:id', authenticate, projectController.deleteProject);

export default router;
