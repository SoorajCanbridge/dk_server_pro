import { getShippingRate, validatePincode } from '../services/shipping.service.js';
import { calculateGST } from '../utils/gst.js';
import { config } from '../config/index.js';

export async function getCheckoutInfo(req, res) {
  res.json({
    success: true,
    data: {
      freeShippingAbove: config.freeShippingAbove,
      defaultShippingRate: config.defaultShippingRate,
    },
  });
}

export async function getShippingRates(req, res) {
  const { pincode, subtotal } = req.validated;
  const result = await getShippingRate(pincode, subtotal);
  res.json({ success: true, data: result });
}

export async function getCheckoutPreview(req, res) {
  const { pincode, subtotal, discount, shippingState, billingState } = req.validated;
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const { rate: shippingCost } = await getShippingRate(pincode, discountedSubtotal);
  const billing = billingState || shippingState;
  const gst = calculateGST(discountedSubtotal, shippingState, billing, config.gstRate);
  const total = discountedSubtotal + shippingCost + gst.total;

  res.json({
    success: true,
    data: {
      subtotal,
      discount,
      discountedSubtotal,
      shippingCost,
      shippingFree: shippingCost === 0,
      gst,
      total: Math.round(total * 100) / 100,
    },
  });
}

export async function checkPincode(req, res) {
  const { pincode } = req.validated;
  const result = await validatePincode(pincode);
  res.json({ success: true, data: result });
}
