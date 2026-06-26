import { ROLES } from '../shared/index.js';
import { AppError } from './errors.js';

export function getGuestOrderToken(req) {
  return req.headers['x-guest-order-token'] || req.query?.token;
}

export function assertOrderAccess(req, order) {
  if (req.user) {
    if (req.user.role !== ROLES.CUSTOMER) return;
    if (order.userId?.toString() === req.user._id.toString()) return;
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  if (order.userId) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const token = getGuestOrderToken(req);
  if (!token || token !== order.guestAccessToken) {
    throw new AppError('Invalid or missing order access token', 403, 'FORBIDDEN');
  }
}
