import PDFDocument from 'pdfkit';
import { uploadBuffer } from './s3.service.js';
import { Order } from '../models/Order.js';

export async function generateInvoicePDF(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const key = `invoices/${order.orderNumber}.pdf`;
        const url = await uploadBuffer(key, buffer, 'application/pdf');
        resolve(url || `local://${key}`);
      } catch (err) {
        reject(err);
      }
    });
    doc.on('error', reject);

    doc.fontSize(20).text('DK Clothing', { align: 'center' });
    doc.fontSize(10).text('Tax Invoice', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Invoice No: ${order.orderNumber}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`);
    if (order.gstin) doc.text(`GSTIN: ${order.gstin}`);
    doc.moveDown();

    doc.text('Bill To:');
    const addr = order.shippingAddress;
    doc.fontSize(10).text(`${addr.fullName}\n${addr.line1}\n${addr.city}, ${addr.state} - ${addr.pincode}`);
    doc.moveDown();

    doc.fontSize(10);
    const tableTop = doc.y;
    doc.text('Item', 50, tableTop);
    doc.text('Qty', 280, tableTop);
    doc.text('Price', 330, tableTop);
    doc.text('Total', 400, tableTop);
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 25;
    for (const item of order.items) {
      doc.text(`${item.title} (${item.size}/${item.color})`, 50, y);
      doc.text(String(item.quantity), 280, y);
      doc.text(`₹${item.price}`, 330, y);
      doc.text(`₹${item.price * item.quantity}`, 400, y);
      y += 20;
    }

    doc.moveDown(2);
    y = doc.y;
    doc.text(`Subtotal: ₹${order.subtotal}`, 350, y);
    if (order.discount > 0) doc.text(`Discount: -₹${order.discount}`, 350, y + 15);
    doc.text(`Shipping: ₹${order.shippingCost}`, 350, y + 30);
    if (order.gst) {
      if (order.gst.cgst) doc.text(`CGST (${order.gst.rate / 2}%): ₹${order.gst.cgst}`, 350, y + 45);
      if (order.gst.sgst) doc.text(`SGST (${order.gst.rate / 2}%): ₹${order.gst.sgst}`, 350, y + 60);
      if (order.gst.igst) doc.text(`IGST (${order.gst.rate}%): ₹${order.gst.igst}`, 350, y + 45);
    }
    doc.fontSize(12).text(`Total: ₹${order.total}`, 350, y + 80, { bold: true });

    doc.end();
  });
}

export async function generateAndSaveInvoice(orderId) {
  const order = await Order.findById(orderId);
  if (!order) return null;

  const invoiceUrl = await generateInvoicePDF(order);
  order.invoiceUrl = invoiceUrl;
  await order.save();
  return invoiceUrl;
}
