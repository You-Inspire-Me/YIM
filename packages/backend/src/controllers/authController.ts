import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt, { SignOptions } from 'jsonwebtoken';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AuthRequest, clearAuthCookie, setAuthCookie } from '../middleware/authMiddleware.js';
import { UserModel } from '../models/User.js';
import { loginSchema, registerSchema } from '../validators/authSchema.js';

const createToken = (userId: string, role: string): string => {
  const secret = process.env.JWT_SECRET || 'dev-secret-123';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ userId, role }, secret, { expiresIn } as SignOptions);
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Registration attempt:', { email: req.body.email, role: req.body.role });
    const data = registerSchema.parse(req.body);
    console.log('Validation passed:', { email: data.email, role: data.role });

    const existingUser = await UserModel.findOne({ email: data.email });

    if (existingUser) {
      console.log('Email already exists:', data.email);
      res.status(StatusCodes.CONFLICT).json({ message: 'Email already in use' });
      return;
    }

    console.log('Creating user...');
    // Transform data to match User schema (name -> profile.name)
    const userData = {
      email: data.email,
      password: data.password,
      role: data.role === 'host' ? 'creator' : data.role, // Map 'host' to 'creator'
      profile: {
        name: data.name || data.email.split('@')[0] // Use name or email prefix
      }
    };
    const user = await UserModel.create(userData);
    console.log('User created:', user._id);
    
    const token = createToken(user.id, user.role);
    setAuthCookie(res, token);

    // Return user without password, with name from profile
    const userResponse = user.toJSON();
    const userWithName = {
      ...userResponse,
      name: (userResponse as any).profile?.name || userResponse.email.split('@')[0]
    };
    res.status(StatusCodes.CREATED).json({ user: userWithName });
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
      return;
    }
    throw error;
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Login attempt:', { email: req.body.email });
    const data = loginSchema.parse(req.body);
    console.log('Login validation passed');

    const user = await UserModel.findOne({ email: data.email });

    if (!user) {
      console.log('User not found:', data.email);
      res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid credentials' });
      return;
    }

    console.log('User found, comparing password...');
    const isValid = await user.comparePassword(data.password);

    if (!isValid) {
      console.log('Invalid password for user:', data.email);
      res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid credentials' });
      return;
    }

    console.log('Password valid, creating token...');
    const token = createToken(user.id, user.role);
    setAuthCookie(res, token);

    // Return user without password, with name from profile
    const userResponse = user.toJSON();
    const userWithName = {
      ...userResponse,
      name: (userResponse as any).profile?.name || userResponse.email.split('@')[0]
    };
    console.log('Login successful for user:', user.email);
    res.status(StatusCodes.OK).json({ user: userWithName });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    // If it's a Zod validation error, return a proper error response
    if (error instanceof ZodError) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid input', errors: error.errors });
      return;
    }
    // For other errors, return a generic error
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Login failed' });
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  clearAuthCookie(res);
  res.status(StatusCodes.OK).json({ message: 'Logged out' });
};

export const currentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  // Return user without password, with name from profile
  const userResponse = req.user.toJSON();
  const userWithName = {
    ...userResponse,
    name: (userResponse as any).profile?.name || userResponse.email.split('@')[0]
  };
  res.status(StatusCodes.OK).json({ user: userWithName });
};
