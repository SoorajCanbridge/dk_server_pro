import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantSku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
}, { _id: false });

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },
  sessionId: { type: String, sparse: true },
  items: [cartItemSchema],
  couponCode: String,
}, { timestamps: true });

cartSchema.index({ userId: 1 });
cartSchema.index({ sessionId: 1 });

export const Cart = mongoose.model('Cart', cartSchema);
