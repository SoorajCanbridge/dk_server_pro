import { uploadBuffer } from './s3.service.js';
import { Order } from '../models/Order.js';
import { buildInvoicePdfBuffer } from './invoice-pdf.js';

export async function generateInvoicePDF(order) {
  const buffer = await buildInvoicePdfBuffer(order);
  const key = `invoices/${order.orderNumber}.pdf`;
  const storedKey = await uploadBuffer(key, buffer, 'application/pdf', { isPublic: false });
  return storedKey || key;
}

export async function generateAndSaveInvoice(orderId) {
  const order = await Order.findById(orderId);
  if (!order) return null;

  const invoiceKey = await generateInvoicePDF(order);
  await Order.updateOne(
    { _id: order._id },
    { $set: { invoiceKey }, $unset: { invoiceUrl: '' } },
  );
  return invoiceKey;
}

export { buildInvoicePdfBuffer };
