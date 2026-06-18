import { z } from 'zod';

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),
  images: z.array(z.string().url()).max(5).default([]),
});

export const bannerSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(300).optional(),
  image: z.string().url(),
  link: z.string().optional(),
  position: z.enum(['hero', 'promo', 'sidebar']).default('hero'),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  showTitle: z.boolean().default(true),
  showButton: z.boolean().default(true),
  buttonText: z.string().max(50).default('Shop Now'),
  overlay: z.enum(['dark', 'light', 'none']).default('dark'),
  textAlign: z.enum(['left', 'center', 'right']).default('left'),
  verticalAlign: z.enum(['top', 'center', 'bottom']).default('bottom'),
  scheduleStart: z.coerce.date().optional(),
  scheduleEnd: z.coerce.date().optional(),
});
