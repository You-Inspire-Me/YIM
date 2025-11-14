// packages/backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const authMiddleware = (allowedRoles?: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.jwt || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Geen toegang' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      
      const user = await UserModel.findById(decoded.id).select('role');
      if (!user) return res.status(401).json({ error: 'Gebruiker niet gevonden' });

      if (allowedRoles && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Geen toegang' });
      }

      // Fix type error
      req.user = { 
        id: user._id.toString(), 
        role: user.role 
      };

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Ongeldig token' });
    }
  };
};