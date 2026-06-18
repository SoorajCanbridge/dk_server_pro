import crypto from 'crypto';
import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Cart } from '../models/Cart.js';
import { getGuestCart, getUserCart, resolveCartItems, clearGuestCart } from '../services/cart.service.js';
import { assertOrderAccess } from '../utils/order-access.js';
import { enrichOrderReturnMeta, canRequestReturn } from '../utils/order-return.js';
import { validateCoupon, applyCouponUsage } from '../services/coupon.service.js';
import { getShippingRate } from '../services/shipping.service.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../services/payment.service.js';
import { calculateGST } from '../utils/gst.js';
import { generateOrderNumber } from '../utils/slug.js';
import { config } from '../config/index.js';
import { queueOrderConfirmation, queueShipmentEmail, queueInvoiceGeneration, queueReviewRequest } from '../services/queue.service.js';
import { sendShipmentEmail, sendReviewRequestEmail } from '../services/email.service.js';
import { AppError } from '../utils/errors.js';
import { deductOrderStock, restoreOrderStock, shouldRestoreOrderStock } from '../services/inventory.service.js';
import {
  ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD,
} from '../shared/index.js';

function getSessionId(req) {
  return req.headers['x-session-id'];
}

async function getRawCart(req) {
  if (req.user) {
    const cart = await getUserCart(req.user._id);
    return { items: cart.items, couponCode: cart.couponCode };
  }
  const sessionId = getSessionId(req);
  if (!sessionId) throw new AppError('Cart is empty', 400, 'EMPTY_CART');
  return getGuestCart(sessionId);
}

function orderIdFilter(id) {
  return mongoose.isValidObjectId(id)
    ? { $or: [{ _id: id }, { orderNumber: id }] }
    : { orderNumber: id };
}

function buildOrderResponse(order, { paymentRequired, razorpayOrderId, amount, guestAccessToken }) {
  const payload = {
    order,
    paymentRequired,
    ...(razorpayOrderId && { razorpayOrderId, amount, currency: 'INR' }),
    ...(guestAccessToken && { guestAccessToken }),
  };
  return payload;
}

async function clearCartAfterCheckout(req) {
  if (req.user) {
    await Cart.findOneAndUpdate({ userId: req.user._id }, { items: [], couponCode: null });
    return;
  }
  const sessionId = getSessionId(req);
  if (sessionId) await clearGuestCart(sessionId);
}

export async function createOrder(req, res) {
  const { shippingAddress, billingAddress, gstin, paymentMethod, couponCode, notes } = req.validated;

  if (paymentMethod === PAYMENT_METHOD.COD && !config.codEnabled) {
    throw new AppError('COD is not available', 400, 'COD_DISABLED');
  }

  const rawCart = await getRawCart(req);
  if (!rawCart.items.length) throw new AppError('Cart is empty', 400, 'EMPTY_CART');

  const { items, subtotal, categoryIds } = await resolveCartItems(rawCart.items);
  const code = couponCode || rawCart.couponCode;
  let discount = 0;
  let couponDoc = null;

  if (code) {
    const result = await validateCoupon(code, req.user?._id, subtotal, categoryIds);
    discount = result.discount;
    couponDoc = result.coupon;
  }

  const discountedSubtotal = subtotal - discount;
  const { rate: shippingCost } = await getShippingRate(shippingAddress.pincode, discountedSubtotal);
  const billing = billingAddress || shippingAddress;
  const gst = calculateGST(discountedSubtotal, shippingAddress.state, billing.state, config.gstRate);
  const total = discountedSubtotal + shippingCost + gst.total;

  const orderNumber = generateOrderNumber();
  const guestAccessToken = req.user ? undefined : crypto.randomBytes(32).toString('hex');

  const order = await Order.create({
    orderNumber,
    userId: req.user?._id,
    guestEmail: req.user ? undefined : shippingAddress.email,
    guestAccessToken,
    items,
    shippingAddress,
    billingAddress: billing,
    gstin,
    subtotal,
    discount,
    couponCode: code,
    shippingCost,
    gst,
    total,
    payment: { method: paymentMethod, status: PAYMENT_STATUS.PENDING },
    status: ORDER_STATUS.PLACED,
    inventoryDeducted: false,
    notes,
    timeline: [{ status: ORDER_STATUS.PLACED, note: 'Order placed' }],
  });

  if (paymentMethod === PAYMENT_METHOD.COD) {
    await deductOrderStock(items, order._id);
    order.inventoryDeducted = true;
    await order.save();

    if (couponDoc && req.user) await applyCouponUsage(couponDoc._id, req.user._id);
    await clearCartAfterCheckout(req);

    order.payment.status = PAYMENT_STATUS.PENDING;
    order.status = ORDER_STATUS.CONFIRMED;
    order.timeline.push({ status: ORDER_STATUS.CONFIRMED, note: 'COD order confirmed' });
    await order.save();

    const email = req.user?.email || shippingAddress.email;
    if (email) await queueOrderConfirmation(order._id, email);
    await queueInvoiceGeneration(order._id);

    return res.status(201).json({
      success: true,
      data: buildOrderResponse(order, { paymentRequired: false, guestAccessToken }),
    });
  }

  const razorpayOrder = await createRazorpayOrder(Math.round(total * 100), orderNumber);
  order.payment.razorpayOrderId = razorpayOrder.id;
  await order.save();

  res.status(201).json({
    success: true,
    data: buildOrderResponse(order, {
      paymentRequired: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      guestAccessToken,
    }),
  });
}

export async function verifyPayment(req, res) {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, guestAccessToken } = req.validated;

  const valid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) throw new AppError('Payment verification failed', 400, 'PAYMENT_FAILED');

  const order = await Order.findById(orderId).select('+guestAccessToken');
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');

  if (order.userId) {
    if (!req.user || order.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Order not found', 404, 'NOT_FOUND');
    }
  } else if (!guestAccessToken || guestAccessToken !== order.guestAccessToken) {
    throw new AppError('Invalid or missing order access token', 403, 'FORBIDDEN');
  }

  if (order.payment.status === PAYMENT_STATUS.PAID) {
    throw new AppError('Payment already verified', 400, 'ALREADY_PAID');
  }

  if (!order.inventoryDeducted) {
    await deductOrderStock(order.items, order._id);
    order.inventoryDeducted = true;
  }

  order.payment.status = PAYMENT_STATUS.PAID;
  order.payment.razorpayPaymentId = razorpayPaymentId;
  order.payment.paidAt = new Date();
  order.status = ORDER_STATUS.CONFIRMED;
  order.timeline.push({ status: ORDER_STATUS.CONFIRMED, note: 'Payment received' });
  await order.save();

  if (order.couponCode && req.user) {
    const { Coupon } = await import('../models/Coupon.js');
    const couponDoc = await Coupon.findOne({ code: order.couponCode.toUpperCase() });
    if (couponDoc) await applyCouponUsage(couponDoc._id, req.user._id);
  }

  await clearCartAfterCheckout(req);

  const user = req.user;
  const email = user?.email || order.guestEmail;
  if (email) await queueOrderConfirmation(order._id, email);
  await queueInvoiceGeneration(order._id);

  res.json({ success: true, data: order });
}

export async function listOrders(req, res) {
  const filter = req.user.role === 'customer' ? { userId: req.user._id } : {};
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(50);
  const data = orders.map((o) => enrichOrderReturnMeta(o.toObject()));
  res.json({ success: true, data });
}

export async function getOrder(req, res) {
  const order = await Order.findOne(orderIdFilter(req.params.id)).select('+guestAccessToken');
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');

  assertOrderAccess(req, order);

  const data = order.toObject();
  delete data.guestAccessToken;

  if (data.items?.length) {
    const { Product } = await import('../models/Product.js');
    const ids = data.items.map((i) => i.productId).filter(Boolean);
    const products = await Product.find({ _id: { $in: ids } }).select('slug').lean();
    const slugMap = Object.fromEntries(products.map((p) => [p._id.toString(), p.slug]));
    data.items = data.items.map((i) => ({
      ...i,
      productSlug: slugMap[i.productId?.toString()],
    }));
  }

  enrichOrderReturnMeta(data);

  res.json({ success: true, data });
}

export async function trackOrder(req, res) {
  const order = await Order.findOne({ orderNumber: req.params.id })
    .select('orderNumber status timeline courier trackingNumber trackingUrl createdAt');
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: order });
}

export async function updateShipping(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');

  const { status, courier, trackingNumber, trackingUrl } = req.validated;
  const wasShipped = order.status === ORDER_STATUS.SHIPPED;
  const previousStatus = order.status;

  if (status) {
    order.status = status;
    order.timeline.push({ status, note: `Status updated to ${status}` });
  }
  if (courier !== undefined) order.courier = courier;
  if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
  if (trackingUrl !== undefined) order.trackingUrl = trackingUrl || undefined;

  await order.save();

  if (status === ORDER_STATUS.SHIPPED && !wasShipped) {
    const { User } = await import('../models/User.js');
    const user = order.userId ? await User.findById(order.userId) : null;
    const email = user?.email || order.guestEmail;
    if (email) {
      try {
        await queueShipmentEmail(order._id, email);
      } catch {
        await sendShipmentEmail(order, email);
      }
    }
  }

  if (status === ORDER_STATUS.DELIVERED && previousStatus !== ORDER_STATUS.DELIVERED) {
    const { User } = await import('../models/User.js');
    const user = order.userId ? await User.findById(order.userId) : null;
    const email = user?.email || order.guestEmail;
    if (email) {
      try {
        await queueReviewRequest(order._id, email);
      } catch {
        await sendReviewRequestEmail(order, email);
      }
    }
  }

  res.json({ success: true, data: order });
}

export async function requestReturn(req, res) {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
  if (order.status !== ORDER_STATUS.DELIVERED) {
    throw new AppError('Only delivered orders can be returned', 400, 'INVALID_STATUS');
  }
  if (order.returnRequest?.status) {
    throw new AppError('A return request already exists for this order', 400, 'RETURN_EXISTS');
  }
  if (!canRequestReturn(order)) {
    throw new AppError(
      `Return window closed. Returns must be requested within ${config.returnWindowDays} days of delivery.`,
      400,
      'RETURN_WINDOW_EXPIRED',
    );
  }

  order.returnRequest = {
    ...req.validated,
    requestedAt: new Date(),
    status: 'PENDING',
  };
  order.status = ORDER_STATUS.RETURN_REQUESTED;
  order.timeline.push({ status: ORDER_STATUS.RETURN_REQUESTED, note: 'Return requested' });
  await order.save();

  res.json({ success: true, data: enrichOrderReturnMeta(order.toObject()) });
}

export async function cancelOrder(req, res) {
  const { guestAccessToken } = req.body || {};
  const order = await Order.findOne(orderIdFilter(req.params.id)).select('+guestAccessToken');
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');

  if (req.user) {
    if (order.userId && order.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Order not found', 404, 'NOT_FOUND');
    }
  } else if (order.userId) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  } else if (!guestAccessToken || guestAccessToken !== order.guestAccessToken) {
    throw new AppError('Invalid or missing order access token', 403, 'FORBIDDEN');
  }

  if (![ORDER_STATUS.PLACED, ORDER_STATUS.CONFIRMED].includes(order.status)) {
    throw new AppError('Order cannot be cancelled', 400, 'INVALID_STATUS');
  }

  if (order.payment.status === PAYMENT_STATUS.PAID && order.status === ORDER_STATUS.CONFIRMED) {
    throw new AppError('Paid orders cannot be cancelled online. Contact support.', 400, 'INVALID_STATUS');
  }

  if (shouldRestoreOrderStock(order)) {
    await restoreOrderStock(order.items, order._id, 'Order cancelled by customer');
    order.inventoryDeducted = false;
  }

  order.status = ORDER_STATUS.CANCELLED;
  order.timeline.push({ status: ORDER_STATUS.CANCELLED, note: 'Order cancelled' });
  await order.save();

  res.json({ success: true, data: order });
}
