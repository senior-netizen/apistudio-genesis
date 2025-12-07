import { registerAs } from '@nestjs/config';
import { envSchema } from './env.validation';

type JwtConfig = {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
};

type RateLimitConfig = {
  windowSec: number;
  maxRequests: number;
};

type RedisConfig = {
  enabled: boolean;
  url: string;
  wsHost: string;
  wsPort: number;
};

type FeatureFlags = {
  collabEnabled: boolean;
  liveLogsEnabled: boolean;
  pairDebugEnabled: boolean;
};

type OwnerConfig = {
  email?: string;
  password?: string;
};

type BillingConfig = {
  paynowIntegrationId: string;
  paynowIntegrationKey: string;
  paynowResultUrl: string;
  paynowReturnUrl: string;
  proMonthlyAmount: number;
  proYearlyAmount: number;
  billingSuccessUrl: string;
  billingCancelUrl: string;
  marketplaceSuccessUrl: string;
  marketplaceCancelUrl: string;
  ledgerCurrency: string;
};

type SyncConfig = {
  vectorClockTtlSec: number;
  divergenceThreshold: number;
  presenceTtlSec: number;
};

type DataResidencyConfig = {
  enabled: boolean;
  strictOrgRegionLock: boolean;
  strictWorkspaceRegionLock: boolean;
};

type MagicInviteConfig = {
  enabled: boolean;
  defaultTtlHours: number;
  baseUrl: string;
};

type AppConfig = {
  nodeEnv: string;
  port: number;
  corsOrigins: string[];
  jwt: JwtConfig;
  rateLimit: RateLimitConfig;
  redis: RedisConfig;
  encryptionKey: Buffer;
  otelServiceName: string;
  features: FeatureFlags;
  billing: BillingConfig;
  owner: OwnerConfig;
  authDeveloperBypass: boolean;
  csrfSecret: string;
  sync: SyncConfig;
  dataResidency: DataResidencyConfig;
  magicInvites: MagicInviteConfig;
};

export default registerAs('app', (): AppConfig => {
  const env = envSchema.parse(process.env);
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = env.DATABASE_URL;
  }
  if (!process.env.OWNER_EMAIL) {
    process.env.OWNER_EMAIL = env.OWNER_EMAIL;
  }
  const cors = env.CORS_ORIGINS?.split(',').map((v) => v.trim()).filter(Boolean) ?? [];
  const encryptionKey = Buffer.from(env.ENCRYPTION_KEY_BASE64, 'base64');
  if (encryptionKey.byteLength !== 32) {
    throw new Error('ENCRYPTION_KEY_BASE64 must decode to 32 bytes');
  }

  if (env.NODE_ENV === 'production') {
    if (env.JWT_SECRET === 'change_me') {
      throw new Error('In production, JWT_SECRET must be set to a strong value');
    }
    const defaultEnc = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    if (env.ENCRYPTION_KEY_BASE64 === defaultEnc) {
      throw new Error('In production, ENCRYPTION_KEY_BASE64 must be set to a unique 32-byte key (base64)');
    }
  }

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    corsOrigins: cors,
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
      refreshExpiresIn: env.REFRESH_EXPIRES_IN,
    },
    rateLimit: {
      windowSec: env.RATE_LIMIT_WINDOW_SEC,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },
    redis: {
      enabled: !env.REDIS_DISABLED,
      url: env.REDIS_URL,
      wsHost: env.WS_REDIS_HOST,
      wsPort: env.WS_REDIS_PORT,
    },
    encryptionKey,
    otelServiceName: env.OTEL_SERVICE_NAME,
    authDeveloperBypass: env.AUTH_DEV_BYPASS,
    features: {
      collabEnabled: env.COLLAB_ENABLED,
      liveLogsEnabled: env.LIVE_LOGS_ENABLED,
      pairDebugEnabled: env.PAIR_DEBUG_ENABLED,
    },
    billing: {
      paynowIntegrationId: env.PAYNOW_INTEGRATION_ID,
      paynowIntegrationKey: env.PAYNOW_INTEGRATION_KEY,
      paynowResultUrl: env.PAYNOW_RESULT_URL,
      paynowReturnUrl: env.PAYNOW_RETURN_URL,
      proMonthlyAmount: env.PAYNOW_PRO_MONTHLY_AMOUNT,
      proYearlyAmount: env.PAYNOW_PRO_YEARLY_AMOUNT,
      billingSuccessUrl: env.BILLING_SUCCESS_URL,
      billingCancelUrl: env.BILLING_CANCEL_URL,
      marketplaceSuccessUrl: env.MARKETPLACE_SUCCESS_URL,
      marketplaceCancelUrl: env.MARKETPLACE_CANCEL_URL,
      ledgerCurrency: env.BILLING_LEDGER_CURRENCY,
    },
    owner: {
      email: env.OWNER_EMAIL,
      password: env.OWNER_PASSWORD,
    },
    csrfSecret: env.CSRF_SECRET || env.JWT_SECRET,
    sync: {
      vectorClockTtlSec: env.SYNC_VECTOR_CLOCK_TTL_SEC,
      divergenceThreshold: env.SYNC_VECTOR_DIVERGENCE_THRESHOLD,
      presenceTtlSec: env.SYNC_PRESENCE_TTL_SEC,
    },
    dataResidency: {
      enabled: env.DATA_RESIDENCY_ENABLED,
      strictOrgRegionLock: env.DATA_RESIDENCY_STRICT_ORG_LOCK,
      strictWorkspaceRegionLock: env.DATA_RESIDENCY_STRICT_WORKSPACE_LOCK,
    },
    magicInvites: {
      enabled: env.MAGIC_INVITES_ENABLED,
      defaultTtlHours: env.MAGIC_INVITES_DEFAULT_TTL_HOURS,
      baseUrl: env.MAGIC_INVITES_BASE_URL,
    },
  };
});
