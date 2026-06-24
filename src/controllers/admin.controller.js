import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { Coupon } from '../models/Coupon.js';
import { Banner } from '../models/Banner.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { ShippingZone } from '../models/ShippingZone.js';
import { getSetting, setSetting } from '../models/Settings.js';
import { Review } from '../models/Review.js';
import { PAYMENT_STATUS, ORDER_STATUS, PRODUCT_STATUS, REVIEW_STATUS } from '../shared/index.js';
import { AppError } from '../utils/errors.js';
import { uploadFile, deleteImagesByUrls } from '../services/s3.service.js';
import { restoreOrderStock, shouldRestoreOrderStock } from '../services/inventory.service.js';
import {
  queueOrderCancelled,
  queueReturnApproved,
  queueReturnRejected,
  queueRefundEmail,
  queueCodPaymentConfirmed,
} from '../services/queue.service.js';
import {
  sendOrderCancelledEmail,
  sendReturnApprovedEmail,
  sendReturnRejectedEmail,
  sendRefundEmail,
  sendCodPaymentConfirmedEmail,
  notifyOrderCustomer,
} from '../services/email.service.js';

async function resolveBannerImage(bannerInput, file) {
  if (file) {
    return uploadFile(file.buffer, 'banners', file.originalname, file.mimetype);
  }
  if (bannerInput.existingImage) {
    return bannerInput.existingImage;
  }
  throw new AppError('Banner image is required', 400, 'VALIDATION_ERROR');
}

async function deleteReplacedImage(existingUrl, nextUrl, previousUrl) {
  const oldUrl = previousUrl || existingUrl;
  if (oldUrl && nextUrl && oldUrl !== nextUrl) {
    await deleteImagesByUrls([oldUrl]);
  }
}

export async function getDashboard(req, res) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalOrders, revenueAgg, recentOrders, lowStockProducts, totalCustomers, pendingReviews, pendingReturns] = await Promise.all([
    Order.countDocuments({ 'payment.status': PAYMENT_STATUS.PAID }),
    Order.aggregate([
      { $match: { 'payment.status': PAYMENT_STATUS.PAID, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(10),
    Product.find({ 'variants.stock': { $lte: 5 }, status: 'ACTIVE' }).limit(10),
    User.countDocuments({ role: 'customer' }),
    Review.countDocuments({ status: REVIEW_STATUS.PENDING }),
    Order.countDocuments({ status: ORDER_STATUS.RETURN_REQUESTED, 'returnRequest.status': 'PENDING' }),
  ]);

  const revenue = revenueAgg[0]?.revenue || 0;
  const orderCount = revenueAgg[0]?.count || 0;

  const topProducts = await Order.aggregate([
    { $match: { 'payment.status': PAYMENT_STATUS.PAID } },
    { $unwind: '$items' },
    { $group: { _id: '$items.title', sold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
    { $sort: { sold: -1 } },
    { $limit: 5 },
  ]);

  res.json({
    success: true,
    data: {
      totalOrders,
      totalCustomers,
      revenue30d: revenue,
      orders30d: orderCount,
      aov: orderCount ? revenue / orderCount : 0,
      recentOrders,
      lowStockProducts,
      topProducts,
      pendingReviews,
      pendingReturns,
    },
  });
}

export async function listProductsAdmin(req, res) {
  const { search, status, category, view, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (view === 'archived') {
    filter.status = 'ARCHIVED';
  } else if (status) {
    filter.status = status;
  } else {
    filter.status = { $ne: 'ARCHIVED' };
  }
  if (category) filter.categoryId = category;
  if (search) filter.$or = [
    { title: { $regex: search, $options: 'i' } },
    { productName: { $regex: search, $options: 'i' } },
    { 'variants.sku': { $regex: search, $options: 'i' } },
  ];

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [products, total] = await Promise.all([
    Product.find(filter).populate('categoryId', 'name slug').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: products,
    pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, pages: Math.ceil(total / parseInt(limit, 10)) },
  });
}

export async function getProductAdmin(req, res) {
  const product = await Product.findById(req.params.id).populate('categoryId', 'name slug');
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: product });
}

export async function listOrdersAdmin(req, res) {
  const { status, payment, search, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (payment) filter['payment.status'] = payment;
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
      { 'shippingAddress.phone': { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('userId', 'name email phone').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, pages: Math.ceil(total / parseInt(limit, 10)) },
  });
}

export async function listCustomers(req, res) {
  const { search, page = 1, limit = 20 } = req.query;
  const filter = { role: 'customer' };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [customers, total] = await Promise.all([
    User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: customers,
    pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, pages: Math.ceil(total / parseInt(limit, 10)) },
  });
}

export async function getCustomerDetail(req, res) {
  const customer = await User.findById(req.params.id).select('-passwordHash');
  if (!customer || customer.role !== 'customer') throw new AppError('Customer not found', 404, 'NOT_FOUND');

  const orders = await Order.find({ userId: customer._id }).sort({ createdAt: -1 }).limit(20);
  const orderStats = await Order.aggregate([
    { $match: { userId: customer._id, 'payment.status': PAYMENT_STATUS.PAID } },
    { $group: { _id: null, totalSpent: { $sum: '$total' }, orderCount: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    data: {
      customer,
      orders,
      stats: orderStats[0] || { totalSpent: 0, orderCount: 0 },
    },
  });
}

export async function handleReturnRequest(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
  if (order.status !== ORDER_STATUS.RETURN_REQUESTED) {
    throw new AppError('No pending return request', 400, 'INVALID_STATUS');
  }

  const { action, note } = req.body;
  if (action === 'approve') {
    await restoreOrderStock(order.items, order._id, 'Return approved — stock restored');
    order.returnRequest.status = 'APPROVED';
    order.status = ORDER_STATUS.RETURNED;
    order.timeline.push({ status: ORDER_STATUS.RETURNED, note: note || 'Return approved' });
    await order.save();

    await notifyOrderCustomer(order, queueReturnApproved, sendReturnApprovedEmail);
    if (order.payment.status === PAYMENT_STATUS.PAID) {
      order.payment.status = PAYMENT_STATUS.REFUNDED;
      order.status = ORDER_STATUS.REFUNDED;
      order.timeline.push({ status: ORDER_STATUS.REFUNDED, note: 'Refund initiated after return approval' });
      await order.save();
      await notifyOrderCustomer(order, queueRefundEmail, sendRefundEmail, order.total);
    }
  } else {
    order.returnRequest.status = 'REJECTED';
    order.status = ORDER_STATUS.DELIVERED;
    order.timeline.push({ status: ORDER_STATUS.DELIVERED, note: note || 'Return rejected' });
    await order.save();
    await notifyOrderCustomer(order, queueReturnRejected, sendReturnRejectedEmail, note || '');
  }
  res.json({ success: true, data: order });
}

export async function updateOrderPayment(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');

  const { status } = req.body;
  order.payment.status = status;
  if (status === PAYMENT_STATUS.PAID) {
    order.payment.paidAt = new Date();
    order.timeline.push({ status: ORDER_STATUS.CONFIRMED, note: 'Payment marked as received (COD)' });
    await order.save();
    await notifyOrderCustomer(order, queueCodPaymentConfirmed, sendCodPaymentConfirmedEmail);
    return res.json({ success: true, data: order });
  }

  if (status === PAYMENT_STATUS.REFUNDED) {
    order.status = ORDER_STATUS.REFUNDED;
    order.timeline.push({ status: ORDER_STATUS.REFUNDED, note: 'Refund processed by admin' });
    await order.save();
    await notifyOrderCustomer(order, queueRefundEmail, sendRefundEmail, order.total);
    return res.json({ success: true, data: order });
  }

  await order.save();
  res.json({ success: true, data: order });
}

export async function adminCancelOrder(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
  if ([ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].includes(order.status)) {
    throw new AppError('Order cannot be cancelled', 400, 'INVALID_STATUS');
  }

  if (shouldRestoreOrderStock(order)) {
    await restoreOrderStock(order.items, order._id, 'Order cancelled by admin');
    order.inventoryDeducted = false;
  }

  order.status = ORDER_STATUS.CANCELLED;
  order.timeline.push({ status: ORDER_STATUS.CANCELLED, note: 'Cancelled by admin' });
  await order.save();

  await notifyOrderCustomer(
    order,
    queueOrderCancelled,
    sendOrderCancelledEmail,
    'Cancelled by our team. Contact support if you have questions.',
  );

  res.json({ success: true, data: order });
}

export async function listInventoryStock(req, res) {
  const { lowStock, search } = req.query;
  const products = await Product.find({ status: { $ne: 'ARCHIVED' } })
    .populate('categoryId', 'name')
    .select('title slug variants status')
    .lean();

  const rows = [];
  for (const p of products) {
    for (const v of p.variants || []) {
      if (lowStock === 'true' && v.stock > 5) continue;
      if (search) {
        const q = search.toLowerCase();
        const match = v.sku?.toLowerCase().includes(q)
          || p.title?.toLowerCase().includes(q)
          || v.color?.toLowerCase().includes(q)
          || v.size?.toLowerCase().includes(q);
        if (!match) continue;
      }
      rows.push({
        productId: p._id,
        productTitle: p.title,
        productSlug: p.slug,
        category: p.categoryId?.name,
        status: p.status,
        sku: v.sku,
        color: v.color,
        colorHex: v.colorHex,
        size: v.size,
        price: v.price,
        stock: v.stock,
        productSoldCount: p.soldCount,
      });
    }
  }

  rows.sort((a, b) => a.stock - b.stock);
  res.json({ success: true, data: rows });
}

export async function listInventoryLogs(req, res) {
  const { sku, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (sku) filter.variantSku = { $regex: sku, $options: 'i' };

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const logs = await InventoryLog.find(filter)
    .populate('adminId', 'name')
    .populate('productId', 'title')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10));

  res.json({ success: true, data: logs });
}

export async function updateShippingZone(req, res) {
  const zone = await ShippingZone.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!zone) throw new AppError('Zone not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: zone });
}

export async function deleteShippingZone(req, res) {
  await ShippingZone.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Zone deleted' });
}

export async function createCoupon(req, res) {
  const coupon = await Coupon.create(req.validated);
  res.status(201).json({ success: true, data: coupon });
}

export async function listCoupons(req, res) {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ success: true, data: coupons });
}

export async function updateCoupon(req, res) {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: coupon });
}

export async function deleteCoupon(req, res) {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Coupon deleted' });
}

export async function createBanner(req, res) {
  const { existingImage: _existing, previousImage: _previous, ...data } = req.bannerInput;
  const image = await resolveBannerImage(req.bannerInput, req.file);
  const banner = await Banner.create({ ...data, image });
  res.status(201).json({ success: true, data: banner });
}

export async function listBanners(req, res) {
  const banners = await Banner.find().sort({ sortOrder: 1 });
  res.json({ success: true, data: banners });
}

export async function updateBanner(req, res) {
  const existing = await Banner.findById(req.params.id);
  if (!existing) throw new AppError('Banner not found', 404, 'NOT_FOUND');

  const { existingImage, previousImage, ...data } = req.bannerInput;
  const image = await resolveBannerImage(req.bannerInput, req.file);

  await deleteReplacedImage(existing.image, image, previousImage);

  const banner = await Banner.findByIdAndUpdate(
    req.params.id,
    { ...data, image },
    { new: true }
  );
  res.json({ success: true, data: banner });
}

export async function deleteBanner(req, res) {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw new AppError('Banner not found', 404, 'NOT_FOUND');

  if (banner.image) {
    await deleteImagesByUrls([banner.image]);
  }

  await Banner.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Banner deleted' });
}

export async function getPublicBanners(req, res) {
  const now = new Date();
  const banners = await Banner.find({ active: true }).sort({ sortOrder: 1 }).lean();
  const visible = banners.filter((b) => {
    if (b.scheduleStart && new Date(b.scheduleStart) > now) return false;
    if (b.scheduleEnd && new Date(b.scheduleEnd) < now) return false;
    return true;
  });
  res.json({ success: true, data: visible });
}

export async function createShippingZone(req, res) {
  const zone = await ShippingZone.create(req.body);
  res.status(201).json({ success: true, data: zone });
}

export async function listShippingZones(req, res) {
  const zones = await ShippingZone.find();
  res.json({ success: true, data: zones });
}

export async function getSettings(req, res) {
  const keys = ['gstRate', 'codEnabled', 'defaultShippingRate', 'freeShippingAbove'];
  const settings = {};
  for (const key of keys) {
    settings[key] = await getSetting(key, null);
  }
  res.json({ success: true, data: settings });
}

export async function updateSettings(req, res) {
  for (const [key, value] of Object.entries(req.body)) {
    await setSetting(key, value);
  }
  res.json({ success: true, message: 'Settings updated' });
}

function getCurationFlag(type) {
  if (type === 'hot-deals') return 'isHotDeal';
  throw new AppError('Invalid curation type', 400, 'VALIDATION_ERROR');
}

export async function listCurationProducts(req, res) {
  const flag = getCurationFlag(req.params.type);
  const products = await Product.find({ status: PRODUCT_STATUS.ACTIVE })
    .populate('categoryId', 'name slug')
    .select('title productName slug variants status isHotDeal sellingPrice mrp')
    .sort({ title: 1 })
    .lean();

  const selectedIds = products.filter((p) => p[flag]).map((p) => p._id.toString());

  res.json({
    success: true,
    data: { products, selectedIds },
  });
}

export async function addCurationProduct(req, res) {
  const flag = getCurationFlag(req.params.type);
  const product = await Product.findOne({
    _id: req.params.productId,
    status: PRODUCT_STATUS.ACTIVE,
  }).populate('categoryId', 'name slug');

  if (!product) throw new AppError('Active product not found', 404, 'NOT_FOUND');

  product[flag] = true;
  await product.save();

  res.json({
    success: true,
    message: 'Product added to hot deals',
    data: product,
  });
}

export async function removeCurationProduct(req, res) {
  const flag = getCurationFlag(req.params.type);
  const product = await Product.findById(req.params.productId);

  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

  product[flag] = false;
  await product.save();

  res.json({
    success: true,
    message: 'Product removed from hot deals',
    data: product,
  });
}

export async function updateCurationProducts(req, res) {
  const { type } = req.params;
  const flag = getCurationFlag(type);
  const { productIds } = req.validated;

  await Product.updateMany({}, { [flag]: false });
  if (productIds.length) {
    await Product.updateMany(
      { _id: { $in: productIds }, status: PRODUCT_STATUS.ACTIVE },
      { [flag]: true }
    );
  }

  const selected = await Product.find({ [flag]: true, status: PRODUCT_STATUS.ACTIVE })
    .select('title slug')
    .lean();

  res.json({
    success: true,
    message: 'Hot deal products updated',
    data: { count: selected.length, products: selected },
  });
}

export async function getSalesReport(req, res) {
  const { from, to } = req.query;
  const match = { 'payment.status': PAYMENT_STATUS.PAID };
  if (from) match.createdAt = { ...match.createdAt, $gte: new Date(from) };
  if (to) match.createdAt = { ...match.createdAt, $lte: new Date(to) };

  const orders = await Order.find(match).sort({ createdAt: -1 });
  const gstSummary = orders.reduce((acc, o) => {
    acc.total += o.gst?.total || 0;
    acc.cgst += o.gst?.cgst || 0;
    acc.sgst += o.gst?.sgst || 0;
    acc.igst += o.gst?.igst || 0;
    return acc;
  }, { total: 0, cgst: 0, sgst: 0, igst: 0 });

  res.json({ success: true, data: { orders, gstSummary, count: orders.length } });
}
