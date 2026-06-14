import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { getRedis } from '../config/redis.js';
import { makeSlug } from '../utils/slug.js';
import { AppError } from '../utils/errors.js';
import { PRODUCT_STATUS } from '../shared/index.js';
import { uploadFile, deleteImagesByUrls } from '../services/s3.service.js';
import { getGendersForShopSlug, isGenderShopSlug } from '../utils/gender-shop.js';

async function resolveCategoryImage(categoryInput, file) {
  if (file) {
    return uploadFile(file.buffer, 'categories', file.originalname, file.mimetype);
  }
  if (categoryInput.existingImage) {
    return categoryInput.existingImage;
  }
  return undefined;
}

export async function listCategories(req, res) {
  const filter = {};
  if (req.query.gender) filter.gender = req.query.gender;
  const categories = await Category.find(filter).sort({ sortOrder: 1 });
  res.json({ success: true, data: categories });
}

export async function getCategoryProducts(req, res) {
  const category = await Category.findOne({ slug: req.params.slug });
  if (!category) throw new AppError('Category not found', 404, 'NOT_FOUND');

  const redis = getRedis();
  const cacheKey = `cache:category:${req.params.slug}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success: true, data: JSON.parse(cached) });

  const productFilter = { status: PRODUCT_STATUS.ACTIVE };
  if (isGenderShopSlug(req.params.slug)) {
    productFilter.gender = { $in: getGendersForShopSlug(req.params.slug) };
  } else {
    productFilter.categoryId = category._id;
    if (category.gender) productFilter.gender = category.gender;
  }
  const products = await Product.find(productFilter);
  const result = { category, products };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 600);

  res.json({ success: true, data: result });
}

export async function createCategory(req, res) {
  const { existingImage: _existing, ...data } = req.categoryInput;
  const slug = data.slug || makeSlug(data.name);
  const image = await resolveCategoryImage(req.categoryInput, req.file);
  const category = await Category.create({ ...data, slug, image });
  res.status(201).json({ success: true, data: category });
}

export async function updateCategory(req, res) {
  const existing = await Category.findById(req.params.id);
  if (!existing) throw new AppError('Category not found', 404, 'NOT_FOUND');

  const { existingImage: _existing, ...data } = req.categoryInput;
  const image = await resolveCategoryImage(req.categoryInput, req.file);

  if (existing.image && image && existing.image !== image) {
    await deleteImagesByUrls([existing.image]);
  }

  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { ...data, ...(image !== undefined ? { image } : {}) },
    { new: true }
  );

  await getRedis().del(`cache:category:${category.slug}`);
  if (existing.slug !== category.slug) {
    await getRedis().del(`cache:category:${existing.slug}`);
  }

  res.json({ success: true, data: category });
}

export async function deleteCategory(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) throw new AppError('Category not found', 404, 'NOT_FOUND');

  const count = await Product.countDocuments({ categoryId: req.params.id });
  if (count > 0) throw new AppError('Category has products', 400, 'HAS_PRODUCTS');

  if (category.image) {
    await deleteImagesByUrls([category.image]);
  }

  await Category.findByIdAndDelete(req.params.id);
  await getRedis().del(`cache:category:${category.slug}`);
  res.json({ success: true, message: 'Category deleted' });
}

