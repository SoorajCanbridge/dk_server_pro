import { Product } from '../models/Product.js';

import { Category } from '../models/Category.js';

import { Review } from '../models/Review.js';

import { getRedis } from '../config/redis.js';

import { makeSlug } from '../utils/slug.js';

import { AppError } from '../utils/errors.js';

import { PRODUCT_STATUS, REVIEW_STATUS } from '../shared/index.js';

import { buildVariantsWithImages, removeOrphanedImages } from '../services/product-images.service.js';

import { collectProductImageUrls, deleteImagesByUrls } from '../services/s3.service.js';

import { enrichProduct, getProductName } from '../utils/product.helpers.js';
import { getGendersForShopSlug, isGenderShopSlug } from '../utils/gender-shop.js';



export async function listProducts(req, res) {

  const { page, limit, category, search, minPrice, maxPrice, size, color, gender, sort } = req.validated;

  const filter = { status: PRODUCT_STATUS.ACTIVE };

  if (gender) {
    filter.gender = gender;
  } else if (category && isGenderShopSlug(category)) {
    filter.gender = { $in: getGendersForShopSlug(category) };
  } else if (category) {
    const cat = await Category.findOne({ slug: category });
    if (cat) {
      filter.categoryId = cat._id;
      if (cat.gender) filter.gender = cat.gender;
    }
  }



  if (search) filter.$text = { $search: search };



  let products = await Product.find(filter)

    .populate('categoryId', 'name slug')

    .lean();



  if (minPrice || maxPrice || size || color) {

    products = products.filter((p) => {

      const variants = p.variants.filter((v) => {

        if (size && v.size !== size) return false;

        if (color && v.color.toLowerCase() !== color.toLowerCase()) return false;

        if (minPrice && v.price < minPrice) return false;

        if (maxPrice && v.price > maxPrice) return false;

        return true;

      });

      return variants.length > 0;

    });

  }



  if (sort === 'price_asc') {

    products.sort((a, b) => Math.min(...a.variants.map((v) => v.price)) - Math.min(...b.variants.map((v) => v.price)));

  } else if (sort === 'price_desc') {

    products.sort((a, b) => Math.max(...b.variants.map((v) => v.price)) - Math.max(...a.variants.map((v) => v.price)));

  } else if (sort === 'popular') {

    products.sort((a, b) => b.soldCount - a.soldCount);

  } else {

    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  }



  const total = products.length;

  const start = (page - 1) * limit;

  const paginated = products.slice(start, start + limit);



  res.json({

    success: true,

    data: paginated,

    pagination: { page, limit, total, pages: Math.ceil(total / limit) },

  });

}



export async function getProduct(req, res) {

  const product = await Product.findOne({ slug: req.params.slug, status: PRODUCT_STATUS.ACTIVE })

    .populate('categoryId', 'name slug');

  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');



  product.viewCount += 1;

  await product.save();



  const approvedFilter = { productId: product._id, status: REVIEW_STATUS.APPROVED };

  const [allRatings, reviews] = await Promise.all([

    Review.find(approvedFilter).select('rating').lean(),

    Review.find(approvedFilter)

      .populate('userId', 'name')

      .sort({ createdAt: -1 })

      .limit(5)

      .lean(),

  ]);



  const reviewSummary = buildReviewSummary(allRatings);

  const avgRating = reviewSummary.average;



  const related = await Product.find({

    categoryId: product.categoryId,

    status: PRODUCT_STATUS.ACTIVE,

    _id: { $ne: product._id },

  }).limit(4);



  const enrichedProduct = enrichProduct(product);

  enrichedProduct.averageRating = avgRating;

  enrichedProduct.totalReviews = reviewSummary.total;



  res.json({

    success: true,

    data: {

      product: enrichedProduct,

      reviews,

      reviewSummary,

      avgRating,

      reviewCount: reviewSummary.total,

      related: related.map((p) => enrichProduct(p)),

    },

  });

}



export async function searchProducts(req, res) {

  const q = req.query.q || '';

  if (!q) return res.json({ success: true, data: [] });



  const products = await Product.find(

    { $text: { $search: q }, status: PRODUCT_STATUS.ACTIVE },

    { score: { $meta: 'textScore' } }

  )

    .sort({ score: { $meta: 'textScore' } })

    .limit(10)

    .select('title slug variants.images variants.price variants.color variants.size');



  res.json({ success: true, data: products });

}



function paginateProducts(products, page, limit) {
  const total = products.length;
  const start = (page - 1) * limit;
  return {
    data: products.slice(start, start + limit),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

export async function getNewArrivals(req, res) {
  const { page, limit } = req.validated;
  const products = await Product.find({ status: PRODUCT_STATUS.ACTIVE })
    .populate('categoryId', 'name slug')
    .sort({ createdAt: -1 })
    .lean();
  const result = paginateProducts(products, page, limit);
  res.json({ success: true, ...result });
}

export async function getHotDeals(req, res) {
  const { page, limit } = req.validated;
  const products = await Product.find({ status: PRODUCT_STATUS.ACTIVE, isHotDeal: true })
    .populate('categoryId', 'name slug')
    .sort({ updatedAt: -1 })
    .lean();
  const result = paginateProducts(products, page, limit);
  res.json({ success: true, ...result });
}

export async function getFeatured(req, res) {

  const redis = getRedis();

  const cached = await redis.get('cache:products:featured');

  if (cached) return res.json({ success: true, data: JSON.parse(cached) });



  const products = await Product.find({ status: PRODUCT_STATUS.ACTIVE })

    .sort({ soldCount: -1 })

    .limit(8);



  await redis.set('cache:products:featured', JSON.stringify(products), 'EX', 600);

  res.json({ success: true, data: products });

}



export async function createProduct(req, res) {

  const data = req.productInput;

  const slug = data.slug || makeSlug(getProductName(data));

  const existing = await Product.findOne({ slug });

  if (existing) throw new AppError('Slug already exists', 409, 'SLUG_EXISTS');



  const variants = await buildVariantsWithImages(data.variants, req.files);

  const product = await Product.create({ ...data, slug, variants });

  await getRedis().del('cache:products:featured');

  res.status(201).json({ success: true, data: product });

}



export async function updateProduct(req, res) {

  const existing = await Product.findById(req.params.id);

  if (!existing) throw new AppError('Product not found', 404, 'NOT_FOUND');



  const data = req.productInput;

  const previousUrls = collectProductImageUrls(existing);

  const variants = await buildVariantsWithImages(data.variants, req.files);

  const nextUrls = variants.flatMap((v) => v.images || []);



  await removeOrphanedImages(previousUrls, nextUrls);



  const product = await Product.findByIdAndUpdate(

    req.params.id,

    { ...data, variants },

    { new: true }

  );



  await getRedis().del('cache:products:featured');

  res.json({ success: true, data: product });

}



export async function deleteProduct(req, res) {

  const product = await Product.findById(req.params.id);

  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');



  const imageUrls = collectProductImageUrls(product);

  await deleteImagesByUrls(imageUrls);



  product.status = PRODUCT_STATUS.ARCHIVED;
  for (const variant of product.variants) {
    variant.images = [];
  }
  await product.save();



  await getRedis().del('cache:products:featured');

  res.json({ success: true, message: 'Product archived and images removed' });

}



export async function adjustInventory(req, res) {
  const { variantSku: skuField, sku, delta, reason } = req.body;
  const variantSku = skuField || sku;
  const { adjustVariantStock } = await import('../services/inventory.service.js');

  const product = await adjustVariantStock({
    productId: req.params.id,
    variantSku,
    delta: Number(delta),
    reason,
    adminId: req.user._id,
  });

  res.json({ success: true, data: product });

}



function buildReviewSummary(reviews) {

  const total = reviews.length;

  if (!total) {

    return { total: 0, average: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

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


