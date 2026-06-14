import { Worker } from 'bullmq';
import { connectDB } from './config/db.js';
import { getRedisConnectionOptions } from './config/redis.js';
import { Order } from './models/Order.js';
import {
  sendOrderConfirmationEmail,
  sendShipmentEmail,
  sendAbandonedCartEmail,
  sendReviewRequestEmail,
} from './services/email.service.js';
import { generateAndSaveInvoice } from './services/invoice.service.js';

const connection = getRedisConnectionOptions();

async function start() {
  await connectDB();

  new Worker('email', async (job) => {
    const { name, data } = job;

    if (name === 'order-confirmation') {
      const order = await Order.findById(data.orderId);
      if (order) await sendOrderConfirmationEmail(order, data.email);
    }

    if (name === 'shipment') {
      const order = await Order.findById(data.orderId);
      if (order) await sendShipmentEmail(order, data.email);
    }

    if (name === 'abandoned-cart') {
      await sendAbandonedCartEmail(data.email, data.items);
    }

    if (name === 'review-request') {
      const order = await Order.findById(data.orderId);
      if (order) await sendReviewRequestEmail(order, data.email);
    }
  }, { connection });

  new Worker('invoice', async (job) => {
    await generateAndSaveInvoice(job.data.orderId);
  }, { connection });

  console.log('BullMQ workers started');
}

start().catch(console.error);
