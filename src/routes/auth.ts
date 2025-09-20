import { Router } from 'express';
import { register, login, getProfile, updateProfile } from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';
import { validateBody } from '../middlewares/validate';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators/userValidator';

const router = Router();

// Rotas públicas
router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);

// Rotas protegidas
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, validateBody(updateProfileSchema), updateProfile);

export default router;