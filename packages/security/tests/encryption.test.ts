import { describe, expect, it, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  CachingSecretManager,
  EncryptionStrategy,
  type EncryptedPayload,
  createEncryptionStrategy,
  createEnvSecretManager,
  createLocalKeyProvider,
  verifyServiceIdentity,
} from '../src';

const MASTER_KEY = Buffer.alloc(32, 9);

function buildStrategy(enablePerTenantKeys = true) {
  const provider = createLocalKeyProvider(MASTER_KEY);
  const strategy = createEncryptionStrategy(
    {
      provider: 'local',
      defaultKeyId: 'primary',
      rotationPeriodDays: 90,
      enablePerTenantKeys,
    },
    provider,
  );
  return { provider, strategy };
}

describe('EncryptionStrategy', () => {
  let strategy: EncryptionStrategy;
  let payload: EncryptedPayload;

  beforeEach(async () => {
    const ctx = buildStrategy();
    strategy = ctx.strategy;
    const { wrappedKey } = await ctx.provider.generateDataKey('tenant-a-key');
    strategy.registerTenantKey({
      tenantId: 'tenant-a',
      keyId: 'tenant-a-key',
      provider: 'local',
      wrappedKey,
      createdAt: new Date().toISOString(),
    });
    payload = await strategy.encryptForTenant('tenant-a', 'super-secret-token');
  });

  it('encrypts and decrypts tenant scoped payloads', async () => {
    const decrypted = await strategy.decryptForTenant('tenant-a', payload);
    expect(decrypted.toString()).toBe('super-secret-token');
  });

  it('prevents cross-tenant decryption', async () => {
    await expect(strategy.decryptForTenant('tenant-b', payload)).rejects.toThrow(/Unable to find key/);
  });

  it('supports key rotation and keeps previous keys readable', async () => {
    const oldPayload = payload;
    const rotated = await strategy.rotateTenantKey('tenant-a');
    expect(rotated.keyId).not.toBe(oldPayload.keyId);

    const newPayload = await strategy.encryptForTenant('tenant-a', 'fresh');
    expect(newPayload.keyId).toBe(rotated.keyId);

    const oldDecrypted = await strategy.decryptForTenant('tenant-a', oldPayload);
    const newDecrypted = await strategy.decryptForTenant('tenant-a', newPayload);
    expect(oldDecrypted.toString()).toBe('super-secret-token');
    expect(newDecrypted.toString()).toBe('fresh');
  });
});

describe('Service identity verification', () => {
  const sharedSecret = 'service-secret';
  const token = jwt.sign(
    {
      iss: 'squirrel-api-studio',
      sub: 'service:billing',
      aud: 'squirrel-internal-apis',
      claims: { scopes: ['health.read', 'workspace.read'] },
    },
    sharedSecret,
    { expiresIn: '5m' },
  );

  it('rejects calls without TLS or missing identity', () => {
    const req: any = { protocol: 'http', headers: {} };
    const result = verifyServiceIdentity(req, { sharedSecret, enforceTls: true, audience: 'squirrel-internal-apis' });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('TLS');
  });

  it('denies insufficient scopes', () => {
    const req: any = { protocol: 'https', headers: { authorization: `Bearer ${token}` } };
    const result = verifyServiceIdentity(req, {
      sharedSecret,
      enforceTls: true,
      audience: 'squirrel-internal-apis',
      requiredScopes: ['workspace.write'],
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Missing scopes');
  });

  it('accepts valid service identity with scopes', () => {
    const req: any = { protocol: 'https', headers: { authorization: `Bearer ${token}` } };
    const result = verifyServiceIdentity(req, {
      sharedSecret,
      enforceTls: true,
      audience: 'squirrel-internal-apis',
      issuer: 'squirrel-api-studio',
      requiredScopes: ['workspace.read'],
    });
    expect(result.valid).toBe(true);
    expect(result.claims?.sub).toBe('service:billing');
  });
});

describe('Secret manager', () => {
  it('caches loaded secrets', async () => {
    let loadCount = 0;
    const manager = new CachingSecretManager({
      loader: async () => {
        loadCount += 1;
        return 'value';
      },
      cacheTtlMs: 10_000,
    });
    await manager.getSecret('a');
    await manager.getSecret('a');
    expect(loadCount).toBe(1);
  });

  it('throws when secret is missing', async () => {
    const manager = createEnvSecretManager('TEST_SECRET_');
    await expect(manager.getSecret('UNSET')).rejects.toThrow(/missing/);
  });
});
