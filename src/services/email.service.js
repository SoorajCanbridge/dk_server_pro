import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import {
  buildOtpEmailHtml,
  buildPasswordResetEmailHtml,
  buildOrderConfirmationEmailHtml,
  buildOrderPlacedEmailHtml,
  buildOrderPackedEmailHtml,
  buildShipmentEmailHtml,
  buildDeliveryEmailHtml,
  buildReviewRequestEmailHtml,
  buildOrderCancelledEmailHtml,
  buildRefundEmailHtml,
  buildReturnRequestedEmailHtml,
  buildReturnApprovedEmailHtml,
  buildReturnRejectedEmailHtml,
  buildPaymentFailedEmailHtml,
  buildCodPaymentConfirmedEmailHtml,
  buildAbandonedCartEmailHtml,
  buildNewsletterWelcomeEmailHtml,
  buildNewOrderAdminEmailHtml,
  buildReturnRequestAdminEmailHtml,
  buildLowStockAlertEmailHtml,
} from './email-templates.js';
import { getOrderCustomerEmail, getOrderCustomerName } from '../utils/order-email.js';
import { OTP_TTL_MINUTES } from '../utils/registration.js';

let transporter = null;

function buildTransportOptions() {
  const { host, port, secure, user, pass } = config.smtp;
  const options = {
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  };

  if (host?.includes('gmail.com') || host?.includes('googlemail.com')) {
    options.secure = port === 465;
    options.requireTLS = port === 587;
    options.tls = { minVersion: 'TLSv1.2' };
  }

  return options;
}

function getTransporter() {
  if (!transporter && config.smtp.host) {
    transporter = nodemailer.createTransport(buildTransportOptions());
  }
  return transporter;
}

function formatEmailError(err) {
  const message = err?.message || '';
  if (message.includes('535') || message.includes('BadCredentials') || message.includes('Username and Password not accepted')) {
    return 'Email server rejected the login. For Gmail, use an App Password (not your normal password) in SMTP_PASS.';
  }
  return message || 'Email delivery failed';
}

export async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[Email DEV] To: ${to} | Subject: ${subject}`);
    return { messageId: 'dev-mode' };
  }

  try {
    return await transport.sendMail({
      from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });
  } catch (err) {
    const friendly = formatEmailError(err);
    console.error('[Email] Send failed:', friendly);
    throw new Error(friendly);
  }
}

export async function sendOtpEmail(email, otp, name = '') {
  const html = buildOtpEmailHtml({
    name,
    otp,
    purpose: 'complete your DK Clothings account registration',
    expiryMinutes: OTP_TTL_MINUTES,
  });

  return sendEmail({
    to: email,
    subject: `${otp} is your DK Clothings verification code`,
    html,
    text: `Your DK Clothings verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
  });
}

export async function sendPasswordResetEmail(email, otp) {
  const html = buildPasswordResetEmailHtml({ otp, expiryMinutes: OTP_TTL_MINUTES });

  return sendEmail({
    to: email,
    subject: `${otp} is your DK Clothings password reset code`,
    html,
    text: `Your DK Clothings password reset code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
  });
}

export async function sendOrderConfirmationEmail(order, userEmail) {
  const name = await getOrderCustomerName(order);
  return sendEmail({
    to: userEmail,
    subject: `Thank you for your purchase — Order ${order.orderNumber}`,
    html: buildOrderConfirmationEmailHtml(order, name),
  });
}

export async function sendOrderPlacedEmail(order, userEmail) {
  const name = await getOrderCustomerName(order);
  return sendEmail({
    to: userEmail,
    subject: `Order received — ${order.orderNumber}`,
    html: buildOrderPlacedEmailHtml(order, name),
  });
}

export async function sendOrderPackedEmail(order, userEmail) {
  const name = await getOrderCustomerName(order);
  return sendEmail({
    to: userEmail,
    subject: `Order packed — ${order.orderNumber}`,
    html: buildOrderPackedEmailHtml(order, name),
  });
}

export async function sendShipmentEmail(order, userEmail) {
  const name = await getOrderCustomerName(order);
  return sendEmail({
    to: userEmail,
    subject: `Your order ${order.orderNumber} has shipped`,
    html: buildShipmentEmailHtml(order, name),
  });
}

export async function sendDeliveryEmail(order, userEmail) {
  const name = await getOrderCustomerName(order);
  return sendEmail({
    to: userEmail,
    subject: `Order delivered — ${order.orderNumber}`,
    html: buildDeliveryEmailHtml(order, name),
  });
}

export async function sendReviewRequestEmail(order, userEmail) {
  const { Product } = await import('../models/Product.js');
  const name = await getOrderCustomerName(order);
  const itemLinks = await Promise.all(order.items.map(async (i) => {
    const p = await Product.findById(i.productId).select('slug');
    const href = p?.slug
      ? `${config.clientUrl}/product/${p.slug}?review=1#reviews`
      : `${config.clientUrl}/account/orders`;
    return `<li><a href="${href}" style="color:#111111;">${i.title}</a></li>`;
  }));

  return sendEmail({
    to: userEmail,
    subject: `How was your order ${order.orderNumber}?`,
    html: buildReviewRequestEmailHtml(order, itemLinks.join(''), name),
  });
}

export async function sendOrderCancelledEmail(order, userEmail, reason = '') {
  const name = await getOrderCustomerName(order);
  return sendEmail({
    to: userEmail,
    subject: `Order cancelled — ${order.orderNumber}`,
    html: buildOrderCancelledEmailHtml(order, name, reason),
  });
}

export async function sendRefundEmail(order, userEmail, amount) {
  const name = await getOrderCustomerName(order);
  return sendEmail({
    to: userEmail,
    subject: `Refund processed — ${order.orderNumber}`,
    html: buildRefundEmailHtml(order, name, amount),
  });
}

export async function sendReturnRequestedEmail(order, userEmail) {
  const name = await getOrderCustomerName(order);
  return sendEmail({
    to: userEmail,
    subject: `Return request received — ${order.orderNumber}`,
    html: buildReturnRequestedEmailHtml(order, name),
  });
}

export async function sendReturnApprovedEmail(order, userEmail) {
  const name = await getOrderCustomerName(order);
  return sendEmail({
    to: userEmail,
    subject: `Return approved — ${order.orderNumber}`,
    html: buildReturnApprovedEmailHtml(order, name),
  });
}

export async function sendReturnRejectedEmail(order, userEmail, note = '') {
  const name = await getOrderCustomerName(order);
  return sendEmail({
    to: userEmail,
    subject: `Return request update — ${order.orderNumber}`,
    html: buildReturnRejectedEmailHtml(order, name, note),
  });
}

export async function sendPaymentFailedEmail(order, userEmail) {
  const name = await getOrderCustomerName(order);
  return sendEmail({
    to: userEmail,
    subject: `Payment failed — ${order.orderNumber}`,
    html: buildPaymentFailedEmailHtml(order, name),
  });
}

export async function sendCodPaymentConfirmedEmail(order, userEmail) {
  const name = await getOrderCustomerName(order);
  return sendEmail({
    to: userEmail,
    subject: `Payment received — ${order.orderNumber}`,
    html: buildCodPaymentConfirmedEmailHtml(order, name),
  });
}

export async function sendAbandonedCartEmail(email, items, customerName = '') {
  return sendEmail({
    to: email,
    subject: 'You left something in your cart — DK Clothings',
    html: buildAbandonedCartEmailHtml(items, customerName),
  });
}

export async function sendNewsletterWelcomeEmail(email) {
  return sendEmail({
    to: email,
    subject: 'Welcome to DK Clothings',
    html: buildNewsletterWelcomeEmailHtml(),
  });
}

export async function sendNewOrderAdminEmail(order) {
  const adminEmail = config.adminEmail;
  if (!adminEmail) return null;

  return sendEmail({
    to: adminEmail,
    subject: `[New order] ${order.orderNumber} — ₹${order.total}`,
    html: buildNewOrderAdminEmailHtml(order),
  });
}

export async function sendReturnRequestAdminEmail(order) {
  const adminEmail = config.adminEmail;
  if (!adminEmail) return null;

  return sendEmail({
    to: adminEmail,
    subject: `[Return request] ${order.orderNumber}`,
    html: buildReturnRequestAdminEmailHtml(order),
  });
}

export async function sendLowStockAlertEmail(adminEmail, products) {
  return sendEmail({
    to: adminEmail,
    subject: 'Low Stock Alert — DK Clothings',
    html: buildLowStockAlertEmailHtml(products),
  });
}

/** Try queue first; fall back to direct send when Redis/worker is unavailable. */
export async function dispatchOrderEmail(queueFn, sendFn, orderId, email, ...extraArgs) {
  try {
    await queueFn(orderId, email, ...extraArgs);
  } catch {
    const { Order } = await import('../models/Order.js');
    const order = await Order.findById(orderId);
    if (order) await sendFn(order, email, ...extraArgs);
  }
}

export async function notifyOrderCustomer(order, queueFn, sendFn, ...extraArgs) {
  const email = await getOrderCustomerEmail(order);
  if (!email) return;
  await dispatchOrderEmail(queueFn, sendFn, order._id, email, ...extraArgs);
}

export async function notifyAdmin(queueFn, sendFn, orderId) {
  try {
    await queueFn(orderId);
  } catch {
    const { Order } = await import('../models/Order.js');
    const order = await Order.findById(orderId);
    if (order) await sendFn(order);
  }
}
