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

async function deductOneLine(item, orderId) {
  const result = await Product.findOneAndUpdate(
    {
      _id: item.productId,
      variants: {
        $elemMatch: {
          sku: item.variantSku,
          stock: { $gte: item.quantity },
        },
      },
    },
    {
      $inc: {
        'variants.$[v].stock': -item.quantity,
        soldCount: item.quantity,
      },
    },
    {
      arrayFilters: [{ 'v.sku': item.variantSku, 'v.stock': { $gte: item.quantity } }],
      new: true,
    },
  );

  if (!result) return false;

  await logInventoryChange({
    variantSku: item.variantSku,
    productId: item.productId,
    delta: -item.quantity,
    reason: 'Order placed',
    orderId,
  });

  return true;
}

export async function deductOrderStock(items, orderId) {
  const deducted = [];

  try {
    for (const item of items) {
      const ok = await deductOneLine(item, orderId);
      if (!ok) {
        throw new AppError(`Insufficient stock for ${item.variantSku}`, 400, 'INSUFFICIENT_STOCK');
      }
      deducted.push(item);
    }
  } catch (err) {
    if (deducted.length) {
      await restoreOrderStock(deducted, orderId, 'Rollback — stock deduction failed');
    }
    throw err;
  }
}

export async function restoreOrderStock(items, orderId, reason = 'Order cancelled') {
  for (const item of items) {
    await Product.updateOne(
      {
        _id: item.productId,
        variants: { $elemMatch: { sku: item.variantSku } },
      },
      {
        $inc: {
          'variants.$[v].stock': item.quantity,
          soldCount: -item.quantity,
        },
      },
      { arrayFilters: [{ 'v.sku': item.variantSku }] },
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

export function shouldRestoreOrderStock(order) {
  if (order.inventoryDeducted === true) return true;
  if (order.inventoryDeducted === false) return false;
  // Legacy orders before inventoryDeducted existed deducted stock at creation
  return true;
}
