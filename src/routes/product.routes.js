import { Router } from 'express';
import { paginatedListSchema, productQuerySchema } from '../shared/index.js';
import * as productCtrl from '../controllers/product.controller.js';
import { validateQuery } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { productImageUpload, parseProductMultipart } from '../middleware/productUpload.js';
import { asyncHandler } from '../utils/errors.js';
import { ROLES } from '../shared/index.js';

const router = Router();

router.get('/', validateQuery(productQuerySchema), asyncHandler(productCtrl.listProducts));
router.get('/featured', asyncHandler(productCtrl.getFeatured));
router.get('/new-arrivals', validateQuery(paginatedListSchema), asyncHandler(productCtrl.getNewArrivals));
router.get('/hot-deals', validateQuery(paginatedListSchema), asyncHandler(productCtrl.getHotDeals));
router.get('/search', asyncHandler(productCtrl.searchProducts));
router.get('/:slug', asyncHandler(productCtrl.getProduct));

router.post('/', authenticate, requireRole(ROLES.ADMIN), productImageUpload, parseProductMultipart, asyncHandler(productCtrl.createProduct));
router.patch('/:id', authenticate, requireRole(ROLES.ADMIN), productImageUpload, parseProductMultipart, asyncHandler(productCtrl.updateProduct));
router.delete('/:id', authenticate, requireRole(ROLES.ADMIN), asyncHandler(productCtrl.deleteProduct));
router.patch('/:id/inventory', authenticate, requireRole(ROLES.ADMIN), asyncHandler(productCtrl.adjustInventory));

export default router;
