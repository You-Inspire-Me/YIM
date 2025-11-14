import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { UserDocument, UserRole, UserModel } from '../models/User.js';

export interface AuthRequest extends Request {
  user?: UserDocument;
}

interface JwtPayload {
  userId: string;
  role: UserRole;
}

const COOKIE_NAME = 'zalando_token';

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    domain: env.COOKIE_DOMAIN || undefined
  });
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: env.COOKIE_DOMAIN || undefined
  });
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireRole = (role: UserRole | 'host') => (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  // Allow 'host' role for backwards compatibility (maps to 'creator')
  const userRole: UserRole = (req.user.role as string) === 'host' ? 'creator' : req.user.role;
  const requiredRole: UserRole = role === 'host' ? 'creator' : role;

  if (userRole !== requiredRole) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  next();
};
