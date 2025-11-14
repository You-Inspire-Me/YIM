import { Router } from 'express';

import {
  createMerchantOffer,
  getAvailableOffers,
  getMerchantOffers,
  updateMerchantOffer
} from '../controllers/merchantOfferController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Public route - get available offers for checkout
router.get('/available', getAvailableOffers);

// Merchant-only routes
router.use(requireAuth, requireRole('creator'));

// Offers
router.get('/', getMerchantOffers);
router.post('/', createMerchantOffer);
router.put('/:id', updateMerchantOffer);

export default router;

