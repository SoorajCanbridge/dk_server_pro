import mongoose from 'mongoose';

const inventoryLogSchema = new mongoose.Schema({
  variantSku: { type: String, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  delta: { type: Number, required: true },
  reason: String,
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
}, { timestamps: true });

export const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);
