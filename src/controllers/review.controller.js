import { Review } from '../models/Review.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { AppError } from '../utils/errors.js';
import { REVIEW_STATUS, ORDER_STATUS } from '../shared/index.js';

const PURCHASED_STATUSES = [
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PACKED,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
];

async function userHasPurchased(userId, productId) {
  const order = await Order.findOne({
    userId,
    status: { $in: PURCHASED_STATUSES },
    'items.productId': productId,
  });
  return Boolean(order);
}

function buildSummary(reviews) {
  const total = reviews.length;
  if (!total) {
    return {
      total: 0,
      average: 0,
      breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  for (const r of reviews) {
    sum += r.rating;
    breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
  }
  return {
    total,
    average: Math.round((sum / total) * 10) / 10,
    breakdown,
  };
}

export async function createReview(req, res) {
  const productId = req.params.productId;
  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');

  const purchased = await userHasPurchased(req.user._id, productId);
  if (!purchased) {
    throw new AppError('You can only review products you have purchased', 403, 'NOT_PURCHASED');
  }

  const existing = await Review.findOne({ productId, userId: req.user._id });
  if (existing && existing.status !== REVIEW_STATUS.REJECTED) {
    throw new AppError('You already reviewed this product', 409, 'ALREADY_REVIEWED');
  }

  let review;
  if (existing?.status === REVIEW_STATUS.REJECTED) {
    existing.rating = req.validated.rating;
    existing.comment = req.validated.comment;
    existing.images = req.validated.images || [];
    existing.status = REVIEW_STATUS.PENDING;
    existing.adminNote = undefined;
    existing.verifiedPurchase = true;
    await existing.save();
    review = existing;
  } else {
    review = await Review.create({
      productId,
      userId: req.user._id,
      verifiedPurchase: true,
      ...req.validated,
    });
  }

  res.status(201).json({
    success: true,
    message: 'Review submitted and pending approval',
    data: review,
  });
}

export async function updateMyReview(req, res) {
  const review = await Review.findOne({ _id: req.params.id, userId: req.user._id });
  if (!review) throw new AppError('Review not found', 404, 'NOT_FOUND');
  if (review.status === REVIEW_STATUS.APPROVED) {
    throw new AppError('Approved reviews cannot be edited', 400, 'INVALID_STATUS');
  }

  review.rating = req.validated.rating;
  review.comment = req.validated.comment;
  review.images = req.validated.images || [];
  review.status = REVIEW_STATUS.PENDING;
  review.adminNote = undefined;
  await review.save();

  res.json({
    success: true,
    message: 'Review updated and pending approval',
    data: review,
  });
}

export async function getMyProductReview(req, res) {
  const review = await Review.findOne({
    productId: req.params.productId,
    userId: req.user._id,
  });
  res.json({ success: true, data: review });
}

export async function getProductReviews(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 10));

  const filter = {
    productId: req.params.productId,
    status: REVIEW_STATUS.APPROVED,
  };

  const [allForSummary, reviews, total] = await Promise.all([
    Review.find(filter).select('rating').lean(),
    Review.find(filter)
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: reviews,
    summary: buildSummary(allForSummary),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  });
}

export async function listReviewsAdmin(req, res) {
  const { status, search } = req.query;
  const filter = {};
  if (status && status !== 'ALL') filter.status = status;

  let reviews = await Review.find(filter)
    .populate('userId', 'name email')
    .populate('productId', 'title slug variants')
    .sort({ createdAt: -1 })
    .lean();

  if (search) {
    const q = search.toLowerCase();
    reviews = reviews.filter((r) =>
      r.productId?.title?.toLowerCase().includes(q)
      || r.userId?.name?.toLowerCase().includes(q)
      || r.userId?.email?.toLowerCase().includes(q)
      || r.comment?.toLowerCase().includes(q)
    );
  }

  const stats = {
    pending: await Review.countDocuments({ status: REVIEW_STATUS.PENDING }),
    approved: await Review.countDocuments({ status: REVIEW_STATUS.APPROVED }),
    rejected: await Review.countDocuments({ status: REVIEW_STATUS.REJECTED }),
    total: await Review.countDocuments(),
  };

  res.json({ success: true, data: reviews, stats });
}

export async function moderateReview(req, res) {
  const { status, adminNote } = req.body;
  if (![REVIEW_STATUS.APPROVED, REVIEW_STATUS.REJECTED].includes(status)) {
    throw new AppError('Invalid status', 400, 'VALIDATION_ERROR');
  }

  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { status, adminNote: adminNote || undefined },
    { new: true }
  )
    .populate('userId', 'name')
    .populate('productId', 'title slug');

  if (!review) throw new AppError('Review not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: review });
}

export async function deleteReview(req, res) {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw new AppError('Review not found', 404, 'NOT_FOUND');
  res.json({ success: true, message: 'Review deleted' });
}
