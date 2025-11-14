import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(100).optional(), // Optional, will be stored in profile.name
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['customer', 'host', 'creator']).default('customer')
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});
