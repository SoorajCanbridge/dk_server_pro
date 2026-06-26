import mongoose from 'mongoose';
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } from '../shared/index.js';

const addressSchema = new mongoose.Schema({
  fullName: String,
  phone: String,
  line1: String,
  line2: String,
  city: String,
  state: String,
  pincode: String,
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  title: String,
  variantSku: String,
  color: String,
  size: String,
  price: Number,
  quantity: Number,
  image: String,
}, { _id: false });

const timelineSchema = new mongoose.Schema({
  status: String,
  note: String,
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guestEmail: String,
  guestAccessToken: { type: String, select: false },
  items: [orderItemSchema],
  shippingAddress: addressSchema,
  billingAddress: addressSchema,
  gstin: String,
  subtotal: Number,
  discount: { type: Number, default: 0 },
  couponCode: String,
  shippingCost: Number,
  gst: {
    cgst: Number,
    sgst: Number,
    igst: Number,
    total: Number,
    rate: Number,
  },
  total: Number,
  payment: {
    method: { type: String, enum: Object.values(PAYMENT_METHOD) },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    paidAt: Date,
  },
  status: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.PLACED },
  inventoryDeducted: { type: Boolean, default: false },
  courier: String,
  trackingNumber: String,
  trackingUrl: String,
  notes: String,
  invoiceUrl: String,
  invoiceKey: String,
  timeline: [timelineSchema],
  returnRequest: {
    reason: String,
    items: [{ variantSku: String, quantity: Number }],
    requestedAt: Date,
    status: String,
  },
}, { timestamps: true });

orderSchema.index({ orderNumber: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

export const Order = mongoose.model('Order', orderSchema);
