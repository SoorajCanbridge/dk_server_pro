import { Router } from 'express';
import * as newsletterCtrl from '../controllers/newsletter.controller.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.post('/subscribe', asyncHandler(newsletterCtrl.subscribe));

export default router;
