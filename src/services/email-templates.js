import { config } from '../config/index.js';

const BRAND = 'DK Clothings';
const ACCENT = '#c9a96e';
const SITE_URL = config.clientUrl || 'https://www.dkclothings.com';

export function formatRupee(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

function emailLayout({ preheader, title, bodyHtml, footerNote }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,'Times New Roman',serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:3px solid ${ACCENT};">
              <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.12em;color:#111111;">DK</p>
              <p style="margin:4px 0 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Clothings</p>
              <p style="margin:8px 0 0;font-size:12px;font-style:italic;color:${ACCENT};">Let's Celebrate your elegance</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#374151;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9ca3af;line-height:1.5;">
              ${footerNote || `You received this email regarding your ${BRAND} order.`}
              <br /><br />
              <a href="${SITE_URL}" style="color:#111111;text-decoration:underline;">Visit ${BRAND}</a>
              · <a href="${SITE_URL}/contact" style="color:#111111;text-decoration:underline;">Contact support</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href, label) {
  return `<p style="margin:24px 0 0;text-align:center;"><a href="${href}" style="display:inline-block;background:#111111;color:#ffffff;padding:14px 28px;text-decoration:none;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">${label}</a></p>`;
}

function greeting(name) {
  return name ? `<p style="margin:0 0 16px;">Hello ${name},</p>` : '';
}

export function buildOrderItemsTable(order) {
  const rows = (order.items || []).map((i) => `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
        <strong style="color:#111111;">${i.title}</strong><br />
        <span style="font-size:12px;color:#6b7280;">Size: ${i.size || '—'} · Color: ${i.color || '—'}</span>
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:center;vertical-align:top;">${i.quantity}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;white-space:nowrap;">${formatRupee(i.price * i.quantity)}</td>
    </tr>
  `).join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;font-size:14px;">
      <tr style="background:#fafafa;">
        <th align="left" style="padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">Product</th>
        <th style="padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">Qty</th>
        <th align="right" style="padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">Amount</th>
      </tr>
      ${rows}
    </table>
  `;
}

export function buildOrderTotals(order) {
  const lines = [
    ['Subtotal', order.subtotal],
    order.discount > 0 ? ['Discount', -order.discount] : null,
    order.shippingCost > 0 ? ['Shipping', order.shippingCost] : ['Shipping', 0],
    order.gst?.total > 0 ? ['GST', order.gst.total] : null,
  ].filter(Boolean);

  const rows = lines.map(([label, value]) => {
    const display = value < 0 ? `−${formatRupee(Math.abs(value))}` : formatRupee(value);
    return `<tr><td style="padding:4px 0;color:#6b7280;">${label}</td><td align="right" style="padding:4px 0;">${display}</td></tr>`;
  }).join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-top:8px;">
      ${rows}
      <tr><td colspan="2" style="padding:8px 0;border-top:1px solid #e5e7eb;"></td></tr>
      <tr>
        <td style="padding:4px 0;font-size:16px;font-weight:700;color:#111111;">Total</td>
        <td align="right" style="padding:4px 0;font-size:16px;font-weight:700;color:#111111;">${formatRupee(order.total)}</td>
      </tr>
    </table>
  `;
}

function orderMetaBlock(order) {
  const paymentLabel = order.payment?.method === 'COD' ? 'Cash on Delivery' : 'Online Payment';
  const payStatus = order.payment?.status === 'PAID' ? 'Paid' : order.payment?.status === 'PENDING' ? 'Pending' : order.payment?.status || '—';

  return `
    <div style="margin:16px 0;padding:16px;background:#fafafa;border:1px solid #e5e7eb;font-size:13px;">
      <p style="margin:0 0 8px;"><strong>Order:</strong> ${order.orderNumber}</p>
      <p style="margin:0 0 8px;"><strong>Payment:</strong> ${paymentLabel} (${payStatus})</p>
      ${order.shippingAddress ? `<p style="margin:0;"><strong>Ship to:</strong> ${order.shippingAddress.fullName}, ${order.shippingAddress.city} ${order.shippingAddress.pincode}</p>` : ''}
    </div>
  `;
}

export function buildOtpEmailHtml({ name, otp, purpose = 'verify your email address', expiryMinutes = 5 }) {
  const greet = name ? `Hello ${name},` : 'Hello,';

  return emailLayout({
    preheader: `Your verification code is ${otp}. It expires in ${expiryMinutes} minutes.`,
    title: 'Verify your email',
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:20px;color:#111111;">Verify your email</h1>
      <p style="margin:0 0 20px;">${greet}</p>
      <p style="margin:0 0 24px;">Use the verification code below to ${purpose}:</p>
      <div style="text-align:center;margin:0 0 24px;padding:20px;background:#fafafa;border:1px solid #e5e7eb;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6b7280;">Verification code</p>
        <p style="margin:0;font-size:34px;font-weight:700;letter-spacing:0.35em;color:#111111;font-family:Consolas,Monaco,monospace;">${otp}</p>
      </div>
      <p style="margin:0 0 12px;font-size:14px;"><strong>This code expires in ${expiryMinutes} minutes.</strong></p>
      <p style="margin:0;font-size:13px;color:#6b7280;">If you did not request this, you can safely ignore this email.</p>
    `,
    footerNote: `You received this email because an action was requested on your ${BRAND} account.`,
  });
}

export function buildPasswordResetEmailHtml({ otp, expiryMinutes = 5 }) {
  return emailLayout({
    preheader: `Your password reset code is ${otp}.`,
    title: 'Reset your password',
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:20px;color:#111111;">Reset your password</h1>
      <p style="margin:0 0 24px;">We received a request to reset your ${BRAND} account password.</p>
      <div style="text-align:center;margin:0 0 24px;padding:20px;background:#fafafa;border:1px solid #e5e7eb;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6b7280;">Reset code</p>
        <p style="margin:0;font-size:34px;font-weight:700;letter-spacing:0.35em;color:#111111;font-family:Consolas,Monaco,monospace;">${otp}</p>
      </div>
      <p style="margin:0 0 12px;font-size:14px;"><strong>This code expires in ${expiryMinutes} minutes.</strong></p>
      <p style="margin:0;font-size:13px;color:#6b7280;">If you did not request a password reset, ignore this email.</p>
    `,
    footerNote: `You received this email because a password reset was requested on your ${BRAND} account.`,
  });
}

export function buildOrderConfirmationEmailHtml(order, customerName = '') {
  return emailLayout({
    preheader: `Thank you for your purchase! Order ${order.orderNumber} is confirmed.`,
    title: `Order confirmed — ${order.orderNumber}`,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">Thank you for your purchase!</h1>
      ${greeting(customerName)}
      <p style="margin:0 0 16px;">Your order has been confirmed. Here is a summary of what you ordered:</p>
      ${orderMetaBlock(order)}
      ${buildOrderItemsTable(order)}
      ${buildOrderTotals(order)}
      <p style="margin:16px 0 0;font-size:14px;color:#6b7280;">We will email you when your order is packed and shipped.</p>
      ${ctaButton(`${SITE_URL}/order/${order.orderNumber}`, 'View order')}
      ${ctaButton(`${SITE_URL}/track/${order.orderNumber}`, 'Track order')}
    `,
  });
}

export function buildOrderPlacedEmailHtml(order, customerName = '') {
  return emailLayout({
    preheader: `Order ${order.orderNumber} received — complete payment to confirm.`,
    title: `Order placed — ${order.orderNumber}`,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">We received your order</h1>
      ${greeting(customerName)}
      <p style="margin:0 0 16px;">Your order <strong>${order.orderNumber}</strong> is waiting for payment. Complete checkout to confirm your purchase.</p>
      ${orderMetaBlock(order)}
      ${buildOrderItemsTable(order)}
      ${buildOrderTotals(order)}
      ${ctaButton(`${SITE_URL}/checkout`, 'Complete payment')}
    `,
  });
}

export function buildOrderPackedEmailHtml(order, customerName = '') {
  return emailLayout({
    preheader: `Order ${order.orderNumber} is packed and ready to ship.`,
    title: `Order packed — ${order.orderNumber}`,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">Your order is packed</h1>
      ${greeting(customerName)}
      <p style="margin:0 0 16px;">Good news! Order <strong>${order.orderNumber}</strong> has been packed and will ship soon.</p>
      ${buildOrderItemsTable(order)}
      ${ctaButton(`${SITE_URL}/order/${order.orderNumber}`, 'View order')}
    `,
  });
}

export function buildShipmentEmailHtml(order, customerName = '') {
  const tracking = [
    order.courier ? `<p style="margin:0 0 8px;"><strong>Courier:</strong> ${order.courier}</p>` : '',
    order.trackingNumber ? `<p style="margin:0 0 8px;"><strong>Tracking number:</strong> ${order.trackingNumber}</p>` : '',
    order.trackingUrl ? `<p style="margin:0 0 8px;"><a href="${order.trackingUrl}" style="color:#111111;">Track your shipment</a></p>` : '',
  ].filter(Boolean).join('');

  return emailLayout({
    preheader: `Order ${order.orderNumber} is on the way!`,
    title: `Order shipped — ${order.orderNumber}`,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">Your order is on the way!</h1>
      ${greeting(customerName)}
      <p style="margin:0 0 16px;">Order <strong>${order.orderNumber}</strong> has been shipped.</p>
      ${tracking ? `<div style="margin:16px 0;padding:16px;background:#fafafa;border:1px solid #e5e7eb;">${tracking}</div>` : ''}
      ${buildOrderItemsTable(order)}
      ${ctaButton(order.trackingUrl || `${SITE_URL}/track/${order.orderNumber}`, 'Track delivery')}
    `,
  });
}

export function buildDeliveryEmailHtml(order, customerName = '') {
  return emailLayout({
    preheader: `Order ${order.orderNumber} has been delivered.`,
    title: `Order delivered — ${order.orderNumber}`,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">Delivered!</h1>
      ${greeting(customerName)}
      <p style="margin:0 0 16px;">Order <strong>${order.orderNumber}</strong> has been marked as delivered. We hope you love your new pieces!</p>
      ${buildOrderItemsTable(order)}
      <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Need help? Contact us within ${config.returnWindowDays || 3} days for exchange on damaged or incorrect items.</p>
      ${ctaButton(`${SITE_URL}/account/orders`, 'View orders')}
    `,
  });
}

export function buildReviewRequestEmailHtml(order, itemLinksHtml, customerName = '') {
  return emailLayout({
    preheader: `Share your feedback on order ${order.orderNumber}.`,
    title: `Review your order — ${order.orderNumber}`,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">How was your order?</h1>
      ${greeting(customerName)}
      <p style="margin:0 0 16px;">Your feedback helps other shoppers. Leave a review for items from order <strong>${order.orderNumber}</strong>:</p>
      <ul style="margin:0;padding-left:20px;">${itemLinksHtml}</ul>
      ${ctaButton(`${SITE_URL}/account/orders`, 'Write a review')}
    `,
  });
}

export function buildOrderCancelledEmailHtml(order, customerName = '', reason = '') {
  return emailLayout({
    preheader: `Order ${order.orderNumber} has been cancelled.`,
    title: `Order cancelled — ${order.orderNumber}`,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">Order cancelled</h1>
      ${greeting(customerName)}
      <p style="margin:0 0 16px;">Order <strong>${order.orderNumber}</strong> has been cancelled.${reason ? ` ${reason}` : ''}</p>
      ${buildOrderItemsTable(order)}
      <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">If you were charged online, any refund will be processed within 5–7 business days.</p>
      ${ctaButton(`${SITE_URL}/shop`, 'Continue shopping')}
    `,
  });
}

export function buildRefundEmailHtml(order, customerName = '', amount) {
  const refundAmount = amount ?? order.total;
  return emailLayout({
    preheader: `Refund processed for order ${order.orderNumber}.`,
    title: `Refund processed — ${order.orderNumber}`,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">Refund processed</h1>
      ${greeting(customerName)}
      <p style="margin:0 0 16px;">A refund of <strong>${formatRupee(refundAmount)}</strong> for order <strong>${order.orderNumber}</strong> has been initiated.</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">It may take 5–7 business days to appear in your account, depending on your bank or payment provider.</p>
      ${ctaButton(`${SITE_URL}/account/orders`, 'View orders')}
    `,
  });
}

export function buildReturnRequestedEmailHtml(order, customerName = '') {
  const reason = order.returnRequest?.reason || 'Not specified';
  return emailLayout({
    preheader: `Return request received for order ${order.orderNumber}.`,
    title: `Return request received — ${order.orderNumber}`,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">Return request received</h1>
      ${greeting(customerName)}
      <p style="margin:0 0 16px;">We received your return request for order <strong>${order.orderNumber}</strong>. Our team will review it shortly.</p>
      <div style="padding:16px;background:#fafafa;border:1px solid #e5e7eb;font-size:13px;">
        <p style="margin:0 0 8px;"><strong>Reason:</strong> ${reason}</p>
        ${order.returnRequest?.details ? `<p style="margin:0;"><strong>Details:</strong> ${order.returnRequest.details}</p>` : ''}
      </div>
      ${ctaButton(`${SITE_URL}/order/${order.orderNumber}`, 'View order status')}
    `,
  });
}

export function buildReturnApprovedEmailHtml(order, customerName = '') {
  return emailLayout({
    preheader: `Return approved for order ${order.orderNumber}.`,
    title: `Return approved — ${order.orderNumber}`,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">Return approved</h1>
      ${greeting(customerName)}
      <p style="margin:0 0 16px;">Your return for order <strong>${order.orderNumber}</strong> has been approved.</p>
      <p style="margin:0 0 16px;font-size:14px;">Please ship the item(s) back to us with your order number included. Once we receive and inspect the items, we will process your refund if applicable.</p>
      ${ctaButton(`${SITE_URL}/return-policy`, 'Return instructions')}
    `,
  });
}

export function buildReturnRejectedEmailHtml(order, customerName = '', note = '') {
  return emailLayout({
    preheader: `Return request update for order ${order.orderNumber}.`,
    title: `Return request update — ${order.orderNumber}`,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">Return request not approved</h1>
      ${greeting(customerName)}
      <p style="margin:0 0 16px;">We could not approve the return request for order <strong>${order.orderNumber}</strong>.</p>
      ${note ? `<p style="margin:0 0 16px;font-size:14px;"><strong>Note from our team:</strong> ${note}</p>` : ''}
      <p style="margin:0;font-size:13px;color:#6b7280;">Questions? Reply to this email or contact our support team.</p>
      ${ctaButton(`${SITE_URL}/contact`, 'Contact support')}
    `,
  });
}

export function buildPaymentFailedEmailHtml(order, customerName = '') {
  return emailLayout({
    preheader: `Payment failed for order ${order.orderNumber}.`,
    title: `Payment failed — ${order.orderNumber}`,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">Payment could not be completed</h1>
      ${greeting(customerName)}
      <p style="margin:0 0 16px;">We couldn't process payment for order <strong>${order.orderNumber}</strong>. Your order has not been confirmed.</p>
      ${buildOrderItemsTable(order)}
      ${buildOrderTotals(order)}
      ${ctaButton(`${SITE_URL}/cart`, 'Try again')}
    `,
  });
}

export function buildCodPaymentConfirmedEmailHtml(order, customerName = '') {
  return emailLayout({
    preheader: `Payment received for order ${order.orderNumber}.`,
    title: `Payment confirmed — ${order.orderNumber}`,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">Payment received</h1>
      ${greeting(customerName)}
      <p style="margin:0 0 16px;">We have received payment for your Cash on Delivery order <strong>${order.orderNumber}</strong>. Thank you!</p>
      ${ctaButton(`${SITE_URL}/order/${order.orderNumber}`, 'View order')}
    `,
  });
}

export function buildAbandonedCartEmailHtml(items, customerName = '') {
  const list = items.map((i) => `<li style="margin-bottom:8px;">${i.title}${i.price ? ` — ${formatRupee(i.price)}` : ''}</li>`).join('');
  return emailLayout({
    preheader: 'You left items in your cart at DK Clothings.',
    title: 'Complete your purchase',
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">Still thinking it over?</h1>
      ${greeting(customerName)}
      <p style="margin:0 0 16px;">These items are waiting in your cart:</p>
      <ul style="margin:0 0 16px;padding-left:20px;">${list}</ul>
      ${ctaButton(`${SITE_URL}/cart`, 'Complete checkout')}
    `,
    footerNote: `You received this because you added items to your cart at ${BRAND}.`,
  });
}

export function buildNewsletterWelcomeEmailHtml() {
  return emailLayout({
    preheader: 'Welcome to the DK Clothings newsletter.',
    title: 'Welcome to DK Clothings',
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">You're on the list!</h1>
      <p style="margin:0 0 16px;">Thanks for subscribing. You'll be first to hear about new arrivals, exclusive deals, and style inspiration.</p>
      ${ctaButton(`${SITE_URL}/shop`, 'Shop the collection')}
    `,
    footerNote: `You subscribed to updates from ${BRAND}.`,
  });
}

export function buildNewOrderAdminEmailHtml(order) {
  return emailLayout({
    preheader: `New order ${order.orderNumber} — ${formatRupee(order.total)}`,
    title: `New order — ${order.orderNumber}`,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">New order received</h1>
      <p style="margin:0 0 16px;">Order <strong>${order.orderNumber}</strong> — ${formatRupee(order.total)}</p>
      ${orderMetaBlock(order)}
      ${buildOrderItemsTable(order)}
      ${ctaButton(`${SITE_URL}/admin/orders`, 'Open admin')}
    `,
    footerNote: 'Admin notification from DK Clothings store.',
  });
}

export function buildReturnRequestAdminEmailHtml(order) {
  return emailLayout({
    preheader: `Return requested for order ${order.orderNumber}.`,
    title: `Return request — ${order.orderNumber}`,
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">Return request pending</h1>
      <p style="margin:0 0 16px;">Customer requested a return for order <strong>${order.orderNumber}</strong>.</p>
      <p style="margin:0 0 8px;"><strong>Reason:</strong> ${order.returnRequest?.reason || '—'}</p>
      ${order.returnRequest?.details ? `<p style="margin:0 0 16px;"><strong>Details:</strong> ${order.returnRequest.details}</p>` : ''}
      ${ctaButton(`${SITE_URL}/admin/orders`, 'Review in admin')}
    `,
    footerNote: 'Admin notification from DK Clothings store.',
  });
}

export function buildLowStockAlertEmailHtml(products) {
  const list = products.map((p) => `<li style="margin-bottom:6px;"><strong>${p.title}</strong> — SKU ${p.sku} (${p.stock} left)</li>`).join('');
  return emailLayout({
    preheader: 'Low stock alert for DK Clothings.',
    title: 'Low stock alert',
    bodyHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">Low stock alert</h1>
      <p style="margin:0 0 16px;">The following products are running low:</p>
      <ul style="margin:0;padding-left:20px;">${list}</ul>
      ${ctaButton(`${SITE_URL}/admin/inventory`, 'Manage inventory')}
    `,
    footerNote: 'Admin notification from DK Clothings store.',
  });
}
