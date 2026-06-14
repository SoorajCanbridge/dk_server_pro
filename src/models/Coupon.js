import mongoose from 'mongoose';
import { COUPON_TYPE } from '../shared/index.js';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  type: { type: String, enum: Object.values(COUPON_TYPE), required: true },
  value: { type: Number, required: true },
  minCartValue: { type: Number, default: 0 },
  maxDiscount: Number,
  usageLimit: Number,
  usageCount: { type: Number, default: 0 },
  perUserLimit: { type: Number, default: 1 },
  usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  expiresAt: Date,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Coupon = mongoose.model('Coupon', couponSchema);
