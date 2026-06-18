import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, maxlength: 300 },
  image: { type: String, required: true },
  link: String,
  position: { type: String, enum: ['hero', 'promo', 'sidebar'], default: 'hero' },
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  showTitle: { type: Boolean, default: true },
  showButton: { type: Boolean, default: true },
  buttonText: { type: String, default: 'Shop Now' },
  overlay: { type: String, enum: ['dark', 'light', 'none'], default: 'dark' },
  textAlign: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
  verticalAlign: { type: String, enum: ['top', 'center', 'bottom'], default: 'bottom' },
  scheduleStart: Date,
  scheduleEnd: Date,
}, { timestamps: true });

export const Banner = mongoose.model('Banner', bannerSchema);
