import { Router } from 'express';
import * as webhookCtrl from '../controllers/webhook.controller.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.post('/razorpay', asyncHandler(webhookCtrl.razorpayWebhook));

export default router;
