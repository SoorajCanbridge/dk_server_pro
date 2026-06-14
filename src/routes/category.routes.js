import { Router } from 'express';
import * as categoryCtrl from '../controllers/category.controller.js';
import { categoryImageUpload, parseCategoryMultipart } from '../middleware/categoryUpload.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';
import { ROLES } from '../shared/index.js';

const router = Router();

router.get('/', asyncHandler(categoryCtrl.listCategories));
router.get('/:slug/products', asyncHandler(categoryCtrl.getCategoryProducts));
router.post('/', authenticate, requireRole(ROLES.ADMIN), categoryImageUpload, parseCategoryMultipart, asyncHandler(categoryCtrl.createCategory));
router.patch('/:id', authenticate, requireRole(ROLES.ADMIN), categoryImageUpload, parseCategoryMultipart, asyncHandler(categoryCtrl.updateCategory));
router.delete('/:id', authenticate, requireRole(ROLES.ADMIN), asyncHandler(categoryCtrl.deleteCategory));

export default router;
