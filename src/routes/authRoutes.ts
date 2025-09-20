import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  verifyToken
} from '../controllers/authController';
import { authenticate, optionalAuthenticate } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validate';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
} from '../validators/authValidator';

const router = Router();

// ===== ROTAS PÚBLICAS =====

/**
 * POST /api/auth/register
 * Registro de novo professor
 * Body: { name, email, password, school? }
 */
router.post(
  '/register',
  validateBody(registerSchema),
  register
);

/**
 * POST /api/auth/login
 * Login de professor
 * Body: { email, password }
 */
router.post(
  '/login',
  validateBody(loginSchema),
  login
);

// ===== ROTAS PROTEGIDAS =====

/**
 * GET /api/auth/profile
 * Obter perfil do usuário autenticado
 * Headers: Authorization: Bearer <token>
 */
router.get(
  '/profile',
  authenticate,
  getProfile
);

/**
 * PUT /api/auth/profile
 * Atualizar perfil do usuário
 * Headers: Authorization: Bearer <token>
 * Body: { name?, school? }
 */
router.put(
  '/profile',
  authenticate,
  validateBody(updateProfileSchema),
  updateProfile
);

/**
 * POST /api/auth/change-password
 * Alterar senha do usuário
 * Headers: Authorization: Bearer <token>
 * Body: { currentPassword, newPassword }
 */
router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  changePassword
);

/**
 * POST /api/auth/logout
 * Logout do usuário (invalidar token)
 * Headers: Authorization: Bearer <token>
 */
router.post(
  '/logout',
  authenticate,
  logout
);

/**
 * GET /api/auth/verify
 * Verificar se o token é válido
 * Headers: Authorization: Bearer <token>
 */
router.get(
  '/verify',
  authenticate,
  verifyToken
);

// ===== ROTAS DE DESENVOLVIMENTO =====

if (process.env.NODE_ENV === 'development') {
  /**
   * GET /api/auth/me
   * Obter dados do usuário autenticado (opcional)
   * Headers: Authorization: Bearer <token> (opcional)
   */
  router.get(
    '/me',
    optionalAuthenticate,
    (req: any, res) => {
      if (req.user) {
        res.json({
          success: true,
          message: 'Usuário autenticado',
          data: req.user
        });
      } else {
        res.json({
          success: true,
          message: 'Usuário não autenticado',
          data: null
        });
      }
    }
  );
}

export default router;