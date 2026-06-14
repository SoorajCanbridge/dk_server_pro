import { COUPON_TYPE } from '../shared/index.js';
import { Coupon } from '../models/Coupon.js';
import { AppError } from '../utils/errors.js';

export async function validateCoupon(code, userId, subtotal, categoryIds = []) {
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon) throw new AppError('Invalid coupon code', 400, 'INVALID_COUPON');

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new AppError('Coupon has expired', 400, 'COUPON_EXPIRED');
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    throw new AppError('Coupon usage limit reached', 400, 'COUPON_LIMIT');
  }

  if (subtotal < coupon.minCartValue) {
    throw new AppError(`Minimum cart value ₹${coupon.minCartValue} required`, 400, 'MIN_CART');
  }

  if (coupon.categoryIds.length > 0) {
    const hasMatch = categoryIds.some((id) =>
      coupon.categoryIds.some((cid) => cid.toString() === id.toString())
    );
    if (!hasMatch) throw new AppError('Coupon not valid for items in cart', 400, 'COUPON_CATEGORY');
  }

  if (userId) {
    const userUsage = coupon.usedBy.filter((id) => id.toString() === userId.toString()).length;
    if (userUsage >= coupon.perUserLimit) {
      throw new AppError('You have already used this coupon', 400, 'COUPON_USED');
    }
  }

  let discount = 0;
  if (coupon.type === COUPON_TYPE.PERCENTAGE) {
    discount = (subtotal * coupon.value) / 100;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = coupon.value;
  }

  discount = Math.min(discount, subtotal);
  return { coupon, discount: Math.round(discount * 100) / 100 };
}

export async function applyCouponUsage(couponId, userId) {
  await Coupon.findByIdAndUpdate(couponId, {
    $inc: { usageCount: 1 },
    $push: { usedBy: userId },
  });
}
