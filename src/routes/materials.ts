import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import {
  createMaterial,
  getMaterials,
  getMaterialById,
  rateMaterial,
  updateMaterial,
  deleteMaterial
} from '../controllers/materialsController';

const router = Router();

router.post('/', authenticateToken, upload.single('file'), createMaterial);
router.get('/', getMaterials);
router.get('/:id', getMaterialById);
router.put('/:id', authenticateToken, updateMaterial);
router.delete('/:id', authenticateToken, deleteMaterial);
router.post('/:id/rate', authenticateToken, rateMaterial);

export default router;