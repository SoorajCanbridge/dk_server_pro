import { getRedis } from '../config/redis.js';
import { AppError } from '../utils/errors.js';

export function redisRateLimit({ windowSec = 60, max = 20, keyPrefix = 'ratelimit' }) {
  return async (req, res, next) => {
    try {
      const redis = getRedis();
      const ip = req.ip || req.connection.remoteAddress;
      const key = `${keyPrefix}:${ip}:${req.path}`;
      const current = await redis.incr(key);
      if (current === 1) await redis.expire(key, windowSec);
      if (current > max) {
        return next(new AppError('Too many requests, please try again later', 429, 'RATE_LIMIT'));
      }
      next();
    } catch {
      next();
    }
  };
}
