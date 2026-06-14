import { Router } from 'express';
import {
  registerSchema, loginSchema, googleAuthSchema, verifyOtpSchema, forgotPasswordSchema,
  resetPasswordSchema, addressSchema, updateProfileSchema,
} from '../shared/index.js';
import * as authCtrl from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';
import { redisRateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.post('/register', redisRateLimit({ max: 5, keyPrefix: 'auth' }), validateBody(registerSchema), asyncHandler(authCtrl.register));
router.post('/verify-otp', validateBody(verifyOtpSchema), asyncHandler(authCtrl.verifyOtp));
router.post('/login', redisRateLimit({ max: 10, keyPrefix: 'auth' }), validateBody(loginSchema), asyncHandler(authCtrl.login));
router.post('/google', redisRateLimit({ max: 10, keyPrefix: 'auth' }), validateBody(googleAuthSchema), asyncHandler(authCtrl.googleAuth));
router.post('/refresh', asyncHandler(authCtrl.refresh));
router.post('/logout', authenticate, asyncHandler(authCtrl.logout));
router.post('/forgot-password', validateBody(forgotPasswordSchema), asyncHandler(authCtrl.forgotPassword));
router.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(authCtrl.resetPassword));

router.get('/profile', authenticate, asyncHandler(authCtrl.getProfile));
router.patch('/profile', authenticate, validateBody(updateProfileSchema), asyncHandler(authCtrl.updateProfile));
router.post('/addresses', authenticate, validateBody(addressSchema), asyncHandler(authCtrl.addAddress));
router.patch('/addresses/:addressId', authenticate, validateBody(addressSchema), asyncHandler(authCtrl.updateAddress));
router.delete('/addresses/:addressId', authenticate, asyncHandler(authCtrl.deleteAddress));

export default router;
