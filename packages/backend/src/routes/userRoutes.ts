import { Router } from 'express';

import { getWishlist, toggleWishlistItem } from '../controllers/userController.js';
import { getSizes, saveSizes } from '../controllers/userController.js';
import { createReturn, getReturns } from '../controllers/userController.js';
import { getUserOrders } from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Wishlist routes
router.get('/wishlist', requireAuth, getWishlist);
router.post('/wishlist/toggle', requireAuth, toggleWishlistItem);

// Sizes routes
router.get('/sizes', requireAuth, getSizes);
router.post('/sizes', requireAuth, saveSizes);

// Returns routes
router.get('/returns', requireAuth, getReturns);
router.post('/returns', requireAuth, createReturn);

// Orders routes
router.get('/orders', requireAuth, getUserOrders);

export default router;

