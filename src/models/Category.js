import mongoose from 'mongoose';
import { GENDER } from '../shared/index.js';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  gender: { type: String, enum: Object.values(GENDER), default: null },
  image: String,
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

categorySchema.index({ parentId: 1 });

export const Category = mongoose.model('Category', categorySchema);
