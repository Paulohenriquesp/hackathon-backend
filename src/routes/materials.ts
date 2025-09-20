import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import {
  createMaterial,
  getMaterials,
  getMaterialById,
  likeMaterial
} from '../controllers/materialsController';

const router = Router();

router.post('/', authenticateToken, upload.single('file'), createMaterial);
router.get('/', getMaterials);
router.get('/:id', getMaterialById);
router.post('/:id/like', authenticateToken, likeMaterial);

export default router;