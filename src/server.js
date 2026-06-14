import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { connectDB } from './config/db.js';
import { connectRedis } from './config/redis.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(cookieParser());
app.use('/api/v1/webhooks/razorpay', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body;
  try {
    req.body = JSON.parse(req.body.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', routes);

app.use(errorHandler);

async function start() {
  await connectDB();
  try {
    await connectRedis();
  } catch (err) {
    console.warn('Redis connection failed, some features may be limited:', err.message);
  }

  app.listen(config.port, () => {
    console.log(`DK Clothing API running on port ${config.port}`);
  });
}

start().catch(console.error);
