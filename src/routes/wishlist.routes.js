import { Router } from 'express';
import * as wishlistCtrl from '../controllers/wishlist.controller.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(wishlistCtrl.getWishlist));
router.post('/', asyncHandler(wishlistCtrl.addToWishlist));
router.delete('/:productId', asyncHandler(wishlistCtrl.removeFromWishlist));

export default router;
