import { Order } from '../models/Order.js';
import { verifyWebhookSignature } from '../services/payment.service.js';
import { PAYMENT_STATUS, ORDER_STATUS } from '../shared/index.js';
import { queueOrderConfirmation, queueInvoiceGeneration } from '../services/queue.service.js';

export async function razorpayWebhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody
    ? req.rawBody.toString()
    : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
  const event = payload.event;
  const payment = payload.payload?.payment?.entity;

  if (event === 'payment.captured' && payment) {
    const order = await Order.findOne({ 'payment.razorpayOrderId': payment.order_id });
    if (order && order.payment.status !== PAYMENT_STATUS.PAID) {
      order.payment.status = PAYMENT_STATUS.PAID;
      order.payment.razorpayPaymentId = payment.id;
      order.payment.paidAt = new Date();
      order.status = ORDER_STATUS.CONFIRMED;
      order.timeline.push({ status: ORDER_STATUS.CONFIRMED, note: 'Payment captured via webhook' });
      await order.save();

      const { User } = await import('../models/User.js');
      const user = order.userId ? await User.findById(order.userId) : null;
      const email = user?.email || order.guestEmail;
      if (email) await queueOrderConfirmation(order._id, email);
      await queueInvoiceGeneration(order._id);
    }
  }

  res.json({ status: 'ok' });
}
