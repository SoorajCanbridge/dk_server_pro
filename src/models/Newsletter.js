import mongoose from 'mongoose';

const newsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  subscribedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const Newsletter = mongoose.model('Newsletter', newsletterSchema);
