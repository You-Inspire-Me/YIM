import 'express-async-errors';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';

import authRoutes from './routes/authRoutes.js';
import creatorListingRoutes from './routes/creatorListingRoutes.js';
import creatorProductRoutes from './routes/creatorProductRoutes.js';
import icecatRoutes from './routes/icecatRoutes.js';
import hostProductRoutes from './routes/hostProductRoutes.js';
import hostRoutes from './routes/hostRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import lookRoutes from './routes/lookRoutes.js';
import merchantOfferRoutes from './routes/merchantOfferRoutes.js';
import merchantInventoryRoutes from './routes/merchantInventoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import posRoutes from './routes/posRoutes.js';
import productMasterRoutes from './routes/productMasterRoutes.js';
import productRoutes from './routes/productRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { redis } from './config/redis.js';
import { requireAuth } from './middleware/authMiddleware.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
// New multi-vendor routes (Zalando-grade)
app.use('/api/pim/products', productMasterRoutes);
app.use('/api/merchant/offers', merchantOfferRoutes);
app.use('/api/merchant/inventory', merchantInventoryRoutes);
// Legacy routes (for backwards compatibility)
app.use('/api/creator/products', creatorProductRoutes);
app.use('/api/creator/listings', creatorListingRoutes);
app.use('/api/creator/pos', posRoutes);
app.use('/api/creator/icecat', icecatRoutes);
app.use('/api/icecat', icecatRoutes); // Public route for host/creator
// Legacy routes (for backwards compatibility during migration)
app.use('/api/host/products', hostProductRoutes);
app.use('/api/host/looks', lookRoutes);
app.use('/api/host/inventory', inventoryRoutes);
app.use('/api/host/upload', uploadRoutes);
app.use('/api/host', hostRoutes);
app.use('/api/host/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/payments', requireAuth, paymentRoutes);
app.use('/api/user', userRoutes);

app.use(errorHandler);

const start = async (): Promise<void> => {
  await connectDatabase();
  await redis.connect().catch((error) => {
    console.warn('Redis connection failed', error);
  });

  app.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });
};

void start();
