import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

@Injectable()
export class CsrfService {
  private readonly secret: string;

  constructor(private readonly config: ConfigService) {
    this.secret = config.get<string>('app.csrfSecret') ?? config.get<string>('app.jwt.secret') ?? 'change_me_csrf';
  }

  generateToken(): string {
    const nonce = randomBytes(32).toString('hex');
    const signature = this.sign(nonce);
    return `${nonce}.${signature}`;
  }

  isValid(token: string | undefined | null): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    const [nonce, signature] = token.split('.');
    if (!nonce || !signature) {
      return false;
    }
    const expected = this.sign(nonce);
    const provided = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    return provided.length === expectedBuf.length && timingSafeEqual(provided, expectedBuf);
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('hex');
  }
}
