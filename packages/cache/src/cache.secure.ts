import type { CacheContext, CacheService } from './cache.service';
import {
  buildHmacSignature,
  hasSensitiveSignaturePayload,
  normalizeSignaturePayload,
  CacheScope,
} from './cache.utils';

interface SecureCacheOptions {
  secret?: string;
  debug: boolean;
  logger: { info: (...args: unknown[]) => void };
}

interface SecureEntry<T> {
  signature?: string;
  value: T;
}

export class SecureCache {
  constructor(private readonly cache: CacheService, private readonly options: SecureCacheOptions) {}

  async wrap<T>(
    key: string,
    ttlSeconds: number | undefined,
    fetchFn: () => Promise<T>,
    signaturePayload?: unknown,
    context?: CacheContext,
  ): Promise<T> {
    const existing = await this.get<T>(key, signaturePayload, context);
    if (existing !== null && existing !== undefined) {
      return existing;
    }
    const result = await fetchFn();
    await this.set(key, result, ttlSeconds, signaturePayload, context);
    return result;
  }

  async get<T>(key: string, signaturePayload?: unknown, context?: CacheContext): Promise<T | null> {
    const signature = this.computeSignature(key, signaturePayload);
    if (signature.bypass) {
      this.log('cache-secure-miss', key, context?.scope);
      return null;
    }
    const namespacedKey = this.decorateKey(key, signature.signature);
    const entry = await this.cache.get<SecureEntry<T>>(namespacedKey, context);
    if (!entry) {
      this.log('cache-secure-miss', namespacedKey, context?.scope);
      return null;
    }
    if (signature.signature && entry.signature !== signature.signature) {
      this.log('cache-secure-integrity-failed', namespacedKey, context?.scope);
      await this.cache.invalidate(namespacedKey, context);
      return null;
    }
    this.log('cache-secure-hit', namespacedKey, context?.scope);
    return entry.value as T;
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds?: number,
    signaturePayload?: unknown,
    context?: CacheContext,
  ): Promise<void> {
    const signature = this.computeSignature(key, signaturePayload);
    if (signature.bypass) {
      return;
    }
    const namespacedKey = this.decorateKey(key, signature.signature);
    const entry: SecureEntry<unknown> = signature.signature ? { signature: signature.signature, value } : { value };
    await this.cache.set(namespacedKey, entry, ttlSeconds, context);
  }

  async invalidate(key: string, signaturePayload?: unknown, context?: CacheContext): Promise<void> {
    const signature = this.computeSignature(key, signaturePayload);
    const namespacedKey = this.decorateKey(key, signature.signature);
    await this.cache.invalidate(namespacedKey, context);
  }

  private decorateKey(key: string, signature?: string): string {
    return signature ? `${key}::${signature}` : key;
  }

  private computeSignature(key: string, signaturePayload?: unknown): { signature?: string; bypass: boolean } {
    const secret = this.options.secret || process.env.CACHE_HMAC_SECRET;
    if (!secret) {
      return { bypass: false };
    }
    if (signaturePayload && hasSensitiveSignaturePayload(signaturePayload)) {
      return { bypass: true };
    }
    const normalized = normalizeSignaturePayload(key, signaturePayload);
    const signature = buildHmacSignature(secret, normalized);
    return { signature, bypass: false };
  }

  private log(event: string, key: string, scope?: CacheScope): void {
    const debugEnabled = this.options.debug || process.env.CACHE_DEBUG === 'true';
    if (!debugEnabled) {
      return;
    }
    const scopeLabel = scope ? `[${scope}]` : '';
    const displayKey = key.split('::')[0];
    this.options.logger.info(`[${event}]${scopeLabel} ${displayKey}`);
  }
}
