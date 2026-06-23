import multer from 'multer';
import { z } from 'zod';
import { productInputSchema } from '../shared/index.js';
import { AppError } from '../utils/errors.js';
import { uploadLimits } from '../config/upload.js';
import { wrapMulter } from './multerError.js';

const productImageUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadLimits.productMaxBytes, files: 200 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
}).any();

export const productImageUpload = wrapMulter(productImageUploadMiddleware);

export function parseProductMultipart(req, _res, next) {
  try {
    if (!req.body?.data) {
      throw new AppError('Missing product data', 400, 'VALIDATION_ERROR');
    }
    const parsed = JSON.parse(req.body.data);
    req.productInput = productInputSchema.parse(parsed);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(err.errors[0]?.message || 'Invalid product data', 400, 'VALIDATION_ERROR'));
    }
    next(err);
  }
}
