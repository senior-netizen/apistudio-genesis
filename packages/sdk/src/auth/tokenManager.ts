import type { TokenStorage, TokenUpdate, RefreshHandler } from './types';

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padding);
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder().decode(bytes);
    }
    return binary;
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf8');
  }
  throw new Error('Base64 decoding is not supported in this environment.');
}

function extractJwtExpiration(token: string): number | null {
  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }
  try {
    const payloadSegment = segments[1];
    const decoded = decodeBase64Url(payloadSegment);
    const payload = JSON.parse(decoded) as { exp?: number };
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000;
    }
    return null;
  } catch (error) {
    console.warn('[TokenManager] Failed to parse JWT payload', error);
    return null;
  }
}

export interface TokenManagerOptions {
  storage: TokenStorage;
  clock?: () => number;
  leewayMs?: number;
}

export class TokenManager {
  private readonly storage: TokenStorage;
  private readonly clock: () => number;
  private readonly leewayMs: number;
  private accessToken: string | null = null;
  private accessExpiresAt: number | null = null;
  private refreshToken: string | null = null;
  private hydrated = false;
  private hydrationPromise: Promise<void> | null = null;
  private refreshPromise: Promise<string | null> | null = null;
  private refreshHandler: RefreshHandler | null = null;
  private readonly sessionExpiredListeners = new Set<() => void>();

  constructor(options: TokenManagerOptions) {
    this.storage = options.storage;
    this.clock = options.clock ?? (() => Date.now());
    this.leewayMs = options.leewayMs ?? 10_000;
  }

  setRefreshHandler(handler: RefreshHandler | null) {
    this.refreshHandler = handler;
  }

  onSessionExpired(listener: () => void): () => void {
    this.sessionExpiredListeners.add(listener);
    return () => this.sessionExpiredListeners.delete(listener);
  }

  async applyTokens(update: TokenUpdate): Promise<void> {
    await this.ensureHydrated();
    if (Object.prototype.hasOwnProperty.call(update, 'accessToken')) {
      this.setAccessToken(update.accessToken ?? null);
    }
    if (Object.prototype.hasOwnProperty.call(update, 'refreshToken')) {
      this.refreshToken = update.refreshToken ?? null;
      if (this.refreshToken) {
        await this.storage.write(this.refreshToken);
      } else {
        await this.storage.write(null);
      }
    }
  }

  async clear(options?: { silent?: boolean }): Promise<void> {
    await this.applyTokens({ accessToken: null, refreshToken: null });
    if (!options?.silent) {
      this.notifySessionExpired();
    }
  }

  getCachedAccessToken(): string | null {
    return this.accessToken;
  }

  async getRefreshToken(): Promise<string | null> {
    await this.ensureHydrated();
    return this.refreshToken;
  }

  async ensureAccessToken(): Promise<string | null> {
    await this.ensureHydrated();
    if (this.accessToken && !this.isAccessExpired()) {
      return this.accessToken;
    }
    return this.refreshInternal();
  }

  async forceRefresh(): Promise<string | null> {
    await this.ensureHydrated();
    return this.refreshInternal(true);
  }

  private async ensureHydrated(): Promise<void> {
    if (this.hydrated) {
      return;
    }
    if (!this.hydrationPromise) {
      this.hydrationPromise = (async () => {
        this.refreshToken = await this.storage.read();
        this.hydrated = true;
      })().finally(() => {
        this.hydrationPromise = null;
      });
    }
    await this.hydrationPromise;
  }

  private setAccessToken(token: string | null) {
    this.accessToken = token;
    this.accessExpiresAt = token ? extractJwtExpiration(token) : null;
  }

  private isAccessExpired(): boolean {
    if (!this.accessToken) {
      return true;
    }
    if (!this.accessExpiresAt) {
      return false;
    }
    return this.accessExpiresAt - this.leewayMs <= this.clock();
  }

  private async refreshInternal(force = false): Promise<string | null> {
    if (!this.refreshToken || !this.refreshHandler) {
      await this.clear();
      return null;
    }
    if (this.refreshPromise) {
      if (!force) {
        return this.refreshPromise;
      }
      try {
        await this.refreshPromise;
      } catch {
        // Swallow the error; a new refresh attempt will follow below.
      }
    }
    this.refreshPromise = (async () => {
      try {
        const result = await this.refreshHandler!(this.refreshToken!);
        if (!result || !result.accessToken) {
          await this.clear();
          return null;
        }
        await this.applyTokens(result);
        return this.accessToken;
      } catch (error) {
        console.warn('[TokenManager] Refresh handler failed', error);
        await this.clear();
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();
    return this.refreshPromise;
  }

  private notifySessionExpired() {
    for (const listener of this.sessionExpiredListeners) {
      try {
        listener();
      } catch (error) {
        console.error('[TokenManager] Session expired listener failed', error);
      }
    }
  }
}
