import { getPresignedUploadUrl } from '../services/s3.service.js';

export async function getPresignedUrl(req, res) {
  const { filename, contentType, folder = 'products' } = req.body;
  const result = await getPresignedUploadUrl({ folder, filename, contentType });
  res.json({ success: true, data: result });
}

export async function getReviewPresignedUrl(req, res) {
  const { filename, contentType } = req.body;
  const result = await getPresignedUploadUrl({ folder: 'reviews', filename, contentType });
  res.json({ success: true, data: result });
}
