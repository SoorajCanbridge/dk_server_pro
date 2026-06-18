import { z } from 'zod';
import {
  PRODUCT_STATUS,
  STOCK_STATUS,
  GENDER,
  AGE_GROUP,
  PRODUCT_COLLECTION,
  FABRIC_TYPE,
  PATTERN,
  FIT_TYPE,
  SLEEVE_TYPE,
  NECK_TYPE,
  CLOSURE_TYPE,
  OCCASION,
  SEASON,
} from '../constants.js';

const enumValues = (obj) => Object.values(obj);

export const variantSchema = z.object({
  sku: z.string().min(1),
  color: z.string().min(1),
  colorHex: z.string().optional(),
  size: z.string().min(1),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  stock: z.number().int().min(0),
  images: z.array(z.string().url()).default([]),
});

export const sizeChartRowSchema = z.object({
  size: z.string().min(1),
  chest: z.number().positive().optional(),
  waist: z.number().positive().optional(),
  hip: z.number().positive().optional(),
  shoulder: z.number().positive().optional(),
  length: z.number().positive().optional(),
});

export const productVariantInputSchema = variantSchema.omit({ images: true }).extend({
  existingImages: z.array(z.string().url()).default([]),
});

export const productBaseSchema = z.object({
  productName: z.string().min(2).max(200).optional(),
  title: z.string().min(2).max(200).optional(),
  slug: z.string().min(2).max(200).optional(),
  sku: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  description: z.string().min(10),

  brand: z.string().max(100).optional(),
  manufacturer: z.string().max(100).optional(),
  collection: z.enum(enumValues(PRODUCT_COLLECTION)).optional(),

  categoryId: z.string(),
  gender: z.enum(enumValues(GENDER)).optional(),
  ageGroup: z.enum(enumValues(AGE_GROUP)).optional(),

  mrp: z.number().positive().optional(),
  sellingPrice: z.number().positive().optional(),
  costPrice: z.number().positive().optional(),
  taxPercentage: z.number().min(0).max(100).optional(),

  lowStockThreshold: z.number().int().min(0).optional(),
  stockStatus: z.enum(enumValues(STOCK_STATUS)).optional(),

  material: z.string().optional(),
  fabricType: z.enum(enumValues(FABRIC_TYPE)).optional(),
  pattern: z.enum(enumValues(PATTERN)).optional(),
  fit: z.enum(enumValues(FIT_TYPE)).optional(),
  sleeveType: z.enum(enumValues(SLEEVE_TYPE)).optional(),
  neckType: z.enum(enumValues(NECK_TYPE)).optional(),
  closureType: z.enum(enumValues(CLOSURE_TYPE)).optional(),
  occasion: z.enum(enumValues(OCCASION)).optional(),
  season: z.enum(enumValues(SEASON)).optional(),

  fabric: z.string().optional(),
  careInstructions: z.string().optional(),
  sizeChartId: z.string().optional(),
  sizeChart: z.array(sizeChartRowSchema).default([]),

  weight: z.number().positive().optional(),
  packageLength: z.number().positive().optional(),
  packageWidth: z.number().positive().optional(),
  packageHeight: z.number().positive().optional(),

  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  keywords: z.array(z.string()).default([]),

  tags: z.array(z.string()).default([]),
  status: z.enum(enumValues(PRODUCT_STATUS)).default(PRODUCT_STATUS.DRAFT),
  variants: z.array(variantSchema).min(1),

  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
});

function withProductNameNormalization(schema) {
  return schema.superRefine((data, ctx) => {
    if (!data.productName && !data.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Product name is required',
        path: ['productName'],
      });
    }
  }).transform((data) => {
    const name = data.productName || data.title;
    return {
      ...data,
      productName: name,
      title: name,
    };
  });
}

export const productSchema = withProductNameNormalization(productBaseSchema);

export const productInputSchema = withProductNameNormalization(
  productBaseSchema.extend({
    variants: z.array(productVariantInputSchema).min(1),
  })
);

export const categorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).optional(),
  parentId: z.string().nullable().optional(),
  gender: z.enum(['MEN', 'WOMEN', 'KIDS', 'UNISEX']).optional().nullable(),
  image: z.string().url().optional(),
  sortOrder: z.number().int().default(0),
});

export const paginatedListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const curationUpdateSchema = z.object({
  productIds: z.array(z.string()).default([]),
});

export const productStatusUpdateSchema = z.object({
  status: z.enum(enumValues(PRODUCT_STATUS)),
});

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  gender: z.string().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular']).default('newest'),
});
