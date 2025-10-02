import { Router } from 'express';
import { materialController } from '../controllers/materialController';
import { authenticateToken } from '../middlewares/auth';
import { upload, validateUploadedFile } from '../middlewares/upload';

const router = Router();

// Rotas públicas (não requerem autenticação)
router.get('/', materialController.getMaterials);
router.get('/stats', materialController.getStats);

// Rotas protegidas (requerem autenticação)
router.use(authenticateToken);

// IMPORTANTE: Rotas específicas ANTES de rotas com parâmetros dinâmicos /:id
// Materiais do usuário logado
router.get('/user/my-materials', materialController.getMyMaterials);

// Upload de material (com arquivo)
router.post(
  '/',
  upload.single('file'),
  validateUploadedFile,
  materialController.createMaterial
);

// Rotas com :id (devem vir DEPOIS das rotas específicas)
router.get('/:id', materialController.getMaterial);
router.get('/:id/similar', materialController.getSimilarMaterials);
router.get('/:id/download', materialController.downloadMaterial);
router.put('/:id', materialController.updateMaterial);
router.delete('/:id', materialController.deleteMaterial);
router.post('/:id/rate', materialController.rateMaterial);

// Geração de atividades com IA (PROTEGIDO - requer login)
router.post('/:id/generate-activities', materialController.generateActivities);

export { router as materialRoutes };