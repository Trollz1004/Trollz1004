import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const normalizeKey = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.includes('-----BEGIN')) {
    return trimmed.replace(/\\n/g, '\n');
  }

  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    if (decoded.includes('-----BEGIN')) {
      return decoded;
    }
  } catch (error) {
    console.warn('Failed to base64 decode key, falling back to raw value');
  }

  return trimmed;
};

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().integer().min(0).max(65535).default(4000),
  FRONTEND_URL: Joi.string().uri().required(),

  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_HOST: Joi.string().hostname().required(),
  DB_PORT: Joi.number().integer().min(1).max(65535).default(5432),
  DB_NAME: Joi.string().required(),

  JWT_PUBLIC_KEY: Joi.string().required(),
  JWT_PRIVATE_KEY: Joi.string().required(),
  ACCESS_TOKEN_TTL: Joi.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().min(1).max(180).default(30),
  REFRESH_TOKEN_PEPPER: Joi.string().min(32).required(),

  VERIFICATION_CODE_PEPPER: Joi.string().min(16).required(),
  PHONE_SALT: Joi.string().min(16).required(),
  ENCRYPTION_SECRET: Joi.string().min(32).required(),

  FIREBASE_SERVICE_ACCOUNT_KEY: Joi.string().allow('').optional(),

  REDIS_URL: Joi.string().uri().allow('').optional(),

  SQUARE_ACCESS_TOKEN: Joi.string().min(20).required(),
  SQUARE_ENVIRONMENT: Joi.string().valid('sandbox', 'production').default('production'),

  EMAIL_SMTP_HOST: Joi.string().allow('').optional(),
  EMAIL_SMTP_PORT: Joi.number().integer().min(1).max(65535).allow(null, '').optional(),
  EMAIL_SMTP_USER: Joi.string().allow('').optional(),
  EMAIL_SMTP_PASSWORD: Joi.string().allow('').optional(),
  EMAIL_FROM_ADDRESS: Joi.string().email().allow('').optional(),

  ANTHROPIC_CLIENT_ID: Joi.string().allow('').optional(),
  ANTHROPIC_CLIENT_SECRET: Joi.string().allow('').optional(),
  ANTHROPIC_REDIRECT_URI: Joi.string().uri().allow('').optional(),
  ANTHROPIC_AUTH_URL: Joi.string().uri().default('https://console.anthropic.com/oauth/authorize'),
  ANTHROPIC_TOKEN_URL: Joi.string().uri().default('https://console.anthropic.com/oauth/token'),
  ANTHROPIC_API_URL: Joi.string().uri().default('https://api.anthropic.com'),

  OLLAMA_ENABLED: Joi.boolean().default(true),
  OLLAMA_BASE_URL: Joi.string().uri().default('http://localhost:11434'),
  OLLAMA_DEFAULT_MODEL: Joi.string().default('llama3.2'),

  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
}).unknown(true);

const { value: envVars, error } = envSchema.validate(process.env, {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: false,
});

if (error) {
  throw new Error(`Invalid environment configuration: ${error.message}`);
}

const decodeKeyOrThrow = (key: string, name: string): string => {
  const normalized = normalizeKey(key);
  if (!normalized) {
    throw new Error(`${name} is not provided`);
  }
  return normalized;
};

const refreshTokenTtlMs = envVars.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

const config = {
  env: envVars.NODE_ENV as 'development' | 'test' | 'production',
  port: envVars.PORT as number,
  frontendUrl: envVars.FRONTEND_URL as string,
  db: {
    user: envVars.DB_USER as string,
    password: envVars.DB_PASSWORD as string,
    host: envVars.DB_HOST as string,
    port: envVars.DB_PORT as number,
    name: envVars.DB_NAME as string,
  },
  auth: {
    publicKey: decodeKeyOrThrow(envVars.JWT_PUBLIC_KEY as string, 'JWT_PUBLIC_KEY'),
    privateKey: decodeKeyOrThrow(envVars.JWT_PRIVATE_KEY as string, 'JWT_PRIVATE_KEY'),
    accessTokenTtl: envVars.ACCESS_TOKEN_TTL as string,
    refreshTokenTtlDays: envVars.REFRESH_TOKEN_TTL_DAYS as number,
    refreshTokenTtlMs,
    refreshTokenPepper: envVars.REFRESH_TOKEN_PEPPER as string,
  },
  verification: {
    codePepper: envVars.VERIFICATION_CODE_PEPPER as string,
    phoneSalt: envVars.PHONE_SALT as string,
  },
  security: {
    encryptionSecret: envVars.ENCRYPTION_SECRET as string,
  },
  firebase: {
    serviceAccountKey: envVars.FIREBASE_SERVICE_ACCOUNT_KEY as string | undefined,
  },
  redis: {
    url: envVars.REDIS_URL as string | undefined,
  },
  square: {
    accessToken: envVars.SQUARE_ACCESS_TOKEN as string,
    environment: envVars.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
  },
  email: {
    host: envVars.EMAIL_SMTP_HOST as string | undefined,
    port: envVars.EMAIL_SMTP_PORT ? Number(envVars.EMAIL_SMTP_PORT) : undefined,
    user: envVars.EMAIL_SMTP_USER as string | undefined,
    password: envVars.EMAIL_SMTP_PASSWORD as string | undefined,
    from: envVars.EMAIL_FROM_ADDRESS as string | undefined,
  },
  anthropic: {
    clientId: envVars.ANTHROPIC_CLIENT_ID as string | undefined,
    clientSecret: envVars.ANTHROPIC_CLIENT_SECRET as string | undefined,
    redirectUri: envVars.ANTHROPIC_REDIRECT_URI as string | undefined,
    authUrl: envVars.ANTHROPIC_AUTH_URL as string,
    tokenUrl: envVars.ANTHROPIC_TOKEN_URL as string,
    apiUrl: envVars.ANTHROPIC_API_URL as string,
  },
  ollama: {
    enabled: envVars.OLLAMA_ENABLED === 'true' || envVars.OLLAMA_ENABLED === true,
    baseUrl: envVars.OLLAMA_BASE_URL as string,
    defaultModel: envVars.OLLAMA_DEFAULT_MODEL as string,
  },
  logLevel: envVars.LOG_LEVEL as string,
};

export default config;
