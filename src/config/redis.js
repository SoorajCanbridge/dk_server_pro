import Redis from 'ioredis';
import { config } from './index.js';

let redis = null;

export function getRedisConnectionOptions() {
  return config.redis.options;
}

export function getRedis() {
  if (!config.redis.enabled) {
    throw new Error('Redis is disabled (REDIS_ENABLED=false)');
  }
  if (!redis) {
    redis = new Redis(getRedisConnectionOptions());
  }
  return redis;
}

export async function connectRedis() {
  if (!config.redis.enabled) {
    console.log('Redis disabled via REDIS_ENABLED=false');
    return null;
  }

  const client = getRedis();
  await client.ping();
  console.log('Redis connected');
  return client;
}
