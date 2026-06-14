import { Router } from 'express';
import { cartItemSchema, applyCouponSchema } from '../shared/index.js';
import * as cartCtrl from '../controllers/cart.controller.js';
import { validateBody } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.use(optionalAuth);

router.get('/', asyncHandler(cartCtrl.getCart));
router.post('/', validateBody(cartItemSchema), asyncHandler(cartCtrl.addToCart));
router.patch('/:variantSku', asyncHandler(cartCtrl.updateCartItem));
router.delete('/:variantSku', asyncHandler(cartCtrl.removeFromCart));
router.post('/apply-coupon', validateBody(applyCouponSchema), asyncHandler(cartCtrl.applyCoupon));

export default router;
