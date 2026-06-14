import { Router } from 'express';
import { reviewSchema } from '../shared/index.js';
import * as reviewCtrl from '../controllers/review.controller.js';
import { validateBody } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';
import { ROLES } from '../shared/index.js';

const router = Router();

router.get('/product/:productId', asyncHandler(reviewCtrl.getProductReviews));
router.get('/product/:productId/mine', authenticate, asyncHandler(reviewCtrl.getMyProductReview));
router.post('/product/:productId', authenticate, validateBody(reviewSchema), asyncHandler(reviewCtrl.createReview));
router.patch('/:id', authenticate, validateBody(reviewSchema), asyncHandler(reviewCtrl.updateMyReview));

router.get('/', authenticate, requireRole(ROLES.ADMIN), asyncHandler(reviewCtrl.listReviewsAdmin));
router.patch('/:id/moderate', authenticate, requireRole(ROLES.ADMIN), asyncHandler(reviewCtrl.moderateReview));
router.delete('/:id', authenticate, requireRole(ROLES.ADMIN), asyncHandler(reviewCtrl.deleteReview));

export default router;
