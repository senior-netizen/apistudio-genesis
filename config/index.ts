import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

const envFiles = ['.env', '.env.local'];

// Search multiple base directories so workspaces can run from their own CWD
// while still picking up the repo‑root env (e.g., running scripts from apps/api-legacy).
const baseDirs = [
  // monorepo root (common when running from apps/*)
  resolve(process.cwd(), '..', '..'),
  // workspace root
  process.cwd(),
];

for (const base of baseDirs) {
  for (const file of envFiles) {
    const fullPath = resolve(base, file);
    if (existsSync(fullPath)) {
      loadEnv({ path: fullPath, override: false });
    }
  }
}

const baseEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(0).max(65535).default(4000),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    REFRESH_SECRET: z.string().min(32),
    COOKIE_SECRET: z.string().min(16),
    OAUTH_GOOGLE_CLIENT_ID: z.string().optional(),
    OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
    OAUTH_GITHUB_CLIENT_ID: z.string().optional(),
    OAUTH_GITHUB_CLIENT_SECRET: z.string().optional(),
    APP_BASE_URL: z.string().url().optional(),
    DEVICE_VERIFICATION_URL: z.string().url().optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
    OTEL_CONSOLE_EXPORTER_ENABLED: z
      .string()
      .optional()
      .transform((value) => value === 'true'),
    PROMETHEUS_ENABLED: z
      .string()
      .optional()
      .transform((value) => value === 'true'),
    FEATURE_FLAGS: z.string().optional(),
    CORS_ALLOWED_ORIGINS: z.string().optional(),
  })
;

const envSchema = baseEnvSchema.superRefine((data, ctx) => {
  if (data.NODE_ENV !== 'development' && !data.OTEL_EXPORTER_OTLP_ENDPOINT) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'OTEL_EXPORTER_OTLP_ENDPOINT is required outside development',
      path: ['OTEL_EXPORTER_OTLP_ENDPOINT'],
    });
  }
});

type EnvSchema = z.infer<typeof envSchema>;

export interface FeatureFlagConfig {
  [flag: string]: boolean;
}

export interface AppConfig {
  env: EnvSchema;
  featureFlags: FeatureFlagConfig;
}

const rawEnv: Partial<Record<keyof EnvSchema, string>> = {} as Partial<Record<keyof EnvSchema, string>>;
for (const key of Object.keys(baseEnvSchema.shape) as (keyof EnvSchema)[]) {
  if (process.env[key]) {
    rawEnv[key] = process.env[key] as string;
  }
}

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  const formatted = parsed.error.format();
  const message = JSON.stringify(formatted, null, 2);
  throw new Error(`Invalid environment configuration.\n${message}`);
}

const featureFlags: FeatureFlagConfig = {};
const flagsFromEnv = parsed.data.FEATURE_FLAGS;
if (flagsFromEnv) {
  const pairs = flagsFromEnv.split(',').map((token) => token.trim()).filter(Boolean);
  for (const pair of pairs) {
    const [flag, value] = pair.split('=').map((token) => token.trim());
    if (flag) {
      featureFlags[flag] = value === 'true';
    }
  }
}

export const appConfig: AppConfig = {
  env: parsed.data,
  featureFlags,
};

export function isFeatureEnabled(flag: string, defaultValue = false): boolean {
  if (flag in featureFlags) {
    return featureFlags[flag];
  }
  const envValue = process.env[`FEATURE_${flag.toUpperCase()}`];
  if (envValue) {
    return envValue === 'true';
  }
  return defaultValue;
}

export function readFileIfExists(path: string): string | undefined {
  const absolute = resolve(process.cwd(), path);
  if (!existsSync(absolute)) {
    return undefined;
  }
  return readFileSync(absolute, 'utf8');
}

export type { EnvSchema };
