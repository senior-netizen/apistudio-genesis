import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ConfirmTotpDto } from './dto/totp.dto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UsersService } from '../users/users.service';
import { randomUUID, randomBytes } from 'crypto';
import { hash as bcryptHash, compare as bcryptCompare } from 'bcryptjs';
import { authenticator } from 'otplib';
import { addDays, isBefore } from 'date-fns';
import { CryptoService } from '../../common/security/crypto.service';
import { RedisService } from '../../infra/redis/redis.service';
import { resolveAccountRole } from '../../common/security/owner-role.util';
import { brand } from '@sdl/language';

@Injectable()
export class AuthService {
  private readonly refreshExpiresIn: string;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly crypto: CryptoService,
    private readonly redis: RedisService,
  ) {
    this.refreshExpiresIn = this.config.get<string>('app.jwt.refreshExpiresIn', '7d');
  }

  async profile(userId: string) {
    return this.usersService.findById(userId);
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException({ code: 'EMAIL_IN_USE', message: 'Email already registered' });
    }
    const passwordHash = await bcryptHash(dto.password, 12);
    const slug = await this.generateWorkspaceSlug(dto.workspaceName);
    const user = await this.prisma.$transaction(async (tx: any) => {
      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
        },
      });
      const workspace = await tx.workspace.create({
        data: {
          name: dto.workspaceName,
          slug,
          ownerId: createdUser.id,
          members: {
            create: {
              userId: createdUser.id,
              role: 'OWNER',
            },
          },
        },
      });
      await (tx as any).auditLog.create({
        data: ({
          workspaceId: workspace.id,
          actorId: createdUser.id,
          action: 'WORKSPACE_CREATED',
        } as any),
      });
      return createdUser;
    });
    return this.issueTokens(user.id, user.email);
  }

  private async validateCredentials(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    }
    const valid = await bcryptCompare(dto.password, user.passwordHash as string);
    if (!valid) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    }
    if ((user as any).totpSecret) {
      const totpSecret = this.decryptTotpSecret((user as any).totpSecret);
      if (!dto.totpCode || !totpSecret || !authenticator.verify({ token: dto.totpCode, secret: totpSecret })) {
        throw new UnauthorizedException({ code: 'TOTP_REQUIRED', message: 'Valid TOTP code required' });
      }
    }
    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateCredentials(dto);
    return this.issueTokens(user.id, user.email);
  }

  async loginWithRole(dto: LoginDto, allowedRoles: Array<'admin' | 'founder'>) {
    const user = await this.validateCredentials(dto);
    const resolvedRole = resolveAccountRole(user.email, user.role);
    if (!allowedRoles.includes(resolvedRole as 'admin' | 'founder')) {
      throw new UnauthorizedException({
        code: 'INSUFFICIENT_ROLE',
        message: 'Admin or founder role required',
      });
    }
    return this.issueTokens(user.id, user.email);
  }

  async refresh(dto: RefreshDto) {
    const payload = await this.jwtService.verifyAsync<{ sub: string; sid: string }>(dto.refreshToken, {
      secret: this.config.get<string>('app.jwt.secret'),
      ignoreExpiration: false,
    });
    const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
    if (!session || session.revokedAt) {
      throw new UnauthorizedException({ code: 'SESSION_INVALID', message: 'Session expired' });
    }
    if (isBefore(session.expiresAt, new Date())) {
      throw new UnauthorizedException({ code: 'SESSION_EXPIRED', message: 'Session expired' });
    }
    const matches = await this.verifyRefreshToken(dto.refreshToken, (session as any).refreshToken);
    if (!matches) {
      throw new UnauthorizedException({ code: 'SESSION_INVALID', message: 'Session expired' });
    }
    return this.issueTokens(session.userId, payload.sub, session.id);
  }

  async logout(dto: RefreshDto) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; sid: string }>(dto.refreshToken, {
        secret: this.config.get<string>('app.jwt.secret'),
        ignoreExpiration: false,
      });
      const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
      if (!session || session.revokedAt) {
        return;
      }
      const matches = await this.verifyRefreshToken(dto.refreshToken, (session as any).refreshToken);
      if (!matches) {
        return;
      }
      const replacement = await bcryptHash(randomUUID(), 12);
      await this.prisma.session.update({
        where: { id: session.id },
        data: ({
          revokedAt: new Date(),
          refreshToken: replacement,
        } as any),
      });
      await this.redis.publishRevocation({ userId: session.userId, all: false });
    } catch (error) {
      this.logger.warn('Failed to revoke refresh token during logout', error instanceof Error ? error.message : error);
    }
  }

  async revokeSession(sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) return;
    await this.prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    await this.redis.publishRevocation({ userId: session.userId, all: false });
  }

  async initiateTotp(userId: string) {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(brand.productName, brand.authIssuer, secret);
    await this.prisma.user.update({
      where: { id: userId },
      data: ({ totpSecret: this.encryptTotpSecret(secret) } as any),
    });
    return { secret, otpauth };
  }

  async confirmTotp(userId: string, dto: ConfirmTotpDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!(user as any)?.totpSecret) {
      throw new BadRequestException({ code: 'TOTP_NOT_INIT', message: 'TOTP not initialized' });
    }
    const secret = this.decryptTotpSecret((user as any).totpSecret);
    if (!secret) {
      throw new BadRequestException({ code: 'TOTP_NOT_INIT', message: 'TOTP not initialized' });
    }
    const valid = authenticator.verify({ token: dto.code, secret });
    if (!valid) {
      throw new BadRequestException({ code: 'TOTP_INVALID', message: 'Invalid code' });
    }
    return { status: 'enabled' };
  }

  async createApiKey(workspaceId: string, userId: string, dto: CreateApiKeyDto) {
    const key = `sq_${randomBytes(24).toString('hex')}`;
    const keyHash = await bcryptHash(key, 12);
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : addDays(new Date(), 90);
    const apiKey = await this.prisma.apiKey.create({
      data: {
        workspaceId,
        name: dto.name,
        keyHash,
        expiresAt,
      },
    });
    await this.prisma.auditLog.create({
      data: ({
        workspaceId,
        actorId: userId,
        action: 'API_KEY_CREATED',
        targetId: apiKey.id,
      } as any),
    });
    return { id: apiKey.id, key, name: apiKey.name, expiresAt: apiKey.expiresAt };
  }

  async rotateApiKey(apiKeyId: string) {
    const key = `sq_${randomBytes(24).toString('hex')}`;
    const keyHash = await bcryptHash(key, 12);
    const updated = await this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { keyHash, lastUsedAt: null },
    });
    return { id: updated.id, key };
  }

  async issueTokens(userId: string, emailHint?: string, sessionId?: string) {
    const account = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true, id: true },
    });
    const email = account?.email ?? emailHint;
    if (!email) {
      throw new UnauthorizedException({ code: 'PROFILE_NOT_FOUND', message: 'User profile unavailable' });
    }
    const sid = sessionId ?? randomUUID();
    const accessJti = randomUUID();
    const refreshJti = randomUUID();
    const role = resolveAccountRole(email, account?.role);
    const isFounder = role === 'founder';
    const payload = { sub: userId, email, role, sid, jti: accessJti, isFounder } as const;
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync({ ...payload, jti: refreshJti }, {
      expiresIn: this.refreshExpiresIn,
    });
    const refreshTokenHash = await bcryptHash(refreshToken, 12);
    const expiresAt = addDays(new Date(), this.parseRefreshDays());
    if (!sessionId) {
      await this.prisma.session.create({
        data: ({
          id: sid,
          userId,
          refreshToken: refreshTokenHash,
          expiresAt,
        } as any),
      });
    } else {
      await this.prisma.session.update({
        where: { id: sid },
        data: ({
          refreshToken: refreshTokenHash,
          expiresAt,
        } as any),
      });
    }
    const user = {
      id: userId,
      email,
      role,
      isFounder,
    };
    return { accessToken, refreshToken, user };
  }

  private parseRefreshDays(): number {
    const match = /([0-9]+)d/.exec(this.refreshExpiresIn);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 7;
  }

  private encryptTotpSecret(secret: string): string {
    const encrypted = this.crypto.encrypt(Buffer.from(secret, 'utf8'));
    return [encrypted.iv.toString('base64'), encrypted.authTag.toString('base64'), encrypted.ciphertext.toString('base64')].join('.');
  }

  private decryptTotpSecret(serialized: string | null): string | null {
    if (!serialized) {
      return null;
    }
    const parts = serialized.split('.');
    if (parts.length !== 3) {
      this.logger.debug('Unexpected TOTP secret format');
      return serialized;
    }
    try {
      const decrypted = this.crypto.decrypt({
        iv: Buffer.from(parts[0], 'base64'),
        authTag: Buffer.from(parts[1], 'base64'),
        ciphertext: Buffer.from(parts[2], 'base64'),
      });
      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('Failed to decrypt TOTP secret', error instanceof Error ? error.stack : undefined);
      return null;
    }
  }

  private async verifyRefreshToken(rawToken: string, storedHash: string): Promise<boolean> {
    try {
      return await bcryptCompare(rawToken, storedHash);
    } catch (error) {
      this.logger.error('Failed to verify refresh token hash', error instanceof Error ? error.stack : undefined);
      return false;
    }
  }

  private async generateWorkspaceSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 32);
    const safeBase = base || 'workspace';
    let slug = safeBase;
    let counter = 1;
    while (await this.prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${safeBase}-${counter++}`;
    }
    return slug;
  }
}
