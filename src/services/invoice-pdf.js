import PDFDocument from 'pdfkit';
import { config } from '../config/index.js';

const PAGE = { width: 595.28, height: 841.89, margin: 48 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const COLORS = {
  brand: '#111111',
  accent: '#c9a96e',
  muted: '#6b7280',
  border: '#e5e7eb',
  fill: '#fafafa',
};

const PAYMENT_LABELS = {
  RAZORPAY: 'Online Payment (Razorpay)',
  COD: 'Cash on Delivery',
};

const PAYMENT_STATUS_LABELS = {
  PAID: 'Paid',
  PENDING: 'Pending',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

function formatMoney(amount) {
  return Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateText(text, max = 42) {
  const value = String(text || '');
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function convertBelowThousand(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  let words = '';
  if (num >= 100) {
    words += `${ones[Math.floor(num / 100)]} Hundred`;
    num %= 100;
    if (num) words += ' ';
  }
  if (num >= 20) {
    words += tens[Math.floor(num / 10)];
    num %= 10;
    if (num) words += ` ${ones[num]}`;
  } else if (num >= 10) {
    words += teens[num - 10];
  } else if (num > 0) {
    words += ones[num];
  }
  return words.trim();
}

function convertIndianNumber(num) {
  if (num === 0) return 'Zero';
  let words = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  if (crore) {
    words += `${convertBelowThousand(crore)} Crore`;
  }
  if (lakh) {
    if (words) words += ' ';
    words += `${convertBelowThousand(lakh)} Lakh`;
  }
  if (thousand) {
    if (words) words += ' ';
    words += `${convertBelowThousand(thousand)} Thousand`;
  }
  if (num) {
    if (words) words += ' ';
    words += convertBelowThousand(num);
  }
  return words.trim();
}

function amountInWords(amount) {
  const rupees = Math.floor(Number(amount || 0));
  const paise = Math.round((Number(amount || 0) - rupees) * 100);
  let words = `${convertIndianNumber(rupees)} Rupees`;
  if (paise) words += ` and ${convertIndianNumber(paise)} Paise`;
  return `${words} Only`;
}

function sellerLines() {
  const { store } = config;
  const lines = [store.name];
  if (store.tagline) lines.push(store.tagline);
  if (store.address) lines.push(store.address);
  const cityLine = [store.city, store.state, store.pincode].filter(Boolean).join(', ');
  if (cityLine) lines.push(cityLine);
  if (store.gstin) lines.push(`GSTIN: ${store.gstin}`);
  if (store.phone) lines.push(`Phone: ${store.phone}`);
  if (store.email) lines.push(`Email: ${store.email}`);
  if (store.website) lines.push(store.website.replace(/^https?:\/\//, ''));
  return lines;
}

function addressLines(address) {
  if (!address) return ['—'];
  const lines = [address.fullName];
  if (address.phone) lines.push(`Phone: ${address.phone}`);
  if (address.line1) lines.push(address.line1);
  if (address.line2) lines.push(address.line2);
  lines.push(`${address.city}, ${address.state} - ${address.pincode}`);
  return lines;
}

function drawSectionTitle(doc, title, x, y) {
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted).text(title.toUpperCase(), x, y);
}

function drawParagraph(doc, lines, x, y, width, lineGap = 2) {
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.brand);
  lines.forEach((line, index) => {
    doc.text(line, x, y + index * (11 + lineGap), { width });
  });
  return y + lines.length * (11 + lineGap);
}

function drawTableHeader(doc, y) {
  const cols = [
    { label: '#', x: PAGE.margin, w: 18 },
    { label: 'Description', x: PAGE.margin + 22, w: 168 },
    { label: 'SKU', x: PAGE.margin + 194, w: 72 },
    { label: 'HSN', x: PAGE.margin + 270, w: 38 },
    { label: 'Qty', x: PAGE.margin + 312, w: 28, align: 'right' },
    { label: 'Rate', x: PAGE.margin + 346, w: 58, align: 'right' },
    { label: 'Amount', x: PAGE.margin + 410, w: CONTENT_WIDTH - 410, align: 'right' },
  ];

  doc.save();
  doc.rect(PAGE.margin, y, CONTENT_WIDTH, 20).fill(COLORS.fill);
  doc.fillColor(COLORS.brand).font('Helvetica-Bold').fontSize(8);
  cols.forEach((col) => {
    doc.text(col.label, col.x + 4, y + 6, { width: col.w - 8, align: col.align || 'left' });
  });
  doc.restore();
  doc.moveTo(PAGE.margin, y + 20).lineTo(PAGE.margin + CONTENT_WIDTH, y + 20).strokeColor(COLORS.border).stroke();
  return { y: y + 20, cols };
}

function drawTableRow(doc, item, index, y, cols) {
  const rowHeight = 28;
  if (y + rowHeight > PAGE.height - PAGE.margin - 180) {
    doc.addPage();
    y = PAGE.margin;
    ({ y } = drawTableHeader(doc, y));
  }

  const description = truncateText(item.title, 38);
  const variant = [item.size, item.color].filter(Boolean).join(' / ');
  const amount = item.price * item.quantity;

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.brand);
  doc.text(String(index + 1), cols[0].x + 4, y + 6, { width: cols[0].w - 8 });
  doc.text(description, cols[1].x + 4, y + 4, { width: cols[1].w - 8 });
  if (variant) {
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.muted)
      .text(variant, cols[1].x + 4, y + 15, { width: cols[1].w - 8 });
  }
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.brand);
  doc.text(truncateText(item.variantSku || '—', 14), cols[2].x + 4, y + 8, { width: cols[2].w - 8 });
  doc.text('6109', cols[3].x + 4, y + 8, { width: cols[3].w - 8 });
  doc.text(String(item.quantity), cols[4].x + 4, y + 8, { width: cols[4].w - 8, align: 'right' });
  doc.text(formatMoney(item.price), cols[5].x + 4, y + 8, { width: cols[5].w - 8, align: 'right' });
  doc.text(formatMoney(amount), cols[6].x + 4, y + 8, { width: cols[6].w - 8, align: 'right' });

  doc.moveTo(PAGE.margin, y + rowHeight).lineTo(PAGE.margin + CONTENT_WIDTH, y + rowHeight)
    .strokeColor(COLORS.border).stroke();
  return y + rowHeight;
}

function drawTotals(doc, order, startY) {
  const boxWidth = 230;
  const boxX = PAGE.margin + CONTENT_WIDTH - boxWidth;
  let y = startY + 12;
  const rows = [
    ['Subtotal', formatMoney(order.subtotal)],
  ];
  if (order.discount > 0) rows.push(['Discount', `- ${formatMoney(order.discount)}`]);
  if (order.couponCode) rows.push(['Coupon', order.couponCode]);
  rows.push(['Shipping', formatMoney(order.shippingCost)]);
  if (order.gst?.cgst) rows.push([`CGST (${order.gst.rate / 2}%)`, formatMoney(order.gst.cgst)]);
  if (order.gst?.sgst) rows.push([`SGST (${order.gst.rate / 2}%)`, formatMoney(order.gst.sgst)]);
  if (order.gst?.igst) rows.push([`IGST (${order.gst.rate}%)`, formatMoney(order.gst.igst)]);

  const boxHeight = 24 + rows.length * 16 + 28;
  doc.rect(boxX, y, boxWidth, boxHeight).strokeColor(COLORS.border).stroke();

  rows.forEach(([label, value], index) => {
    const rowY = y + 10 + index * 16;
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(label, boxX + 12, rowY);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.brand).text(value, boxX + 12, rowY, {
      width: boxWidth - 24,
      align: 'right',
    });
  });

  const totalY = y + boxHeight - 24;
  doc.moveTo(boxX, totalY).lineTo(boxX + boxWidth, totalY).strokeColor(COLORS.border).stroke();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.brand)
    .text('Grand Total', boxX + 12, totalY + 8);
  doc.text(`Rs. ${formatMoney(order.total)}`, boxX + 12, totalY + 8, {
    width: boxWidth - 24,
    align: 'right',
  });

  return y + boxHeight + 12;
}

export function buildInvoicePdfBuffer(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE.margin,
      info: {
        Title: `Invoice ${order.orderNumber}`,
        Author: config.store.name,
        Subject: 'Tax Invoice',
      },
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const billing = order.billingAddress || order.shippingAddress;
    const shipping = order.shippingAddress;
    const invoiceDate = order.payment?.paidAt || order.createdAt;

    // Header band
    doc.rect(PAGE.margin, PAGE.margin, CONTENT_WIDTH, 4).fill(COLORS.accent);
    doc.fillColor(COLORS.brand).font('Helvetica-Bold').fontSize(22)
      .text(config.store.name, PAGE.margin, PAGE.margin + 14);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
      .text('TAX INVOICE', PAGE.margin, PAGE.margin + 40);

    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.brand)
      .text(`Invoice No: ${order.orderNumber}`, PAGE.margin + CONTENT_WIDTH - 210, PAGE.margin + 14, {
        width: 210,
        align: 'right',
      });
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
      .text(`Date: ${formatDate(invoiceDate)}`, PAGE.margin + CONTENT_WIDTH - 210, PAGE.margin + 30, {
        width: 210,
        align: 'right',
      })
      .text(`Order Date: ${formatDateTime(order.createdAt)}`, PAGE.margin + CONTENT_WIDTH - 210, PAGE.margin + 44, {
        width: 210,
        align: 'right',
      })
      .text(`Place of Supply: ${shipping?.state || config.store.state || '—'}`, PAGE.margin + CONTENT_WIDTH - 210, PAGE.margin + 58, {
        width: 210,
        align: 'right',
      });

    let y = PAGE.margin + 88;
    doc.moveTo(PAGE.margin, y).lineTo(PAGE.margin + CONTENT_WIDTH, y).strokeColor(COLORS.border).stroke();
    y += 16;

    const colWidth = CONTENT_WIDTH / 2 - 8;
    drawSectionTitle(doc, 'Sold By', PAGE.margin, y);
    drawSectionTitle(doc, 'Payment', PAGE.margin + colWidth + 16, y);
    y += 14;
    const leftBottom = drawParagraph(doc, sellerLines(), PAGE.margin, y, colWidth);
    const paymentLines = [
      PAYMENT_LABELS[order.payment?.method] || order.payment?.method || '—',
      `Status: ${PAYMENT_STATUS_LABELS[order.payment?.status] || order.payment?.status || '—'}`,
    ];
    if (order.payment?.razorpayPaymentId) {
      paymentLines.push(`Txn ID: ${truncateText(order.payment.razorpayPaymentId, 28)}`);
    }
    const rightBottom = drawParagraph(doc, paymentLines, PAGE.margin + colWidth + 16, y, colWidth);
    y = Math.max(leftBottom, rightBottom) + 14;

    drawSectionTitle(doc, 'Bill To', PAGE.margin, y);
    drawSectionTitle(doc, 'Ship To', PAGE.margin + colWidth + 16, y);
    y += 14;
    const billLines = addressLines(billing);
    if (order.gstin) billLines.push(`Buyer GSTIN: ${order.gstin}`);
    const shipLines = addressLines(shipping);
    const billBottom = drawParagraph(doc, billLines, PAGE.margin, y, colWidth);
    const shipBottom = drawParagraph(doc, shipLines, PAGE.margin + colWidth + 16, y, colWidth);
    y = Math.max(billBottom, shipBottom) + 18;

    let table = drawTableHeader(doc, y);
    order.items.forEach((item, index) => {
      table.y = drawTableRow(doc, item, index, table.y, table.cols);
    });

    y = drawTotals(doc, order, table.y);

    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted)
      .text('Amount in words', PAGE.margin, y);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.brand)
      .text(amountInWords(order.total), PAGE.margin, y + 12, { width: CONTENT_WIDTH - 250 });

    y += 36;
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
      .text(
        'This is a computer-generated tax invoice and does not require a physical signature. '
        + 'For support or billing queries, contact us at '
        + `${config.store.email || config.smtp.fromEmail}. `
        + 'Goods once sold are subject to our exchange policy as stated on the website.',
        PAGE.margin,
        PAGE.height - PAGE.margin - 36,
        { width: CONTENT_WIDTH, align: 'left' },
      );

    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.brand)
      .text('Thank you for shopping with us.', PAGE.margin, PAGE.height - PAGE.margin - 14, {
        width: CONTENT_WIDTH,
        align: 'center',
      });

    doc.end();
  });
}
