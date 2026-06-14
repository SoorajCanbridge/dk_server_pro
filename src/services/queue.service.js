import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis.js';

const connection = getRedisConnectionOptions();

export const emailQueue = new Queue('email', { connection });
export const invoiceQueue = new Queue('invoice', { connection });
export const inventoryQueue = new Queue('inventory', { connection });

export async function queueOrderConfirmation(orderId, email) {
  await emailQueue.add('order-confirmation', { orderId, email }, { attempts: 3 });
}

export async function queueShipmentEmail(orderId, email) {
  await emailQueue.add('shipment', { orderId, email }, { attempts: 3 });
}

export async function queueInvoiceGeneration(orderId) {
  await invoiceQueue.add('generate', { orderId }, { attempts: 3 });
}

export async function queueAbandonedCart(cartId, email, items) {
  await emailQueue.add('abandoned-cart', { cartId, email, items }, {
    delay: 24 * 60 * 60 * 1000,
    attempts: 2,
    jobId: `abandoned-cart-${cartId}`,
    removeOnComplete: true,
  });
}

export async function queueReviewRequest(orderId, email) {
  await emailQueue.add('review-request', { orderId, email }, { attempts: 2 });
}
