import { z } from 'zod';

export const cartItemSchema = z.object({
  productId: z.string(),
  variantSku: z.string(),
  quantity: z.number().int().min(1).max(10),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(50),
});
