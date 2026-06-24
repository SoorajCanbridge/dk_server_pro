import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { buildOtpEmailHtml, buildPasswordResetEmailHtml } from './email-templates.js';
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

  // Gmail / Google Workspace SMTP (port 587 = STARTTLS)
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

export async function sendOrderConfirmationEmail(order, userEmail) {
  const items = order.items.map((i) =>
    `<tr><td>${i.title} (${i.size}/${i.color})</td><td>${i.quantity}</td><td>₹${i.price * i.quantity}</td></tr>`
  ).join('');

  return sendEmail({
    to: userEmail,
    subject: `Order Confirmed — ${order.orderNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Thank you for your order!</h2>
        <p>Order <strong>${order.orderNumber}</strong> has been placed successfully.</p>
        <table width="100%" cellpadding="8" style="border-collapse:collapse">
          <tr style="background:#f5f5f5"><th align="left">Item</th><th>Qty</th><th>Amount</th></tr>
          ${items}
        </table>
        <p><strong>Total: ₹${order.total}</strong></p>
        <p>We'll notify you when your order ships.</p>
      </div>
    `,
  });
}

export async function sendShipmentEmail(order, userEmail) {
  return sendEmail({
    to: userEmail,
    subject: `Your order ${order.orderNumber} has shipped`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Your order is on the way!</h2>
        <p>Order <strong>${order.orderNumber}</strong> has been shipped.</p>
        ${order.courier ? `<p>Courier: ${order.courier}</p>` : ''}
        ${order.trackingNumber ? `<p>Tracking: ${order.trackingNumber}</p>` : ''}
        ${order.trackingUrl ? `<p><a href="${order.trackingUrl}">Track your package</a></p>` : ''}
      </div>
    `,
  });
}

export async function sendNewsletterWelcomeEmail(email) {
  return sendEmail({
    to: email,
    subject: 'Welcome to DK Clothing',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>You're on the list!</h2>
        <p>Thanks for subscribing to DK Clothing. You'll be first to hear about new arrivals, exclusive deals, and style tips.</p>
        <p><a href="${config.clientUrl}/shop">Shop the latest collection</a></p>
      </div>
    `,
  });
}

export async function sendReviewRequestEmail(order, userEmail) {
  const { Product } = await import('../models/Product.js');
  const itemLinks = await Promise.all(order.items.map(async (i) => {
    const p = await Product.findById(i.productId).select('slug');
    const href = p?.slug
      ? `${config.clientUrl}/product/${p.slug}?review=1#reviews`
      : `${config.clientUrl}/account/orders`;
    return `<li><a href="${href}">${i.title}</a></li>`;
  }));
  const items = itemLinks.join('');

  return sendEmail({
    to: userEmail,
    subject: `How was your order ${order.orderNumber}?`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Your order has been delivered</h2>
        <p>We hope you love your purchase! Share your experience and help other shoppers:</p>
        <ul>${items}</ul>
        <p><a href="${config.clientUrl}/account/orders">View your orders</a></p>
      </div>
    `,
  });
}

export async function sendAbandonedCartEmail(email, items) {
  const itemList = items.map((i) => `<li>${i.title}</li>`).join('');
  return sendEmail({
    to: email,
    subject: 'You left something in your cart — DK Clothing',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Don't miss out!</h2>
        <p>Items waiting in your cart:</p>
        <ul>${itemList}</ul>
        <p><a href="${config.clientUrl}/cart">Complete your purchase</a></p>
      </div>
    `,
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

export async function sendLowStockAlertEmail(adminEmail, products) {
  const list = products.map((p) => `<li>${p.title} — SKU: ${p.sku} (${p.stock} left)</li>`).join('');
  return sendEmail({
    to: adminEmail,
    subject: 'Low Stock Alert — DK Clothing',
    html: `<h2>Low Stock Alert</h2><ul>${list}</ul>`,
  });
}
