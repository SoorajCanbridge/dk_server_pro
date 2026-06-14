import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { AppError } from '../utils/errors.js';

let razorpay = null;

function getRazorpay() {
  if (!razorpay && config.razorpay.keyId && config.razorpay.keySecret) {
    razorpay = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }
  return razorpay;
}

export async function createRazorpayOrder(amountInPaise, receipt) {
  const rp = getRazorpay();
  if (!rp) {
    return { id: `order_mock_${Date.now()}`, amount: amountInPaise, currency: 'INR' };
  }

  return rp.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt,
  });
}

export function verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  if (!config.razorpay.keySecret) return true;

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(body)
    .digest('hex');

  return expected === razorpaySignature;
}

export function verifyWebhookSignature(body, signature) {
  if (!config.razorpay.webhookSecret) return true;
  const expected = crypto
    .createHmac('sha256', config.razorpay.webhookSecret)
    .update(body)
    .digest('hex');
  return expected === signature;
}

export async function createRefund(paymentId, amountInPaise) {
  const rp = getRazorpay();
  if (!rp) return { id: `refund_mock_${Date.now()}` };
  return rp.payments.refund(paymentId, { amount: amountInPaise });
}
