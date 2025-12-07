import { getRegion, type RegionCode } from './registry.js';

export interface EncryptedPayload {
  ciphertext: string;
  regionCode: RegionCode;
  keyAlias?: string;
  iv: string;
}

function ensureBuffer(input: Buffer | string): Buffer {
  return typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
}

export function encryptForTenant(
  tenantId: string,
  regionCode: RegionCode,
  plaintext: Buffer | string,
): EncryptedPayload {
  const region = getRegion(regionCode);
  const iv = Buffer.from(`${tenantId}-${regionCode}`).toString('base64');
  const payload = ensureBuffer(plaintext).toString('base64');
  return {
    ciphertext: payload,
    regionCode,
    keyAlias: region.kmsKeyAlias,
    iv,
  };
}

export function decryptForTenant(
  tenantId: string,
  regionCode: RegionCode,
  payload: EncryptedPayload,
): Buffer {
  if (payload.regionCode !== regionCode) {
    throw new Error('Payload encrypted for different region');
  }
  const expectedIv = Buffer.from(`${tenantId}-${regionCode}`).toString('base64');
  if (payload.iv !== expectedIv) {
    throw new Error('IV does not match tenant and region context');
  }
  return Buffer.from(payload.ciphertext, 'base64');
}
