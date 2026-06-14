export const ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
};

export const ORDER_STATUS = {
  PLACED: 'PLACED',
  CONFIRMED: 'CONFIRMED',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  RETURNED: 'RETURNED',
  REFUNDED: 'REFUNDED',
};

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
};

export const PAYMENT_METHOD = {
  RAZORPAY: 'RAZORPAY',
  COD: 'COD',
};

export const COUPON_TYPE = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
};

export const REVIEW_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

export const PRODUCT_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
};

export const STOCK_STATUS = {
  IN_STOCK: 'IN_STOCK',
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
};

export const GENDER = {
  MEN: 'MEN',
  WOMEN: 'WOMEN',
  KIDS: 'KIDS',
  UNISEX: 'UNISEX',
};

export const AGE_GROUP = {
  ADULT: 'ADULT',
  TEEN: 'TEEN',
  KIDS: 'KIDS',
  TODDLER: 'TODDLER',
  INFANT: 'INFANT',
};

export const PRODUCT_COLLECTION = {
  CORE: 'CORE',
  NEW_ARRIVALS: 'NEW_ARRIVALS',
  HOT_DEALS: 'HOT_DEALS',
  FESTIVE: 'FESTIVE',
  SUMMER: 'SUMMER',
  WINTER: 'WINTER',
  PREMIUM: 'PREMIUM',
};

export const FABRIC_TYPE = {
  COTTON: 'COTTON',
  POLYESTER: 'POLYESTER',
  LINEN: 'LINEN',
  RAYON: 'RAYON',
  DENIM: 'DENIM',
  WOOL: 'WOOL',
  SILK: 'SILK',
  BLEND: 'BLEND',
  FLEECE: 'FLEECE',
  OTHER: 'OTHER',
};

export const PATTERN = {
  SOLID: 'SOLID',
  STRIPED: 'STRIPED',
  CHECKED: 'CHECKED',
  PRINTED: 'PRINTED',
  FLORAL: 'FLORAL',
  GRAPHIC: 'GRAPHIC',
  EMBROIDERED: 'EMBROIDERED',
  OTHER: 'OTHER',
};

export const FIT_TYPE = {
  REGULAR: 'REGULAR',
  SLIM: 'SLIM',
  RELAXED: 'RELAXED',
  OVERSIZED: 'OVERSIZED',
  A_LINE: 'A_LINE',
  SKINNY: 'SKINNY',
  STRAIGHT: 'STRAIGHT',
};

export const SLEEVE_TYPE = {
  SLEEVELESS: 'SLEEVELESS',
  SHORT: 'SHORT',
  HALF: 'HALF',
  THREE_QUARTER: 'THREE_QUARTER',
  FULL: 'FULL',
};

export const NECK_TYPE = {
  ROUND: 'ROUND',
  V_NECK: 'V_NECK',
  POLO: 'POLO',
  COLLAR: 'COLLAR',
  HENLEY: 'HENLEY',
  HIGH_NECK: 'HIGH_NECK',
  OTHER: 'OTHER',
};

export const CLOSURE_TYPE = {
  PULLOVER: 'PULLOVER',
  BUTTON: 'BUTTON',
  ZIP: 'ZIP',
  HOOK: 'HOOK',
  DRAWSTRING: 'DRAWSTRING',
  ELASTIC: 'ELASTIC',
  OTHER: 'OTHER',
};

export const OCCASION = {
  CASUAL: 'CASUAL',
  FORMAL: 'FORMAL',
  PARTY: 'PARTY',
  SPORTS: 'SPORTS',
  ETHNIC: 'ETHNIC',
  LOUNGE: 'LOUNGE',
  OUTDOOR: 'OUTDOOR',
};

export const SEASON = {
  SUMMER: 'SUMMER',
  WINTER: 'WINTER',
  MONSOON: 'MONSOON',
  ALL_SEASON: 'ALL_SEASON',
};

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
];
