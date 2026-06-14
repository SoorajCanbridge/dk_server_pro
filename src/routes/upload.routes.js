import { Router } from 'express';
import * as uploadCtrl from '../controllers/upload.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';
import { ROLES } from '../shared/index.js';

const router = Router();

router.post('/presign', authenticate, requireRole(ROLES.ADMIN), asyncHandler(uploadCtrl.getPresignedUrl));
router.post('/review-presign', authenticate, asyncHandler(uploadCtrl.getReviewPresignedUrl));

export default router;
