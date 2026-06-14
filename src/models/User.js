import mongoose from 'mongoose';
import { ROLES } from '../shared/index.js';

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  fullName: String,
  phone: String,
  line1: String,
  line2: String,
  city: String,
  state: String,
  pincode: String,
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: String,
  googleId: { type: String, unique: true, sparse: true },
  avatar: String,
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  phone: String,
  role: { type: String, enum: Object.values(ROLES), default: ROLES.CUSTOMER },
  isVerified: { type: Boolean, default: false },
  addresses: [addressSchema],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
