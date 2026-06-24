import { Worker } from 'bullmq';
import { connectDB } from './config/db.js';
import { getRedisConnectionOptions } from './config/redis.js';
import { Order } from './models/Order.js';
import {
  sendOrderConfirmationEmail,
  sendOrderPlacedEmail,
  sendOrderPackedEmail,
  sendShipmentEmail,
  sendDeliveryEmail,
  sendAbandonedCartEmail,
  sendReviewRequestEmail,
  sendOrderCancelledEmail,
  sendRefundEmail,
  sendReturnRequestedEmail,
  sendReturnApprovedEmail,
  sendReturnRejectedEmail,
  sendPaymentFailedEmail,
  sendCodPaymentConfirmedEmail,
  sendNewOrderAdminEmail,
  sendReturnRequestAdminEmail,
} from './services/email.service.js';
import { generateAndSaveInvoice } from './services/invoice.service.js';

const connection = getRedisConnectionOptions();

async function loadOrder(orderId) {
  return Order.findById(orderId);
}

async function start() {
  await connectDB();

  new Worker('email', async (job) => {
    const { name, data } = job;

    if (name === 'order-confirmation') {
      const order = await loadOrder(data.orderId);
      if (order) await sendOrderConfirmationEmail(order, data.email);
    }

    if (name === 'order-placed') {
      const order = await loadOrder(data.orderId);
      if (order) await sendOrderPlacedEmail(order, data.email);
    }

    if (name === 'order-packed') {
      const order = await loadOrder(data.orderId);
      if (order) await sendOrderPackedEmail(order, data.email);
    }

    if (name === 'shipment') {
      const order = await loadOrder(data.orderId);
      if (order) await sendShipmentEmail(order, data.email);
    }

    if (name === 'delivery') {
      const order = await loadOrder(data.orderId);
      if (order) await sendDeliveryEmail(order, data.email);
    }

    if (name === 'review-request') {
      const order = await loadOrder(data.orderId);
      if (order) await sendReviewRequestEmail(order, data.email);
    }

    if (name === 'order-cancelled') {
      const order = await loadOrder(data.orderId);
      if (order) await sendOrderCancelledEmail(order, data.email, data.reason);
    }

    if (name === 'refund') {
      const order = await loadOrder(data.orderId);
      if (order) await sendRefundEmail(order, data.email, data.amount);
    }

    if (name === 'return-requested') {
      const order = await loadOrder(data.orderId);
      if (order) await sendReturnRequestedEmail(order, data.email);
    }

    if (name === 'return-approved') {
      const order = await loadOrder(data.orderId);
      if (order) await sendReturnApprovedEmail(order, data.email);
    }

    if (name === 'return-rejected') {
      const order = await loadOrder(data.orderId);
      if (order) await sendReturnRejectedEmail(order, data.email, data.note);
    }

    if (name === 'payment-failed') {
      const order = await loadOrder(data.orderId);
      if (order) await sendPaymentFailedEmail(order, data.email);
    }

    if (name === 'cod-payment-confirmed') {
      const order = await loadOrder(data.orderId);
      if (order) await sendCodPaymentConfirmedEmail(order, data.email);
    }

    if (name === 'abandoned-cart') {
      await sendAbandonedCartEmail(data.email, data.items, data.customerName);
    }

    if (name === 'admin-new-order') {
      const order = await loadOrder(data.orderId);
      if (order) await sendNewOrderAdminEmail(order);
    }

    if (name === 'admin-return-request') {
      const order = await loadOrder(data.orderId);
      if (order) await sendReturnRequestAdminEmail(order);
    }
  }, { connection });

  new Worker('invoice', async (job) => {
    await generateAndSaveInvoice(job.data.orderId);
  }, { connection });

  console.log('BullMQ workers started');
}

start().catch(console.error);
