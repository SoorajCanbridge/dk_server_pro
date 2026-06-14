import { Router } from 'express';
import { shippingRatesSchema, validatePincodeSchema, checkoutPreviewSchema } from '../shared/index.js';
import * as checkoutCtrl from '../controllers/checkout.controller.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.get('/info', asyncHandler(checkoutCtrl.getCheckoutInfo));
router.post('/shipping-rates', validateBody(shippingRatesSchema), asyncHandler(checkoutCtrl.getShippingRates));
router.post('/preview', validateBody(checkoutPreviewSchema), asyncHandler(checkoutCtrl.getCheckoutPreview));
router.post('/validate-pincode', validateBody(validatePincodeSchema), asyncHandler(checkoutCtrl.checkPincode));

export default router;
