import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validations/index';
import { authenticate } from '../middleware/authenticate';
import { authLimiter } from '../middleware/security.js';
import { checkAccountLockout } from '../middleware/accountLockout.js';

const router = Router();

router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, checkAccountLockout, validateBody(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/refresh', authenticate, authController.refreshToken);
router.get('/me', authenticate, authController.getMe);

export default router;


