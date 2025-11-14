import { Router } from 'express';

import { createCheckoutSession, getCheckoutListings } from '../controllers/checkoutController.js';
import { createCheckoutSession as legacyCreateCheckoutSession } from '../controllers/paymentController.js';

const router = Router();

// New multi-vendor checkout
router.get('/listings', getCheckoutListings);
router.post('/checkout', createCheckoutSession);

// Legacy checkout (for backwards compatibility)
router.post('/checkout/legacy', legacyCreateCheckoutSession);

export default router;
