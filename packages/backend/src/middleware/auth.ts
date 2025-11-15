// packages/backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel, UserDocument } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
      body: any;
      params: any;
      query: any;
    }
  }
}

export interface AuthRequest extends Request {
  user?: UserDocument;
  body: any;
  params: any;
  query: any;
}

export const authMiddleware = (allowedRoles?: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.zalando_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Geen toegang' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      
      const user = await UserModel.findById(decoded.id);
      if (!user) return res.status(401).json({ error: 'Gebruiker niet gevonden' });

      if (allowedRoles && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Geen toegang' });
      }

      // Sla het volledige user document op in de request
      (req as AuthRequest).user = user;

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Ongeldig token' });
    }
  };
};