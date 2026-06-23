import multer from 'multer';
import { AppError } from '../utils/errors.js';

export function handleMulterError(err, req, res, next) {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(
        'Uploaded file is too large. Compress the image or ask your host to raise the upload limit (nginx client_max_body_size).',
        413,
        'FILE_TOO_LARGE',
      ));
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError(err.message, 400, 'UPLOAD_ERROR'));
    }
  }

  if (err.message === 'Only image files are allowed') {
    return next(new AppError(err.message, 400, 'INVALID_FILE_TYPE'));
  }

  return next(err);
}

export function wrapMulter(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      return next();
    });
  };
}
