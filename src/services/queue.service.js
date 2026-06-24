import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis.js';

const connection = getRedisConnectionOptions();

export const emailQueue = new Queue('email', { connection });
export const invoiceQueue = new Queue('invoice', { connection });
export const inventoryQueue = new Queue('inventory', { connection });

const EMAIL_JOB_OPTS = { attempts: 3, removeOnComplete: true };

async function addEmailJob(name, data, options = {}) {
  await emailQueue.add(name, data, { ...EMAIL_JOB_OPTS, ...options });
}

export async function queueOrderConfirmation(orderId, email) {
  await addEmailJob('order-confirmation', { orderId, email });
}

export async function queueOrderPlaced(orderId, email) {
  await addEmailJob('order-placed', { orderId, email });
}

export async function queueOrderPacked(orderId, email) {
  await addEmailJob('order-packed', { orderId, email });
}

export async function queueShipmentEmail(orderId, email) {
  await addEmailJob('shipment', { orderId, email });
}

export async function queueDeliveryEmail(orderId, email) {
  await addEmailJob('delivery', { orderId, email });
}

export async function queueReviewRequest(orderId, email) {
  await addEmailJob('review-request', { orderId, email }, {
    attempts: 2,
    delay: 2 * 24 * 60 * 60 * 1000,
  });
}

export async function queueOrderCancelled(orderId, email, reason = '') {
  await addEmailJob('order-cancelled', { orderId, email, reason });
}

export async function queueRefundEmail(orderId, email, amount) {
  await addEmailJob('refund', { orderId, email, amount });
}

export async function queueReturnRequested(orderId, email) {
  await addEmailJob('return-requested', { orderId, email });
}

export async function queueReturnApproved(orderId, email) {
  await addEmailJob('return-approved', { orderId, email });
}

export async function queueReturnRejected(orderId, email, note = '') {
  await addEmailJob('return-rejected', { orderId, email, note });
}

export async function queuePaymentFailed(orderId, email) {
  await addEmailJob('payment-failed', { orderId, email });
}

export async function queueCodPaymentConfirmed(orderId, email) {
  await addEmailJob('cod-payment-confirmed', { orderId, email });
}

export async function queueNewOrderAdmin(orderId) {
  await addEmailJob('admin-new-order', { orderId }, { attempts: 2 });
}

export async function queueReturnRequestAdmin(orderId) {
  await addEmailJob('admin-return-request', { orderId }, { attempts: 2 });
}

export async function queueInvoiceGeneration(orderId) {
  await invoiceQueue.add('generate', { orderId }, { attempts: 3, removeOnComplete: true });
}

export async function queueAbandonedCart(cartId, email, items, customerName = '') {
  await emailQueue.add('abandoned-cart', { cartId, email, items, customerName }, {
    delay: 24 * 60 * 60 * 1000,
    attempts: 2,
    jobId: `abandoned-cart-${cartId}`,
    removeOnComplete: true,
  });
}

export async function cancelAbandonedCart(cartId) {
  try {
    const job = await emailQueue.getJob(`abandoned-cart-${cartId}`);
    if (job) await job.remove();
  } catch {
    // non-blocking
  }
}

export async function cancelAbandonedCartForUser(userId) {
  await cancelAbandonedCart(userId.toString());
}
