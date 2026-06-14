import mongoose from 'mongoose';

const shippingZoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  pincodes: [String],
  rate: { type: Number, required: true },
  freeAbove: Number,
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

export const ShippingZone = mongoose.model('ShippingZone', shippingZoneSchema);
