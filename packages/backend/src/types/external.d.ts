declare module 'xss-clean';
declare module 'rate-limit-redis';
declare module 'streamifier';

// packages/backend/src/types/express.d.ts
import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}