import mongoose from 'mongoose';
import {
  PRODUCT_STATUS,
  STOCK_STATUS,
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
} from '../shared/index.js';
import { syncProductFields } from '../utils/product.helpers.js';

const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  color: { type: String, required: true },
  colorHex: String,
  size: { type: String, required: true },
  price: { type: Number, required: true },
  compareAtPrice: Number,
  stock: { type: Number, default: 0 },
  images: [String],
}, { _id: true });

const sizeChartRowSchema = new mongoose.Schema({
  size: { type: String, required: true },
  chest: Number,
  waist: Number,
  hip: Number,
  shoulder: Number,
  length: Number,
}, { _id: false });

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  sku: String,
  shortDescription: String,
  description: { type: String, required: true },

  brand: { type: String, default: 'DK Clothing' },
  manufacturer: String,
  collection: { type: String, enum: Object.values(PRODUCT_COLLECTION) },

  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  gender: { type: String, enum: Object.values(GENDER) },
  ageGroup: { type: String, enum: Object.values(AGE_GROUP) },

  mrp: Number,
  sellingPrice: Number,
  costPrice: Number,
  taxPercentage: { type: Number, default: 5 },

  stock: { type: Number, default: 0 },
  stockStatus: { type: String, enum: Object.values(STOCK_STATUS), default: STOCK_STATUS.OUT_OF_STOCK },
  lowStockThreshold: { type: Number, default: 5 },

  material: String,
  fabricType: { type: String, enum: Object.values(FABRIC_TYPE) },
  pattern: { type: String, enum: Object.values(PATTERN) },
  fit: { type: String, enum: Object.values(FIT_TYPE) },
  sleeveType: { type: String, enum: Object.values(SLEEVE_TYPE) },
  neckType: { type: String, enum: Object.values(NECK_TYPE) },
  closureType: { type: String, enum: Object.values(CLOSURE_TYPE) },
  occasion: { type: String, enum: Object.values(OCCASION) },
  season: { type: String, enum: Object.values(SEASON) },

  fabric: String,
  careInstructions: String,
  sizeChartId: String,
  sizeChart: [sizeChartRowSchema],

  variants: [variantSchema],

  weight: Number,
  packageLength: Number,
  packageWidth: Number,
  packageHeight: Number,

  metaTitle: String,
  metaDescription: String,
  keywords: [String],
  seo: {
    title: String,
    description: String,
  },

  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },

  tags: [String],
  status: { type: String, enum: Object.values(PRODUCT_STATUS), default: PRODUCT_STATUS.DRAFT },
  viewCount: { type: Number, default: 0 },
  soldCount: { type: Number, default: 0 },
  isHotDeal: { type: Boolean, default: false },
}, { timestamps: true });

const LEGACY_FIT_MAP = {
  Regular: FIT_TYPE.REGULAR,
  Slim: FIT_TYPE.SLIM,
  Relaxed: FIT_TYPE.RELAXED,
  Oversized: FIT_TYPE.OVERSIZED,
  'A-Line': FIT_TYPE.A_LINE,
  Skinny: FIT_TYPE.SKINNY,
  Straight: FIT_TYPE.STRAIGHT,
};

productSchema.pre('validate', function syncLegacyFields() {
  if (!this.productName && this.title) this.productName = this.title;
  if (!this.title && this.productName) this.title = this.productName;
  if (this.fabric && !this.material) this.material = this.fabric;
  if (this.fit && !Object.values(FIT_TYPE).includes(this.fit)) {
    this.fit = LEGACY_FIT_MAP[this.fit] || this.fit;
  }
  if (!this.fabricType && this.fabric) {
    const fabric = this.fabric.toLowerCase();
    if (fabric.includes('cotton')) this.fabricType = FABRIC_TYPE.COTTON;
    else if (fabric.includes('denim')) this.fabricType = FABRIC_TYPE.DENIM;
    else if (fabric.includes('rayon')) this.fabricType = FABRIC_TYPE.RAYON;
    else if (fabric.includes('wool')) this.fabricType = FABRIC_TYPE.WOOL;
    else if (fabric.includes('silk')) this.fabricType = FABRIC_TYPE.SILK;
    else if (fabric.includes('linen')) this.fabricType = FABRIC_TYPE.LINEN;
    else if (fabric.includes('polyester') || fabric.includes('fleece')) {
      this.fabricType = fabric.includes('fleece') ? FABRIC_TYPE.FLEECE : FABRIC_TYPE.POLYESTER;
    } else if (fabric.includes('blend')) this.fabricType = FABRIC_TYPE.BLEND;
  }
});

productSchema.pre('save', function applyProductSync() {
  syncProductFields(this);
});

productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ status: 1, isHotDeal: 1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ gender: 1, status: 1 });
productSchema.index({ collection: 1, status: 1 });
productSchema.index({ 'variants.sku': 1 });
productSchema.index({ productName: 'text', title: 'text', tags: 'text', keywords: 'text' });

export const Product = mongoose.model('Product', productSchema);
