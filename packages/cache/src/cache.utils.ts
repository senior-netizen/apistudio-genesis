import { createHash, createHmac } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export type CacheScope = 'global' | 'workspace' | 'user';

const SECRET_PATTERN = /(password|secret|token|jwt|api_key|private_key|otp)/i;
const AUTH_PATTERN = /^authorization$/i;

export interface DetectedConfig {
  redisUrl?: string;
  env?: string;
  releaseVersion?: string;
}

export const defaultEnv = (): string => process.env.NODE_ENV || 'development';

export const hashPrefix = (env: string, scopeId: string): string => {
  return createHash('sha256').update(`${env}:${scopeId}`).digest('hex').slice(0, 12);
};

export const buildCacheKey = (scope: CacheScope, env: string, key: string, scopeId?: string): string => {
  const scopedId = scope === 'global' ? 'global' : scopeId || 'scope';
  const hashed = hashPrefix(env, scopedId);
  const basePrefix = scope === 'global'
    ? `squirrel:${env}:global`
    : scope === 'workspace'
      ? `squirrel:${env}:workspace:${scopeId}`
      : `squirrel:${env}:user:${scopeId}`;
  return `${basePrefix}:${hashed}:${key}`;
};

export const containsSecret = (key: string, value: unknown): boolean => {
  if (SECRET_PATTERN.test(key)) {
    return true;
  }
  const scanValue = (input: unknown): boolean => {
    if (typeof input === 'string') {
      return SECRET_PATTERN.test(input);
    }
    if (!input || typeof input !== 'object') {
      return false;
    }
    if (Array.isArray(input)) {
      return input.some((item) => scanValue(item));
    }
    return Object.entries(input as Record<string, unknown>).some(([k, v]) => SECRET_PATTERN.test(k) || scanValue(v));
  };
  return scanValue(value);
};

export const scrubSensitiveKeys = (input: unknown): unknown => {
  if (!input || typeof input !== 'object') {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => scrubSensitiveKeys(item));
  }

  const entries = Object.entries(input as Record<string, unknown>)
    .filter(([key]) => !AUTH_PATTERN.test(key) && !SECRET_PATTERN.test(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => [key, scrubSensitiveKeys(value)]);

  return Object.fromEntries(entries);
};

export const hasSensitiveSignaturePayload = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') {
    return typeof payload === 'string' ? SECRET_PATTERN.test(payload) : false;
  }
  if (Array.isArray(payload)) {
    return payload.some((item) => hasSensitiveSignaturePayload(item));
  }
  return Object.entries(payload as Record<string, unknown>).some(
    ([key, value]) => AUTH_PATTERN.test(key) || SECRET_PATTERN.test(key) || hasSensitiveSignaturePayload(value),
  );
};

export const sanitizePattern = (pattern?: string): string => {
  if (!pattern || pattern === '*') {
    return 'squirrel:*';
  }
  if (!pattern.startsWith('squirrel:')) {
    return `squirrel:${pattern}`;
  }
  return pattern;
};

const tryLoadModule = async <T>(candidate: string): Promise<T | null> => {
  try {
    const url = pathToFileURL(candidate).href;
    const module = (await import(url)) as T;
    return module;
  } catch (error) {
    return null;
  }
};

export const autoDetectConfig = async (): Promise<DetectedConfig> => {
  const possibleRoots = [process.cwd(), resolve(process.cwd(), '..'), resolve(process.cwd(), '../..')];
  const candidates = possibleRoots.flatMap((root) => [resolve(root, 'config', 'index.js'), resolve(root, 'config', 'index.ts')]);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const loaded = await tryLoadModule<{ appConfig?: { env?: Record<string, string> } }>(candidate);
      if (loaded?.appConfig?.env) {
        const env = loaded.appConfig.env as Record<string, string>;
        return {
          redisUrl: env.REDIS_URL,
          env: env.NODE_ENV,
          releaseVersion: env.APP_VERSION || env.VERSION,
        };
      }
    }
  }

  return {
    redisUrl: process.env.REDIS_URL,
    env: process.env.NODE_ENV,
    releaseVersion: process.env.APP_VERSION || process.env.VERSION || process.env.GIT_SHA,
  };
};

export const shouldBypassCache = (key: string, value: unknown): boolean => containsSecret(key, value);

export const generateEtag = (payload: unknown): string => {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return createHash('sha256').update(serialized).digest('hex');
};

export const normalizeSignaturePayload = (key: string, payload?: unknown): string => {
  const normalized = payload === undefined ? { key } : { key, payload: scrubSensitiveKeys(payload) };
  return JSON.stringify(normalized);
};

export const buildHmacSignature = (secret: string, normalizedData: string): string => {
  return createHmac('sha256', secret).update(normalizedData).digest('hex');
};

export const buildCacheControlHeader = (ttlSeconds: number): string => `public, max-age=${Math.max(0, ttlSeconds)}`;
