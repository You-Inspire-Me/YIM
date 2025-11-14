import { z } from 'zod';

export const productBaseSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  price: z.number().min(0),
  category: z.string().min(2),
  inventory: z.number().int().min(0).default(0),
  sizes: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(true)
});

export const createProductSchema = productBaseSchema;

export const updateProductSchema = productBaseSchema.partial().extend({
  images: z.array(z.string()).optional(),
});

export const queryProductSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12)
});
