import dotenv from 'dotenv';
dotenv.config();

function isRedisProtocolUrl(value) {
  return value.startsWith('redis://') || value.startsWith('rediss://');
}

function buildRedisConfig() {
  const enabled = process.env.REDIS_ENABLED !== 'false';
  const password = process.env.REDIS_PASSWORD || undefined;
  const tls = process.env.REDIS_TLS === 'true';
  const envUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const isHostPort = !isRedisProtocolUrl(envUrl);

  let raw = envUrl;
  if (isHostPort) {
    const protocol = tls ? 'rediss' : 'redis';
    const auth = password ? `default:${encodeURIComponent(password)}@` : '';
    raw = `${protocol}://${auth}${envUrl}`;
  } else if (password && !raw.includes('@')) {
    const protocol = raw.startsWith('rediss://') ? 'rediss' : 'redis';
    const hostPart = raw.replace(/^rediss?:\/\//, '');
    raw = `${protocol}://default:${encodeURIComponent(password)}@${hostPart}`;
  }

  const options = {
    maxRetriesPerRequest: null,
    connectTimeout: 10000,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000)),
    ...(tls ? { tls: {} } : {}),
  };

  if (isHostPort) {
    const [host, portStr] = envUrl.split(':');
    options.host = host;
    options.port = parseInt(portStr || '6379', 10);
    if (password) options.password = password;
    if (tls) options.tls = {};
  } else {
    options.url = raw;
    if (tls && !options.tls) options.tls = {};
  }

  return { enabled, url: raw, options };
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/dk_clothing',
  redis: buildRedisConfig(),
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  clientUrl: process.env.CLIENT_URL,
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucket: process.env.AWS_S3_BUCKET,
    region: process.env.AWS_REGION ,
    cloudfrontUrl: process.env.AWS_CLOUDFRONT_URL,
    prefix: process.env.AWS_S3_PREFIX ,
  },
  smtp: {
    host: process.env.SMTP_HOST?.trim(),
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER?.trim(),
    pass: process.env.SMTP_PASS?.replace(/\s+/g, ''),
    fromEmail: (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@dkclothing.com').trim(),
    fromName: process.env.SMTP_FROM_NAME || 'DK Clothing',
  },
  gstRate: parseFloat(process.env.GST_RATE || '18'),
  codEnabled: process.env.COD_ENABLED !== 'false',
  defaultShippingRate: parseFloat(process.env.DEFAULT_SHIPPING_RATE || '99'),
  freeShippingAbove: parseFloat(process.env.FREE_SHIPPING_ABOVE || '999'),
  returnWindowDays: parseInt(process.env.RETURN_WINDOW_DAYS || '3', 10),
};
