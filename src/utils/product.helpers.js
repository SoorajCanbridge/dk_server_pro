import { STOCK_STATUS } from '../shared/index.js';

export function getProductName(product) {
  return product?.productName || product?.title || '';
}

export function computeTotalStock(variants = []) {
  return variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
}

export function computeStockStatus(totalStock, lowStockThreshold = 5) {
  if (totalStock <= 0) return STOCK_STATUS.OUT_OF_STOCK;
  if (totalStock <= lowStockThreshold) return STOCK_STATUS.LOW_STOCK;
  return STOCK_STATUS.IN_STOCK;
}

export function syncProductPricing(product) {
  const sellingPrice = product.sellingPrice;
  const mrp = product.mrp;

  if (product.variants?.length) {
    product.variants.forEach((variant) => {
      if (sellingPrice != null && sellingPrice > 0) {
        variant.price = sellingPrice;
      }
      if (mrp != null && mrp > 0) {
        variant.compareAtPrice = mrp;
      }
    });
  }

  if (sellingPrice == null && product.variants?.length) {
    product.sellingPrice = Math.min(...product.variants.map((v) => v.price));
  }
  if (mrp == null && product.variants?.length) {
    const compares = product.variants.map((v) => v.compareAtPrice).filter(Boolean);
    if (compares.length) product.mrp = Math.max(...compares);
  }

  return product;
}

export function syncProductInventory(product) {
  const totalStock = computeTotalStock(product.variants);
  product.stock = totalStock;
  product.stockStatus = computeStockStatus(totalStock, product.lowStockThreshold ?? 5);
  return product;
}

export function syncProductFields(product) {
  const name = getProductName(product);
  if (name) {
    product.productName = name;
    product.title = name;
  }

  syncProductPricing(product);
  syncProductInventory(product);

  if (!product.sku && product.variants?.[0]?.sku) {
    product.sku = product.variants[0].sku.split('-').slice(0, -1).join('-') || product.variants[0].sku;
  }

  if (product.metaTitle || product.metaDescription || product.keywords?.length) {
    product.seo = {
      title: product.metaTitle || product.seo?.title,
      description: product.metaDescription || product.seo?.description,
    };
  } else if (product.seo) {
    product.metaTitle = product.seo.title;
    product.metaDescription = product.seo.description;
  }

  return product;
}

export function enrichProduct(product) {
  if (!product) return product;
  const doc = product.toObject ? product.toObject() : { ...product };
  const name = getProductName(doc);

  syncProductPricing(doc);
  syncProductInventory(doc);

  return {
    ...doc,
    productName: name,
    title: name,
    displayName: name,
  };
}
