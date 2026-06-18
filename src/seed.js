import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import { User } from './models/User.js';
import { Category } from './models/Category.js';
import { Product } from './models/Product.js';
import { Banner } from './models/Banner.js';
import { ShippingZone } from './models/ShippingZone.js';
import { Coupon } from './models/Coupon.js';
import {
  ROLES,
  PRODUCT_STATUS,
  GENDER,
  AGE_GROUP,
  PRODUCT_COLLECTION,
  FABRIC_TYPE,
  PATTERN,
  FIT_TYPE,
  SLEEVE_TYPE,
  NECK_TYPE,
  CLOSURE_TYPE,
  OCCASION,
  SEASON,
} from './shared/index.js';
import { syncProductFields } from './utils/product.helpers.js';

async function seed() {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Banner.deleteMany({}),
    ShippingZone.deleteMany({}),
    Coupon.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('Admin@123', 12);
  await User.create({
    name: 'Admin',
    email: 'admin@dkclothing.com',
    passwordHash,
    role: ROLES.ADMIN,
    isVerified: true,
  });

  await User.create({
    name: 'Demo Customer',
    email: 'customer@dkclothing.com',
    passwordHash: await bcrypt.hash('Customer@123', 12),
    role: ROLES.CUSTOMER,
    isVerified: true,
    phone: '9876543210',
  });

  const men = await Category.create({ name: 'Men', slug: 'men', gender: GENDER.MEN, sortOrder: 1 });
  const women = await Category.create({ name: 'Women', slug: 'women', gender: GENDER.WOMEN, sortOrder: 2 });
  const kids = await Category.create({ name: 'Kids', slug: 'kids', gender: GENDER.KIDS, sortOrder: 3 });

  const rawProducts = [
    {
      productName: 'DK Classic Cotton Tee',
      slug: 'dk-classic-cotton-tee',
      sku: 'DK-TEE',
      shortDescription: 'Soft everyday cotton tee with a relaxed fit.',
      description: 'Premium 100% cotton t-shirt with a relaxed fit. Perfect for everyday wear. Breathable fabric keeps you comfortable all day.',
      categoryId: men._id,
      brand: 'DK Clothing',
      manufacturer: 'DK Apparel Pvt Ltd',
      collection: PRODUCT_COLLECTION.CORE,
      gender: GENDER.MEN,
      ageGroup: AGE_GROUP.ADULT,
      mrp: 999,
      sellingPrice: 799,
      costPrice: 450,
      taxPercentage: 5,
      material: '100% Cotton',
      fabricType: FABRIC_TYPE.COTTON,
      pattern: PATTERN.SOLID,
      fit: FIT_TYPE.REGULAR,
      sleeveType: SLEEVE_TYPE.SHORT,
      neckType: NECK_TYPE.ROUND,
      closureType: CLOSURE_TYPE.PULLOVER,
      occasion: OCCASION.CASUAL,
      season: SEASON.ALL_SEASON,
      careInstructions: 'Machine wash cold. Do not bleach.',
      sizeChart: [
        { size: 'S', chest: 38, waist: 32, shoulder: 16, length: 27 },
        { size: 'M', chest: 40, waist: 34, shoulder: 17, length: 28 },
        { size: 'L', chest: 42, waist: 36, shoulder: 18, length: 29 },
      ],
      weight: 220,
      packageLength: 30,
      packageWidth: 25,
      packageHeight: 3,
      metaTitle: 'DK Classic Cotton Tee | DK Clothing',
      metaDescription: 'Shop the DK Classic Cotton Tee — soft, breathable everyday wear for men.',
      keywords: ['cotton tee', 'men t-shirt', 'casual wear'],
      status: PRODUCT_STATUS.ACTIVE,
      tags: ['casual', 'cotton', 'bestseller'],
      variants: [
        { sku: 'DK-TEE-BLK-S', color: 'Black', colorHex: '#000000', size: 'S', price: 799, compareAtPrice: 999, stock: 50, images: ['https://placehold.co/600x800/111/fff?text=Black+Tee'] },
        { sku: 'DK-TEE-BLK-M', color: 'Black', colorHex: '#000000', size: 'M', price: 799, compareAtPrice: 999, stock: 45, images: ['https://placehold.co/600x800/111/fff?text=Black+Tee'] },
        { sku: 'DK-TEE-BLK-L', color: 'Black', colorHex: '#000000', size: 'L', price: 799, compareAtPrice: 999, stock: 40, images: ['https://placehold.co/600x800/111/fff?text=Black+Tee'] },
        { sku: 'DK-TEE-WHT-M', color: 'White', colorHex: '#FFFFFF', size: 'M', price: 799, compareAtPrice: 999, stock: 35, images: ['https://placehold.co/600x800/eee/111?text=White+Tee'] },
      ],
    },
    {
      productName: 'DK Slim Fit Denim Jeans',
      slug: 'dk-slim-fit-denim-jeans',
      sku: 'DK-JEAN',
      shortDescription: 'Stretch denim with a modern slim silhouette.',
      description: 'Stretch denim jeans with a modern slim fit. Comfortable all-day wear with durable stitching and classic 5-pocket styling.',
      categoryId: men._id,
      brand: 'DK Clothing',
      collection: PRODUCT_COLLECTION.CORE,
      gender: GENDER.MEN,
      ageGroup: AGE_GROUP.ADULT,
      mrp: 2499,
      sellingPrice: 1899,
      costPrice: 1100,
      taxPercentage: 5,
      material: '98% Cotton, 2% Elastane',
      fabricType: FABRIC_TYPE.DENIM,
      pattern: PATTERN.SOLID,
      fit: FIT_TYPE.SLIM,
      closureType: CLOSURE_TYPE.BUTTON,
      occasion: OCCASION.CASUAL,
      season: SEASON.ALL_SEASON,
      status: PRODUCT_STATUS.ACTIVE,
      tags: ['denim', 'jeans'],
      sizeChart: [
        { size: '30', waist: 30, hip: 36, length: 40 },
        { size: '32', waist: 32, hip: 38, length: 40 },
        { size: '34', waist: 34, hip: 40, length: 41 },
      ],
      weight: 650,
      variants: [
        { sku: 'DK-JEAN-BLU-30', color: 'Blue', colorHex: '#1e3a5f', size: '30', price: 1899, compareAtPrice: 2499, stock: 25, images: ['https://placehold.co/600x800/1e3a5f/fff?text=Blue+Jeans'] },
        { sku: 'DK-JEAN-BLU-32', color: 'Blue', colorHex: '#1e3a5f', size: '32', price: 1899, compareAtPrice: 2499, stock: 30, images: ['https://placehold.co/600x800/1e3a5f/fff?text=Blue+Jeans'] },
        { sku: 'DK-JEAN-BLU-34', color: 'Blue', colorHex: '#1e3a5f', size: '34', price: 1899, compareAtPrice: 2499, stock: 20, images: ['https://placehold.co/600x800/1e3a5f/fff?text=Blue+Jeans'] },
      ],
    },
    {
      productName: 'DK Floral Summer Dress',
      slug: 'dk-floral-summer-dress',
      sku: 'DK-DRS',
      shortDescription: 'Lightweight floral dress for warm days.',
      description: 'Lightweight floral print dress perfect for summer occasions. Flowy silhouette with a flattering A-line cut.',
      categoryId: women._id,
      brand: 'DK Clothing',
      collection: PRODUCT_COLLECTION.SUMMER,
      gender: GENDER.WOMEN,
      ageGroup: AGE_GROUP.ADULT,
      mrp: 1999,
      sellingPrice: 1499,
      costPrice: 800,
      taxPercentage: 5,
      material: '100% Rayon',
      fabricType: FABRIC_TYPE.RAYON,
      pattern: PATTERN.FLORAL,
      fit: FIT_TYPE.A_LINE,
      sleeveType: SLEEVE_TYPE.SHORT,
      neckType: NECK_TYPE.V_NECK,
      occasion: OCCASION.PARTY,
      season: SEASON.SUMMER,
      status: PRODUCT_STATUS.ACTIVE,
      tags: ['dress', 'summer', 'floral'],
      sizeChart: [
        { size: 'S', chest: 34, waist: 28, hip: 36, length: 42 },
        { size: 'M', chest: 36, waist: 30, hip: 38, length: 43 },
        { size: 'L', chest: 38, waist: 32, hip: 40, length: 44 },
      ],
      variants: [
        { sku: 'DK-DRS-FLR-S', color: 'Floral Pink', colorHex: '#f4a0b5', size: 'S', price: 1499, compareAtPrice: 1999, stock: 15, images: ['https://placehold.co/600x800/f4a0b5/fff?text=Floral+Dress'] },
        { sku: 'DK-DRS-FLR-M', color: 'Floral Pink', colorHex: '#f4a0b5', size: 'M', price: 1499, compareAtPrice: 1999, stock: 20, images: ['https://placehold.co/600x800/f4a0b5/fff?text=Floral+Dress'] },
        { sku: 'DK-DRS-FLR-L', color: 'Floral Pink', colorHex: '#f4a0b5', size: 'L', price: 1499, compareAtPrice: 1999, stock: 12, images: ['https://placehold.co/600x800/f4a0b5/fff?text=Floral+Dress'] },
      ],
    },
    {
      productName: 'DK Kids Graphic Hoodie',
      slug: 'dk-kids-graphic-hoodie',
      sku: 'DK-KHD',
      shortDescription: 'Cozy fleece hoodie with DK logo graphic.',
      description: 'Cozy fleece hoodie with fun DK logo graphic for kids. Soft inner lining and kangaroo pocket.',
      categoryId: kids._id,
      brand: 'DK Clothing',
      collection: PRODUCT_COLLECTION.WINTER,
      gender: GENDER.KIDS,
      ageGroup: AGE_GROUP.KIDS,
      mrp: 1299,
      sellingPrice: 999,
      costPrice: 550,
      taxPercentage: 5,
      material: '80% Cotton, 20% Polyester',
      fabricType: FABRIC_TYPE.FLEECE,
      pattern: PATTERN.GRAPHIC,
      fit: FIT_TYPE.REGULAR,
      sleeveType: SLEEVE_TYPE.FULL,
      neckType: NECK_TYPE.HIGH_NECK,
      closureType: CLOSURE_TYPE.PULLOVER,
      occasion: OCCASION.CASUAL,
      season: SEASON.WINTER,
      status: PRODUCT_STATUS.ACTIVE,
      tags: ['kids', 'hoodie'],
      variants: [
        { sku: 'DK-KHD-GRY-4', color: 'Grey', colorHex: '#9ca3af', size: '4-5Y', price: 999, compareAtPrice: 1299, stock: 18, images: ['https://placehold.co/600x800/9ca3af/fff?text=Kids+Hoodie'] },
        { sku: 'DK-KHD-GRY-6', color: 'Grey', colorHex: '#9ca3af', size: '6-7Y', price: 999, compareAtPrice: 1299, stock: 22, images: ['https://placehold.co/600x800/9ca3af/fff?text=Kids+Hoodie'] },
        { sku: 'DK-KHD-NVY-6', color: 'Navy', colorHex: '#1e3a5f', size: '6-7Y', price: 999, compareAtPrice: 1299, stock: 16, images: ['https://placehold.co/600x800/1e3a5f/fff?text=Kids+Hoodie'] },
      ],
    },
  ];

  const products = rawProducts.map((p) => {
    const doc = { ...p, title: p.productName };
    return syncProductFields(doc);
  });

  await Product.insertMany(products);

  await Banner.insertMany([
    { title: 'Summer Collection', description: 'Fresh styles for the season — explore curated looks for every occasion.', image: 'https://placehold.co/1400x500/111/fff?text=Summer+Collection+2026', link: '/shop/women', position: 'hero', active: true, sortOrder: 1 },
    { title: 'New Arrivals', description: 'Be the first to shop our latest drops in men\'s and women\'s fashion.', image: 'https://placehold.co/1400x500/333/fff?text=New+Arrivals', link: '/shop/men', position: 'hero', active: true, sortOrder: 2 },
    { title: 'Free Shipping', image: 'https://placehold.co/1400x200/000/fff?text=Free+Shipping+Above+Rs999', position: 'promo', active: true, sortOrder: 1 },
  ]);

  await ShippingZone.create({
    name: 'Standard India',
    isDefault: true,
    rate: 99,
    freeAbove: 999,
    pincodes: [],
  });

  await Coupon.create({
    code: 'WELCOME10',
    type: 'PERCENTAGE',
    value: 10,
    minCartValue: 500,
    maxDiscount: 500,
    usageLimit: 1000,
    isActive: true,
  });

  console.log('Seed completed!');
  console.log('Admin: admin@dkclothing.com / Admin@123');
  console.log('Customer: customer@dkclothing.com / Customer@123');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
