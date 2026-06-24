import { config } from '../config/index.js';

const BRAND = 'DK Clothings';
const ACCENT = '#c9a96e';

function emailLayout({ preheader, title, bodyHtml, footerNote }) {
  const siteUrl = config.clientUrl || 'https://www.dkclothings.com';

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
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;">
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
              ${footerNote || `You received this email because an action was requested on your ${BRAND} account.`}
              <br /><br />
              <a href="${siteUrl}" style="color:#111111;text-decoration:underline;">Visit ${BRAND}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildOtpEmailHtml({ name, otp, purpose = 'verify your email address', expiryMinutes = 5 }) {
  const greeting = name ? `Hello ${name},` : 'Hello,';

  return emailLayout({
    preheader: `Your verification code is ${otp}. It expires in ${expiryMinutes} minutes.`,
    title: 'Verify your email',
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:20px;color:#111111;">Verify your email</h1>
      <p style="margin:0 0 20px;">${greeting}</p>
      <p style="margin:0 0 24px;">Use the verification code below to ${purpose}:</p>
      <div style="text-align:center;margin:0 0 24px;padding:20px;background:#fafafa;border:1px solid #e5e7eb;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6b7280;">Verification code</p>
        <p style="margin:0;font-size:34px;font-weight:700;letter-spacing:0.35em;color:#111111;font-family:Consolas,Monaco,monospace;">${otp}</p>
      </div>
      <p style="margin:0 0 12px;font-size:14px;"><strong>This code expires in ${expiryMinutes} minutes.</strong></p>
      <p style="margin:0;font-size:13px;color:#6b7280;">If you did not request this, you can safely ignore this email. Never share this code with anyone.</p>
    `,
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
  });
}
