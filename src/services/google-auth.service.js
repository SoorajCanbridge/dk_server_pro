import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/index.js';
import { AppError } from '../utils/errors.js';

let client;

function getClient() {
  if (!config.google.clientId) {
    throw new AppError('Google Sign-In is not configured', 503, 'GOOGLE_NOT_CONFIGURED');
  }
  if (!client) {
    client = new OAuth2Client(config.google.clientId);
  }
  return client;
}

export async function verifyGoogleIdToken(idToken) {
  const ticket = await getClient().verifyIdToken({
    idToken,
    audience: config.google.clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new AppError('Invalid Google token', 401, 'INVALID_GOOGLE_TOKEN');
  }
  if (!payload.email_verified) {
    throw new AppError('Google email is not verified', 400, 'EMAIL_NOT_VERIFIED');
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split('@')[0],
    avatar: payload.picture,
  };
}
