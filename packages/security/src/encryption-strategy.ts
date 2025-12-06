import crypto from 'node:crypto';

export type KeyProvider = 'local' | 'aws-kms' | 'gcp-kms' | 'azure-key-vault';

export interface EncryptionConfig {
  provider: KeyProvider;
  defaultKeyId: string;
  rotationPeriodDays: number;
  enablePerTenantKeys: boolean;
}

export interface EncryptedPayload {
  keyId: string;
  algorithm: string;
  iv: string;
  ciphertext: string;
  createdAt: string;
  tenantId?: string;
}

export interface TenantKeyDescriptor {
  tenantId: string;
  keyId: string;
  provider: KeyProvider;
  wrappedKey: string;
  createdAt: string;
  rotationPolicyDays?: number;
  previousKeys?: TenantKeyDescriptor[];
}

export interface KeyProviderClient {
  id: KeyProvider;
  wrapKey(plaintextKey: Buffer, keyId: string): Promise<{ wrappedKey: string; keyId: string }>;
  unwrapKey(wrappedKey: string, keyId: string): Promise<Buffer>;
  generateDataKey(keyId: string): Promise<{ plaintextKey: Buffer; wrappedKey: string; keyId: string }>;
}

class LocalKeyProvider implements KeyProviderClient {
  id: KeyProvider = 'local';
  private readonly masterKey: Buffer;

  constructor(masterKey?: Buffer) {
    this.masterKey = masterKey ?? crypto.randomBytes(32);
    if (this.masterKey.byteLength !== 32) {
      throw new Error('LocalKeyProvider master key must be 32 bytes');
    }
  }

  async wrapKey(plaintextKey: Buffer, keyId: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintextKey), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      keyId,
      wrappedKey: Buffer.concat([iv, tag, ciphertext]).toString('base64'),
    };
  }

  async unwrapKey(wrappedKey: string) {
    const data = Buffer.from(wrappedKey, 'base64');
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const ciphertext = data.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext;
  }

  async generateDataKey(keyId: string) {
    const plaintextKey = crypto.randomBytes(32);
    const { wrappedKey } = await this.wrapKey(plaintextKey, keyId);
    return { plaintextKey, wrappedKey, keyId };
  }
}

const ALGORITHM = 'aes-256-gcm';

interface EncryptionState {
  tenants: Map<string, TenantKeyDescriptor>;
  provider: KeyProviderClient;
  config: EncryptionConfig;
  defaultKey?: TenantKeyDescriptor;
}

export class EncryptionStrategy {
  private readonly state: EncryptionState;

  constructor(config: EncryptionConfig, provider?: KeyProviderClient) {
    this.state = {
      tenants: new Map(),
      provider: provider ?? new LocalKeyProvider(),
      config,
    };
  }

  private async ensureDefaultKey(keyId: string) {
    if (this.state.defaultKey) return this.state.defaultKey;
    const { wrappedKey } = await this.state.provider.generateDataKey(keyId);
    const descriptor: TenantKeyDescriptor = {
      tenantId: 'shared',
      keyId,
      provider: this.state.provider.id,
      wrappedKey,
      createdAt: new Date().toISOString(),
    };
    this.state.defaultKey = descriptor;
    return descriptor;
  }

  private async unwrapTenantKey(descriptor: TenantKeyDescriptor) {
    return this.state.provider.unwrapKey(descriptor.wrappedKey, descriptor.keyId);
  }

  registerTenantKey(descriptor: TenantKeyDescriptor) {
    this.state.tenants.set(descriptor.tenantId, descriptor);
  }

  getTenantKey(tenantId: string): TenantKeyDescriptor | undefined {
    return this.state.tenants.get(tenantId);
  }

  async encryptForTenant(tenantId: string, plaintext: Buffer | string): Promise<EncryptedPayload> {
    const descriptor = await this.resolveTenantDescriptor(tenantId);
    const dataKey = await this.unwrapTenantKey(descriptor);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, dataKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      keyId: descriptor.keyId,
      algorithm: ALGORITHM,
      iv: iv.toString('base64'),
      ciphertext: Buffer.concat([ciphertext, tag]).toString('base64'),
      createdAt: new Date().toISOString(),
      tenantId: descriptor.tenantId === 'shared' ? undefined : descriptor.tenantId,
    };
  }

  async decryptForTenant(tenantId: string, payload: EncryptedPayload): Promise<Buffer> {
    if (payload.tenantId && payload.tenantId !== tenantId) {
      throw new Error('Tenant mismatch for encrypted payload');
    }
    const descriptor = await this.findDescriptorForPayload(tenantId, payload.keyId);
    const dataKey = await this.unwrapTenantKey(descriptor);
    const iv = Buffer.from(payload.iv, 'base64');
    const raw = Buffer.from(payload.ciphertext, 'base64');
    const tag = raw.subarray(raw.length - 16);
    const ciphertext = raw.subarray(0, raw.length - 16);
    const decipher = crypto.createDecipheriv(ALGORITHM, dataKey, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext;
  }

  async rotateTenantKey(tenantId: string): Promise<TenantKeyDescriptor> {
    const current = await this.resolveTenantDescriptor(tenantId);
    const keySuffix = crypto.randomUUID();
    const newKeyId = `${tenantId}-${keySuffix}`;
    const { wrappedKey } = await this.state.provider.generateDataKey(newKeyId);
    const rotated: TenantKeyDescriptor = {
      tenantId,
      keyId: newKeyId,
      provider: this.state.provider.id,
      wrappedKey,
      createdAt: new Date().toISOString(),
      previousKeys: [current, ...(current.previousKeys ?? [])],
    };
    this.state.tenants.set(tenantId, rotated);
    return rotated;
  }

  private async resolveTenantDescriptor(tenantId: string): Promise<TenantKeyDescriptor> {
    const descriptor = this.state.tenants.get(tenantId);
    if (descriptor) return descriptor;
    if (!this.state.config.enablePerTenantKeys) {
      return this.ensureDefaultKey(this.state.config.defaultKeyId);
    }
    const generatedKeyId = `${tenantId}-${this.state.config.defaultKeyId}`;
    return this.createAndStoreTenantKey(tenantId, generatedKeyId);
  }

  private async findDescriptorForPayload(tenantId: string, keyId: string): Promise<TenantKeyDescriptor> {
    const descriptor = this.state.tenants.get(tenantId);
    if (descriptor?.keyId === keyId) return descriptor;
    if (descriptor?.previousKeys) {
      const match = descriptor.previousKeys.find((k) => k.keyId === keyId);
      if (match) return match;
    }
    if (!this.state.config.enablePerTenantKeys) {
      const defaultKey = await this.ensureDefaultKey(this.state.config.defaultKeyId);
      if (defaultKey.keyId === keyId || keyId === this.state.config.defaultKeyId) {
        return defaultKey;
      }
    }
    throw new Error('Unable to find key for payload');
  }

  private async createAndStoreTenantKey(tenantId: string, keyId: string): Promise<TenantKeyDescriptor> {
    const { wrappedKey } = await this.state.provider.generateDataKey(keyId);
    const descriptor: TenantKeyDescriptor = {
      tenantId,
      keyId,
      provider: this.state.provider.id,
      wrappedKey,
      createdAt: new Date().toISOString(),
    };
    this.state.tenants.set(tenantId, descriptor);
    return descriptor;
  }
}

export function createEncryptionStrategy(config: EncryptionConfig, provider?: KeyProviderClient) {
  return new EncryptionStrategy(config, provider);
}

export function createLocalKeyProvider(masterKey?: Buffer) {
  return new LocalKeyProvider(masterKey);
}
