import { Router } from 'express';

import {
  createLook,
  deleteLook,
  getHostLooks,
  getLook,
  likeLook,
  togglePublished,
  updateLook
} from '../controllers/lookController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth, requireRole('host'));

router.get('/', getHostLooks);
router.get('/:id', getLook);
router.post('/', createLook);
router.put('/:id', updateLook);
router.delete('/:id', deleteLook);
router.patch('/:id/toggle-published', togglePublished);
router.post('/:id/like', likeLook);

export default router;

