import multer from 'multer';
import { z } from 'zod';
import { bannerSchema } from '../shared/index.js';
import { AppError } from '../utils/errors.js';

const bannerInputSchema = bannerSchema.omit({ image: true }).extend({
  existingImage: z.string().url().optional(),
});

export const bannerImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
}).single('image');

export function parseBannerMultipart(req, _res, next) {
  try {
    if (!req.body?.data) {
      throw new AppError('Missing banner data', 400, 'VALIDATION_ERROR');
    }
    const parsed = JSON.parse(req.body.data);
    req.bannerInput = bannerInputSchema.parse(parsed);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0]?.message || 'Invalid banner data', 400, 'VALIDATION_ERROR'));
    }
    next(err);
  }
}
