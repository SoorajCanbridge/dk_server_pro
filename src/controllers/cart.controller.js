import {
  getGuestCart, saveGuestCart, getUserCart, resolveCartItems,
} from '../services/cart.service.js';
import { validateCoupon } from '../services/coupon.service.js';
import { queueAbandonedCart } from '../services/queue.service.js';
import { AppError } from '../utils/errors.js';

async function scheduleAbandonedCartReminder(user, cartItems) {
  if (!user?.email || !cartItems.length) return;
  try {
    const { items } = await resolveCartItems(cartItems);
    await queueAbandonedCart(
      user._id.toString(),
      user.email,
      items.map((i) => ({ title: i.title })),
    );
  } catch {
    // non-blocking
  }
}

function getSessionId(req) {
  return req.headers['x-session-id'] || req.cookies?.sessionId;
}

async function persistRawCart(req, items, couponCode) {
  if (req.user) {
    const cart = await getUserCart(req.user._id);
    cart.items = items;
    if (couponCode !== undefined) cart.couponCode = couponCode;
    await cart.save();
    return;
  }

  const sessionId = getSessionId(req);
  if (!sessionId) return;

  const cart = await getGuestCart(sessionId);
  cart.items = items;
  if (couponCode !== undefined) cart.couponCode = couponCode;
  await saveGuestCart(sessionId, cart);
}

export async function getCart(req, res) {
  let rawCart;
  if (req.user) {
    rawCart = await getUserCart(req.user._id);
    rawCart = { items: rawCart.items, couponCode: rawCart.couponCode };
  } else {
    const sessionId = getSessionId(req);
    if (!sessionId) return res.json({ success: true, data: { items: [], subtotal: 0, total: 0 } });
    rawCart = await getGuestCart(sessionId);
  }

  if (!rawCart.items.length) {
    return res.json({ success: true, data: { items: [], subtotal: 0, total: 0, couponCode: rawCart.couponCode } });
  }

  const { items, subtotal, categoryIds, removed, keptRawItems } = await resolveCartItems(rawCart.items, { strict: false });

  if (removed.length) {
    const couponCode = items.length ? rawCart.couponCode : null;
    await persistRawCart(req, keptRawItems, couponCode);
    rawCart.couponCode = couponCode;
  }

  if (!items.length) {
    return res.json({
      success: true,
      data: {
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        couponCode: null,
        removed,
      },
    });
  }

  let discount = 0;

  if (rawCart.couponCode) {
    try {
      const result = await validateCoupon(rawCart.couponCode, req.user?._id, subtotal, categoryIds);
      discount = result.discount;
    } catch {
      rawCart.couponCode = null;
      await persistRawCart(req, keptRawItems, null);
    }
  }

  res.json({
    success: true,
    data: {
      items,
      subtotal,
      discount,
      total: subtotal - discount,
      couponCode: rawCart.couponCode,
      removed,
    },
  });
}

export async function addToCart(req, res) {
  const { productId, variantSku, quantity } = req.validated;
  await resolveCartItems([{ productId, variantSku, quantity: 1 }]);

  if (req.user) {
    const cart = await getUserCart(req.user._id);
    const existing = cart.items.find((i) => i.variantSku === variantSku);
    if (existing) existing.quantity += quantity;
    else cart.items.push({ productId, variantSku, quantity });
    await cart.save();
    scheduleAbandonedCartReminder(req.user, cart.items);
  } else {
    const sessionId = getSessionId(req);
    if (!sessionId) throw new AppError('Session ID required', 400, 'SESSION_REQUIRED');
    const cart = await getGuestCart(sessionId);
    const existing = cart.items.find((i) => i.variantSku === variantSku);
    if (existing) existing.quantity += quantity;
    else cart.items.push({ productId, variantSku, quantity });
    await saveGuestCart(sessionId, cart);
  }

  res.status(201).json({ success: true, message: 'Added to cart' });
}

export async function updateCartItem(req, res) {
  const { quantity } = req.body;
  const { variantSku } = req.params;

  if (req.user) {
    const cart = await getUserCart(req.user._id);
    const item = cart.items.find((i) => i.variantSku === variantSku);
    if (!item) throw new AppError('Item not in cart', 404, 'NOT_FOUND');
    if (quantity <= 0) cart.items = cart.items.filter((i) => i.variantSku !== variantSku);
    else item.quantity = quantity;
    await cart.save();
  } else {
    const sessionId = getSessionId(req);
    const cart = await getGuestCart(sessionId);
    const item = cart.items.find((i) => i.variantSku === variantSku);
    if (!item) throw new AppError('Item not in cart', 404, 'NOT_FOUND');
    if (quantity <= 0) cart.items = cart.items.filter((i) => i.variantSku !== variantSku);
    else item.quantity = quantity;
    await saveGuestCart(sessionId, cart);
  }

  res.json({ success: true, message: 'Cart updated' });
}

export async function removeFromCart(req, res) {
  const { variantSku } = req.params;

  if (req.user) {
    const cart = await getUserCart(req.user._id);
    cart.items = cart.items.filter((i) => i.variantSku !== variantSku);
    await cart.save();
  } else {
    const sessionId = getSessionId(req);
    const cart = await getGuestCart(sessionId);
    cart.items = cart.items.filter((i) => i.variantSku !== variantSku);
    await saveGuestCart(sessionId, cart);
  }

  res.json({ success: true, message: 'Item removed' });
}

export async function applyCoupon(req, res) {
  const { code } = req.validated;

  let rawCart;
  if (req.user) {
    const cart = await getUserCart(req.user._id);
    rawCart = { items: cart.items, couponCode: cart.couponCode };
  } else {
    const sessionId = getSessionId(req);
    rawCart = await getGuestCart(sessionId);
  }

  const { subtotal, categoryIds, removed, keptRawItems } = await resolveCartItems(rawCart.items, { strict: false });
  if (removed.length) {
    await persistRawCart(req, keptRawItems, rawCart.couponCode);
  }
  if (!keptRawItems.length) throw new AppError('Cart is empty', 400, 'EMPTY_CART');

  const { coupon, discount } = await validateCoupon(code, req.user?._id, subtotal, categoryIds);

  if (req.user) {
    const cart = await getUserCart(req.user._id);
    cart.couponCode = coupon.code;
    await cart.save();
  } else {
    const sessionId = getSessionId(req);
    rawCart.couponCode = coupon.code;
    await saveGuestCart(sessionId, rawCart);
  }

  res.json({ success: true, data: { code: coupon.code, discount, total: subtotal - discount } });
}
