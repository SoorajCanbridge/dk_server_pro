import { z } from 'zod';
import { addressSchema } from './auth.js';

export const checkoutAddressSchema = addressSchema.extend({
  email: z.string().email().optional(),
});

export const checkoutSchema = z.object({
  shippingAddress: checkoutAddressSchema,
  billingAddress: addressSchema.optional(),
  gstin: z.string().optional(),
  paymentMethod: z.enum(['RAZORPAY', 'COD']),
  couponCode: z.string().nullish(),
  notes: z.string().max(500).optional(),
});

export const shippingRatesSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/),
  subtotal: z.number().min(0),
});

export const checkoutPreviewSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  shippingState: z.string().min(2),
  billingState: z.string().optional(),
});

export const validatePincodeSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/),
});

export const updateShippingSchema = z.object({
  status: z.enum(['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  courier: z.string().max(100).optional(),
  trackingNumber: z.string().max(100).optional(),
  trackingUrl: z.string().url().optional().or(z.literal('')),
});

export const returnRequestSchema = z.object({
  reason: z.string().min(10).max(500),
  items: z.array(z.object({
    variantSku: z.string(),
    quantity: z.number().int().min(1),
  })).min(1),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  guestAccessToken: z.string().optional(),
});
