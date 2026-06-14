import slugify from 'slugify';

export function makeSlug(text) {
  return slugify(text, { lower: true, strict: true });
}

export function generateOrderNumber() {
  const date = new Date();
  const prefix = `DK${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${random}`;
}
