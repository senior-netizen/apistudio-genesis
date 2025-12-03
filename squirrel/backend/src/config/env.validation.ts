import { z } from 'zod';

const DEFAULT_ENC_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='; // 32 bytes of zeros in base64

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(8080),
    CORS_ORIGINS: z.string().optional(),
    OWNER_EMAIL: z.string().email().default('founder@example.com'),
    OWNER_PASSWORD: z.string().min(8).default('founder-dev-password'),
    AUTH_DEV_BYPASS: z.coerce.boolean().default(false),
    // When true, backend runs without Redis/Bull/adapter; rate limiting becomes a no-op
    REDIS_DISABLED: z.coerce.boolean().default(false),
    COLLAB_ENABLED: z.coerce.boolean().default(true),
    LIVE_LOGS_ENABLED: z.coerce.boolean().default(true),
    PAIR_DEBUG_ENABLED: z.coerce.boolean().default(true),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required').default('change_me'),
    JWT_EXPIRES_IN: z.string().min(1).default('15m'),
    REFRESH_EXPIRES_IN: z
      .string()
      .regex(/^[0-9]+d$/, 'REFRESH_EXPIRES_IN must be expressed in days (e.g. 7d)')
      .default('7d'),
    RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(600),
    REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
    WS_REDIS_HOST: z.string().min(1).default('localhost'),
    WS_REDIS_PORT: z.coerce.number().int().positive().default(6379),
    // Treat empty string as undefined and fall back to a safe dev default
    ENCRYPTION_KEY_BASE64: z
      .union([z.string(), z.undefined()])
      .transform((v) => (v && v.length > 0 ? v : DEFAULT_ENC_KEY)),
    OTEL_SERVICE_NAME: z.string().min(1).default('squirrel-backend'),
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .default('postgresql://postgres:postgres@localhost:5432/squirrel'),
    PAYNOW_INTEGRATION_ID: z.string().min(1).default('paynow_test_id'),
    PAYNOW_INTEGRATION_KEY: z.string().min(1).default('paynow_test_key'),
    PAYNOW_RESULT_URL: z.string().url().default('http://localhost:3000/paynow/result'),
    PAYNOW_RETURN_URL: z.string().url().default('http://localhost:3000/paynow/return'),
    PAYNOW_PRO_MONTHLY_AMOUNT: z.coerce.number().default(29.99),
    PAYNOW_PRO_YEARLY_AMOUNT: z.coerce.number().default(299.99),
    BILLING_SUCCESS_URL: z.string().url().default('http://localhost:3000/billing/success'),
    BILLING_CANCEL_URL: z.string().url().default('http://localhost:3000/billing/cancel'),
    MARKETPLACE_SUCCESS_URL: z.string().url().default('http://localhost:3000/marketplace/success'),
    MARKETPLACE_CANCEL_URL: z.string().url().default('http://localhost:3000/marketplace/cancel'),
    BILLING_LEDGER_CURRENCY: z.string().default('usd'),
    SYNC_VECTOR_CLOCK_TTL_SEC: z.coerce.number().int().positive().default(3600),
    SYNC_VECTOR_DIVERGENCE_THRESHOLD: z.coerce.number().int().positive().default(25),
    SYNC_PRESENCE_TTL_SEC: z.coerce.number().int().positive().default(60),
    CSRF_SECRET: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (env.AUTH_DEV_BYPASS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AUTH_DEV_BYPASS'],
          message: 'AUTH_DEV_BYPASS cannot be enabled in production.',
        });
      }
      if (env.REDIS_DISABLED) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['REDIS_DISABLED'],
          message: 'REDIS_DISABLED cannot be true in production because Redis-backed safeguards are required.',
        });
      }
    }
  });

export type EnvSchema = z.infer<typeof envSchema>;
