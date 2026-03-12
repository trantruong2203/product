import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';
import { createScheduleSchema, updateScheduleSchema } from '../validations/index.js';
import * as scheduleController from '../controllers/schedule.controller';

const router = Router();

router.get('/projects/:projectId', authenticate, scheduleController.getProjectSchedules);

router.post(
  '/projects/:projectId',
  authenticate,
  validateBody(createScheduleSchema),
  scheduleController.createProjectSchedule
);

router.patch(
  '/:scheduleId',
  authenticate,
  validateBody(updateScheduleSchema),
  scheduleController.updateSchedule
);

export default router;
