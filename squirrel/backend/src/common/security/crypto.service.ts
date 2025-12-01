import { Inject, Injectable } from '@nestjs/common';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { ConfigType } from '@nestjs/config';
import appConfig from '../../config/configuration';

export interface EncryptionResult {
  iv: Buffer;
  authTag: Buffer;
  ciphertext: Buffer;
}

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(@Inject(appConfig.KEY) config: ConfigType<typeof appConfig>) {
    this.key = config.encryptionKey;
  }

  encrypt(plaintext: Buffer): EncryptionResult {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv, {
      authTagLength: 16,
    });
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { iv, authTag, ciphertext };
  }

  decrypt(result: EncryptionResult): Buffer {
    const decipher = createDecipheriv('aes-256-gcm', this.key, result.iv, {
      authTagLength: 16,
    });
    decipher.setAuthTag(result.authTag);
    return Buffer.concat([decipher.update(result.ciphertext), decipher.final()]);
  }
}
