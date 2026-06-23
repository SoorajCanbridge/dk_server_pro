const bannerMaxMb = parseInt(process.env.UPLOAD_BANNER_MAX_MB || '10', 10);
const categoryMaxMb = parseInt(process.env.UPLOAD_CATEGORY_MAX_MB || '5', 10);
const productMaxMb = parseInt(process.env.UPLOAD_PRODUCT_MAX_MB || '8', 10);

export const uploadLimits = {
  bannerMaxBytes: bannerMaxMb * 1024 * 1024,
  bannerMaxMb,
  categoryMaxBytes: categoryMaxMb * 1024 * 1024,
  categoryMaxMb,
  productMaxBytes: productMaxMb * 1024 * 1024,
  productMaxMb,
  jsonMaxMb: parseInt(process.env.UPLOAD_JSON_MAX_MB || '10', 10),
};
