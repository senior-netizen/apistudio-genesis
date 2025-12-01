import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { addMinutes } from 'date-fns';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';

function generateUserCode(): string {
  // Human-friendly 8-char code: XXXX-XXXX
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let raw = '';
  for (let i = 0; i < 8; i++) raw += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${raw.substring(0, 4)}-${raw.substring(4)}`;
}

@Injectable()
export class DeviceFlowService {
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  async createCode(clientType: string, scope?: string) {
    const deviceCode = randomBytes(24).toString('hex');
    const userCode = generateUserCode();
    const expiresAt = addMinutes(new Date(), 10);

    await this.prisma.deviceCode.create({
      data: ({
        deviceCode,
        userCode,
        clientType,
        scope: scope ?? null,
        expiresAt,
      } as any),
    });
    await this.redis.setDeviceCode({ deviceCode, userCode, clientType, scope, expiresInSec: 10 * 60 });

    return {
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: '/auth/device/confirm',
      expires_in: 600,
      interval: 5,
    };
  }

  async approve(userId: string, userCode: string): Promise<boolean> {
    const rec = await this.prisma.deviceCode.findUnique({ where: { userCode } });
    if (!rec || rec.expiresAt < new Date()) return false;
    await this.prisma.deviceCode.update({ where: { id: rec.id }, data: ({ userId, verifiedAt: new Date() } as any) });
    return this.redis.approveDeviceCode(userCode, userId);
  }

  async exchange(deviceCode: string): Promise<{ userId: string; clientType: string; scope?: string } | null> {
    const rec = await this.prisma.deviceCode.findUnique({ where: { deviceCode } });
    if (!rec || rec.expiresAt < new Date() || !(rec as any).verifiedAt || !rec.userId) return null;
    const consumed = await this.redis.consumeDeviceCode(deviceCode);
    if (!consumed) return null;
    return { userId: consumed.userId, clientType: consumed.clientType, scope: consumed.scope };
  }
}
