export const OTP_TTL = 300;
export const OTP_TTL_MINUTES = OTP_TTL / 60;

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function otpKey(email) {
  return `otp:${normalizeEmail(email)}`;
}

export function pendingRegisterKey(email) {
  return `pending-register:${normalizeEmail(email)}`;
}

export function resendCooldownKey(email) {
  return `otp-cooldown:${normalizeEmail(email)}`;
}

export const RESEND_COOLDOWN_SEC = 60;
