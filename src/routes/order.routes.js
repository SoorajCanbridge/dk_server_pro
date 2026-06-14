import { Router } from 'express';
import {
  checkoutSchema, verifyPaymentSchema, updateShippingSchema, returnRequestSchema,
} from '../shared/index.js';
import * as orderCtrl from '../controllers/order.controller.js';
import { validateBody } from '../middleware/validate.js';
import { authenticate, requireRole, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';
import { ROLES } from '../shared/index.js';
import { redisRateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.get('/track/:id', asyncHandler(orderCtrl.trackOrder));
router.post('/', optionalAuth, redisRateLimit({ max: 5, keyPrefix: 'checkout' }), validateBody(checkoutSchema), asyncHandler(orderCtrl.createOrder));
router.post('/verify-payment', optionalAuth, validateBody(verifyPaymentSchema), asyncHandler(orderCtrl.verifyPayment));
router.get('/', authenticate, asyncHandler(orderCtrl.listOrders));
router.get('/:id', optionalAuth, asyncHandler(orderCtrl.getOrder));
router.post('/:id/return', authenticate, validateBody(returnRequestSchema), asyncHandler(orderCtrl.requestReturn));
router.patch('/:id/shipping', authenticate, requireRole(ROLES.ADMIN), validateBody(updateShippingSchema), asyncHandler(orderCtrl.updateShipping));
router.patch('/:id/cancel', authenticate, asyncHandler(orderCtrl.cancelOrder));

export default router;
