import { urlToS3Key } from '../services/s3.service.js';

export function resolveInvoiceKey(order) {
  if (order.invoiceKey) return order.invoiceKey;
  if (order.invoiceUrl) return urlToS3Key(order.invoiceUrl);
  return null;
}

export function orderHasInvoice(order) {
  if (resolveInvoiceKey(order)) return true;
  const downloadable = ['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'];
  return downloadable.includes(order.status);
}

export function sanitizeOrderForClient(order) {
  const data = typeof order.toObject === 'function' ? order.toObject() : { ...order };
  const hasInvoice = orderHasInvoice(data);
  delete data.invoiceUrl;
  delete data.invoiceKey;
  delete data.guestAccessToken;
  data.hasInvoice = hasInvoice;
  return data;
}
