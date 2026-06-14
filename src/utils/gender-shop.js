import { GENDER } from '../shared/index.js';

/** Top-level shop slugs mapped to product gender values (includes UNISEX where relevant). */
export const GENDER_SHOP_SLUGS = {
  men: [GENDER.MEN, GENDER.UNISEX],
  women: [GENDER.WOMEN, GENDER.UNISEX],
  kids: [GENDER.KIDS],
};

export const SHOP_SLUG_TO_GENDER = {
  men: GENDER.MEN,
  women: GENDER.WOMEN,
  kids: GENDER.KIDS,
};

export function isGenderShopSlug(slug) {
  return slug in GENDER_SHOP_SLUGS;
}

export function getGendersForShopSlug(slug) {
  return GENDER_SHOP_SLUGS[slug] || null;
}

export function getPrimaryGenderForShopSlug(slug) {
  return SHOP_SLUG_TO_GENDER[slug] || null;
}
