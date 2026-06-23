import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import cartRoutes from './cart.routes.js';
import orderRoutes from './order.routes.js';
import wishlistRoutes from './wishlist.routes.js';
import reviewRoutes from './review.routes.js';
import checkoutRoutes from './checkout.routes.js';
import adminRoutes from './admin.routes.js';
import * as adminCtrl from '../controllers/admin.controller.js';
import * as configCtrl from '../controllers/config.controller.js';
import { config } from '../config/index.js';
import { asyncHandler } from '../utils/errors.js';
import uploadRoutes from './upload.routes.js';
import newsletterRoutes from './newsletter.routes.js';
import webhookRoutes from './webhook.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/reviews', reviewRoutes);
router.use('/checkout', checkoutRoutes);
router.get('/banners', asyncHandler(adminCtrl.getPublicBanners));
router.get('/config/public', asyncHandler(configCtrl.getPublicConfig));
router.use('/admin', adminRoutes);
router.use('/upload', uploadRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/webhooks', webhookRoutes);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'DK Clothing API is running',
    data: {
      googleClientId: config.google.clientId || '',
    },
  });
});

export default router;
