import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redis as any,
    prefix: 'rl:global:',
  }),
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP',
});

export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis as any,
    prefix: 'rl:auth:',
  }),
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts',
});

export const paymentLimiter = rateLimit({
  store: new RedisStore({
    client: redis as any,
    prefix: 'rl:payment:',
  }),
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many payment requests',
});
