import { getRedis } from '../config/redis.js';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { AppError } from '../utils/errors.js';
import { PRODUCT_STATUS } from '../shared/index.js';

const CART_TTL = 30 * 24 * 60 * 60;

function cartKey(sessionId) {
  return `cart:${sessionId}`;
}

export async function getGuestCart(sessionId) {
  const redis = getRedis();
  const data = await redis.get(cartKey(sessionId));
  return data ? JSON.parse(data) : { items: [], couponCode: null };
}

export async function saveGuestCart(sessionId, cart) {
  const redis = getRedis();
  await redis.set(cartKey(sessionId), JSON.stringify(cart), 'EX', CART_TTL);
}

export async function clearGuestCart(sessionId) {
  if (!sessionId) return;
  await saveGuestCart(sessionId, { items: [], couponCode: null });
}

export async function getUserCart(userId) {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = await Cart.create({ userId, items: [] });
  }
  return cart;
}

export async function mergeGuestCart(sessionId, userId) {
  const guestCart = await getGuestCart(sessionId);
  if (!guestCart.items.length) return getUserCart(userId);

  const userCart = await getUserCart(userId);
  for (const item of guestCart.items) {
    const existing = userCart.items.find((i) => i.variantSku === item.variantSku);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      userCart.items.push(item);
    }
  }
  if (guestCart.couponCode) userCart.couponCode = guestCart.couponCode;
  await userCart.save();
  await getRedis().del(cartKey(sessionId));
  return userCart;
}

export async function resolveCartItems(items) {
  const resolved = [];
  let subtotal = 0;
  const categoryIds = new Set();

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product || product.status !== PRODUCT_STATUS.ACTIVE) {
      throw new AppError('Product no longer available', 400, 'PRODUCT_UNAVAILABLE');
    }

    const variant = product.variants.find((v) => v.sku === item.variantSku);
    if (!variant) throw new AppError(`Variant ${item.variantSku} not found`, 400, 'VARIANT_NOT_FOUND');
    if (variant.stock < item.quantity) {
      throw new AppError(`Insufficient stock for ${product.title} (${variant.size})`, 400, 'INSUFFICIENT_STOCK');
    }

    const lineTotal = variant.price * item.quantity;
    subtotal += lineTotal;
    categoryIds.add(product.categoryId.toString());

    resolved.push({
      productId: product._id,
      title: product.title,
      variantSku: variant.sku,
      color: variant.color,
      size: variant.size,
      price: variant.price,
      quantity: item.quantity,
      image: variant.images[0] || null,
      categoryId: product.categoryId,
    });
  }

  return { items: resolved, subtotal, categoryIds: [...categoryIds] };
}
