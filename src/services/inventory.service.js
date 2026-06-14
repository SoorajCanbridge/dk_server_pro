import { Product } from '../models/Product.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { AppError } from '../utils/errors.js';

export async function logInventoryChange({
  variantSku,
  productId,
  delta,
  reason,
  adminId,
  orderId,
}) {
  await InventoryLog.create({
    variantSku,
    productId,
    delta,
    reason,
    adminId: adminId || undefined,
    orderId: orderId || undefined,
  });
}

export async function adjustVariantStock({
  productId,
  variantSku,
  delta,
  reason,
  adminId,
  orderId,
}) {
  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

  const variant = product.variants.find((v) => v.sku === variantSku);
  if (!variant) throw new AppError('Variant not found', 404, 'NOT_FOUND');

  if (delta < 0 && variant.stock + delta < 0) {
    throw new AppError(`Insufficient stock for ${variantSku}`, 400, 'INSUFFICIENT_STOCK');
  }

  variant.stock = Math.max(0, variant.stock + delta);
  await product.save();

  await logInventoryChange({
    variantSku,
    productId: product._id,
    delta,
    reason,
    adminId,
    orderId,
  });

  return product;
}

export async function deductOrderStock(items, orderId) {
  for (const item of items) {
    const result = await Product.findOneAndUpdate(
      {
        _id: item.productId,
        'variants.sku': item.variantSku,
        'variants.stock': { $gte: item.quantity },
      },
      { $inc: { 'variants.$.stock': -item.quantity, soldCount: item.quantity } },
      { new: true }
    );

    if (!result) {
      throw new AppError(`Insufficient stock for ${item.variantSku}`, 400, 'INSUFFICIENT_STOCK');
    }

    await logInventoryChange({
      variantSku: item.variantSku,
      productId: item.productId,
      delta: -item.quantity,
      reason: 'Order placed',
      orderId,
    });
  }
}

export async function restoreOrderStock(items, orderId, reason = 'Order cancelled') {
  for (const item of items) {
    await Product.updateOne(
      { _id: item.productId, 'variants.sku': item.variantSku },
      { $inc: { 'variants.$.stock': item.quantity, soldCount: -item.quantity } }
    );

    await logInventoryChange({
      variantSku: item.variantSku,
      productId: item.productId,
      delta: item.quantity,
      reason,
      orderId,
    });
  }
}
