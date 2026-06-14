import { z } from 'zod';

export const couponSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase(),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().positive(),
  minCartValue: z.number().min(0).default(0),
  maxDiscount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().default(1),
  categoryIds: z.array(z.string()).default([]),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});
