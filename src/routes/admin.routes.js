import { Router } from 'express';
import { couponSchema, curationUpdateSchema } from '../shared/index.js';
import * as adminCtrl from '../controllers/admin.controller.js';
import * as reviewCtrl from '../controllers/review.controller.js';
import { validateBody } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { bannerImageUpload, parseBannerMultipart } from '../middleware/bannerUpload.js';
import { asyncHandler } from '../utils/errors.js';
import { ROLES } from '../shared/index.js';

const router = Router();

router.get('/banners/public', asyncHandler(adminCtrl.getPublicBanners));

router.use(authenticate, requireRole(ROLES.ADMIN));

router.get('/dashboard', asyncHandler(adminCtrl.getDashboard));
router.get('/products', asyncHandler(adminCtrl.listProductsAdmin));
router.get('/products/:id', asyncHandler(adminCtrl.getProductAdmin));
router.get('/reviews', asyncHandler(reviewCtrl.listReviewsAdmin));
router.patch('/reviews/:id/moderate', asyncHandler(reviewCtrl.moderateReview));
router.delete('/reviews/:id', asyncHandler(reviewCtrl.deleteReview));

router.get('/curations/:type', asyncHandler(adminCtrl.listCurationProducts));
router.post('/curations/:type/products/:productId', asyncHandler(adminCtrl.addCurationProduct));
router.delete('/curations/:type/products/:productId', asyncHandler(adminCtrl.removeCurationProduct));
router.patch('/curations/:type', validateBody(curationUpdateSchema), asyncHandler(adminCtrl.updateCurationProducts));
router.get('/orders', asyncHandler(adminCtrl.listOrdersAdmin));
router.patch('/orders/:id/return', asyncHandler(adminCtrl.handleReturnRequest));
router.patch('/orders/:id/payment', asyncHandler(adminCtrl.updateOrderPayment));
router.patch('/orders/:id/cancel', asyncHandler(adminCtrl.adminCancelOrder));
router.get('/customers', asyncHandler(adminCtrl.listCustomers));
router.get('/customers/:id', asyncHandler(adminCtrl.getCustomerDetail));
router.get('/inventory', asyncHandler(adminCtrl.listInventoryStock));
router.get('/inventory-logs', asyncHandler(adminCtrl.listInventoryLogs));
router.get('/reports/sales', asyncHandler(adminCtrl.getSalesReport));
router.get('/settings', asyncHandler(adminCtrl.getSettings));
router.patch('/settings', asyncHandler(adminCtrl.updateSettings));

router.get('/coupons', asyncHandler(adminCtrl.listCoupons));
router.post('/coupons', validateBody(couponSchema), asyncHandler(adminCtrl.createCoupon));
router.patch('/coupons/:id', asyncHandler(adminCtrl.updateCoupon));
router.delete('/coupons/:id', asyncHandler(adminCtrl.deleteCoupon));

router.get('/banners', asyncHandler(adminCtrl.listBanners));
router.post('/banners', bannerImageUpload, parseBannerMultipart, asyncHandler(adminCtrl.createBanner));
router.patch('/banners/:id', bannerImageUpload, parseBannerMultipart, asyncHandler(adminCtrl.updateBanner));
router.delete('/banners/:id', asyncHandler(adminCtrl.deleteBanner));

router.get('/shipping-zones', asyncHandler(adminCtrl.listShippingZones));
router.post('/shipping-zones', asyncHandler(adminCtrl.createShippingZone));
router.patch('/shipping-zones/:id', asyncHandler(adminCtrl.updateShippingZone));
router.delete('/shipping-zones/:id', asyncHandler(adminCtrl.deleteShippingZone));

export default router;
