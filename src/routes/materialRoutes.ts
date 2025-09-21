import { Router } from 'express';
import { materialController } from '../controllers/materialController';
import { authenticateToken } from '../middlewares/auth';
import { upload, validateUploadedFile } from '../middlewares/upload';

const router = Router();

// Rotas públicas (não requerem autenticação)
router.get('/', materialController.getMaterials);
router.get('/stats', materialController.getStats);
router.get('/:id', materialController.getMaterial);
router.get('/:id/download', materialController.downloadMaterial);
router.get('/:id/similar', materialController.getSimilarMaterials);

// Rotas protegidas (requerem autenticação)
router.use(authenticateToken);

// Upload de material (com arquivo)
router.post(
  '/',
  upload.single('file'),
  validateUploadedFile,
  materialController.createMaterial
);

// Gerenciamento de materiais
router.put('/:id', materialController.updateMaterial);
router.delete('/:id', materialController.deleteMaterial);

// Avaliações
router.post('/:id/rate', materialController.rateMaterial);

// Materiais do usuário logado
router.get('/user/my-materials', materialController.getMyMaterials);

export { router as materialRoutes };