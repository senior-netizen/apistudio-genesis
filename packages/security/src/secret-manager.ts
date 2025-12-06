export interface SecretManager {
  getSecret(key: string): Promise<string>;
}

export interface CachingSecretManagerOptions {
  loader: (key: string) => Promise<string>;
  cacheTtlMs?: number;
}

export class CachingSecretManager implements SecretManager {
  private cache = new Map<string, { value: string; expiresAt: number }>();
  private readonly cacheTtlMs: number;
  private readonly loader: (key: string) => Promise<string>;

  constructor(options: CachingSecretManagerOptions) {
    this.cacheTtlMs = options.cacheTtlMs ?? 5 * 60 * 1000;
    this.loader = options.loader;
  }

  async getSecret(key: string): Promise<string> {
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }
    const value = await this.loader(key);
    if (!value) {
      throw new Error(`Secret ${key} is unavailable`);
    }
    this.cache.set(key, { value, expiresAt: now + this.cacheTtlMs });
    return value;
  }
}

export function createEnvSecretManager(prefix = 'SECRET_'): SecretManager {
  return new CachingSecretManager({
    loader: async (key) => {
      const fullKey = `${prefix}${key}`;
      const value = process.env[fullKey];
      if (!value) {
        throw new Error(`Secret ${fullKey} missing from environment`);
      }
      return value;
    },
  });
}
