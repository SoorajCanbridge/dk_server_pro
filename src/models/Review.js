import mongoose from 'mongoose';
import { REVIEW_STATUS } from '../shared/index.js';

const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  images: [String],
  verifiedPurchase: { type: Boolean, default: false },
  adminNote: String,
  status: { type: String, enum: Object.values(REVIEW_STATUS), default: REVIEW_STATUS.PENDING },
}, { timestamps: true });

reviewSchema.index({ productId: 1, status: 1 });
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const Review = mongoose.model('Review', reviewSchema);
