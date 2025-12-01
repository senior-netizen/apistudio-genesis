import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import request, { SuperAgentTest } from 'supertest';
import appConfig from '../src/config/configuration';
import { CsrfGuard } from '../src/common/guards/csrf.guard';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { CsrfService } from '../src/common/security/csrf.service';
import { CryptoService } from '../src/common/security/crypto.service';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { RedisService } from '../src/infra/redis/redis.service';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { DeviceFlowService } from '../src/modules/auth/device-flow.service';
import { JwtStrategy } from '../src/modules/auth/jwt.strategy';
import { RefreshJwtStrategy } from '../src/modules/auth/refresh.strategy';
import { UsersService } from '../src/modules/users/users.service';

const TEST_JWT_SECRET = 'jwt_test_secret';
const TEST_CSRF_SECRET = 'csrf_test_secret';

class FakeConfigService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(key: string): any {
    switch (key) {
      case 'app.jwt.secret':
        return TEST_JWT_SECRET;
      case 'app.jwt.expiresIn':
        return '15m';
      case 'app.jwt.refreshExpiresIn':
        return '7d';
      case 'app.authDeveloperBypass':
        return false;
      case 'app.nodeEnv':
        return 'test';
      case 'app.csrfSecret':
        return TEST_CSRF_SECRET;
      default:
        return undefined;
    }
  }
}

type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: string;
  totpSecret?: string | null;
};

type SessionRecord = {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  revokedAt?: Date | null;
};

type WorkspaceRecord = { id: string; name: string; slug: string; ownerId: string };

type DeviceCodeRecord = {
  id: string;
  deviceCode: string;
  userCode: string;
  clientType: string;
  scope?: string | null;
  userId?: string | null;
  verifiedAt?: Date | null;
  expiresAt: Date;
};

class InMemoryPrismaService {
  users: UserRecord[] = [];
  sessions: SessionRecord[] = [];
  workspaces: WorkspaceRecord[] = [];
  deviceCodes: DeviceCodeRecord[] = [];
  auditLogs: any[] = [];

  user = {
    findUnique: async ({ where, select }: any) => {
      const match = this.users.find((u) => u.id === where.id || u.email === where.email);
      if (!match) return null;
      if (!select) return { ...match };
      const selected: Record<string, unknown> = {};
      for (const key of Object.keys(select)) {
        if (select[key]) selected[key] = (match as any)[key];
      }
      return selected;
    },
    create: async ({ data }: any) => {
      const record: UserRecord = {
        id: data.id ?? randomUUID(),
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        role: data.role ?? 'user',
        totpSecret: data.totpSecret ?? null,
      };
      this.users.push(record);
      return { ...record } as any;
    },
    update: async ({ where, data }: any) => {
      const user = this.users.find((u) => u.id === where.id || u.email === where.email);
      if (!user) return null;
      Object.assign(user, data);
      return { ...user } as any;
    },
  } as any;

  workspace = {
    findUnique: async ({ where }: any) => {
      const match = this.workspaces.find((w) => w.slug === where.slug || w.id === where.id);
      return match ? { ...match } : null;
    },
    create: async ({ data }: any) => {
      const record: WorkspaceRecord = {
        id: data.id ?? randomUUID(),
        name: data.name,
        slug: data.slug,
        ownerId: data.ownerId,
      };
      this.workspaces.push(record);
      return { ...record } as any;
    },
  } as any;

  session = {
    findUnique: async ({ where }: any) => {
      const match = this.sessions.find((s) => s.id === where.id);
      return match ? { ...match } : null;
    },
    create: async ({ data }: any) => {
      const record: SessionRecord = {
        id: data.id ?? randomUUID(),
        userId: data.userId,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        revokedAt: data.revokedAt ?? null,
      };
      this.sessions.push(record);
      return { ...record } as any;
    },
    update: async ({ where, data }: any) => {
      const session = this.sessions.find((s) => s.id === where.id);
      if (!session) return null;
      Object.assign(session, data);
      return { ...session } as any;
    },
  } as any;

  auditLog = {
    create: async ({ data }: any) => {
      this.auditLogs.push({ ...data });
      return data;
    },
  } as any;

  deviceCode = {
    create: async ({ data }: any) => {
      const record: DeviceCodeRecord = {
        id: data.id ?? randomUUID(),
        deviceCode: data.deviceCode,
        userCode: data.userCode,
        clientType: data.clientType,
        scope: data.scope ?? null,
        expiresAt: data.expiresAt,
        userId: data.userId ?? null,
        verifiedAt: data.verifiedAt ?? null,
      };
      this.deviceCodes.push(record);
      return { ...record } as any;
    },
    findUnique: async ({ where }: any) => {
      const match = this.deviceCodes.find(
        (d) => d.deviceCode === where.deviceCode || d.userCode === where.userCode || d.id === where.id,
      );
      return match ? { ...match } : null;
    },
    update: async ({ where, data }: any) => {
      const record = this.deviceCodes.find((d) => d.id === where.id || d.deviceCode === where.deviceCode);
      if (!record) return null;
      Object.assign(record, data);
      return { ...record } as any;
    },
  } as any;

  apiKey = {
    findFirst: async () => null,
    findMany: async () => [],
  } as any;

  $transaction: any = async (fn: any) => {
    return fn(this);
  };
}

const redisMock: Partial<RedisService> = {
  publishRevocation: jest.fn(),
  blacklistToken: jest.fn(),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  setDeviceCode: jest.fn(),
  approveDeviceCode: jest.fn().mockResolvedValue(true),
  consumeDeviceCode: jest.fn().mockResolvedValue(null),
} as unknown as RedisService;

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

async function getCsrf(agent: SuperAgentTest) {
  const res = await agent.get('/v1/auth/csrf').expect(200);
  const token = res.body.csrfToken;
  return { token };
}

export async function loginUser(agent: SuperAgentTest, email: string, password: string, totpCode?: string) {
  const { token } = await getCsrf(agent);
  const res = await agent
    .post('/v1/auth/login')
    .set('X-CSRF-Token', token)
    .set('Cookie', `XSRF-TOKEN=${token}`)
    .send({ email, password, totpCode })
    .expect((response) => {
      if (response.status !== 200) return;
      if (!response.body.accessToken || !response.body.refreshToken) {
        throw new Error('Missing tokens in response');
      }
    });
  return res.body as { accessToken: string; refreshToken: string; csrfToken: string };
}

describe('Authentication flows (e2e)', () => {
  let app: INestApplication;
  let agent: SuperAgentTest;
  let prisma: InMemoryPrismaService;
  const baseUser = {
    email: 'auth-user@example.com',
    password: 'Password1!',
    displayName: 'Auth User',
    workspaceName: 'Auth Workspace',
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({ secret: TEST_JWT_SECRET })],
      controllers: [AuthController],
      providers: [
        AuthService,
        DeviceFlowService,
        UsersService,
        JwtStrategy,
        RefreshJwtStrategy,
        CsrfService,
        CryptoService,
        { provide: PrismaService, useClass: InMemoryPrismaService },
        { provide: RedisService, useValue: redisMock },
        { provide: ConfigService, useClass: FakeConfigService },
        { provide: appConfig.KEY, useValue: { encryptionKey: Buffer.alloc(32) } },
        JwtAuthGuard,
        CsrfGuard,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidUnknownValues: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalGuards(app.get(CsrfGuard));
    await app.init();

    prisma = app.get(PrismaService) as InMemoryPrismaService;
    agent = request.agent(app.getHttpServer());

    const { token } = await getCsrf(agent);
    await agent
      .post('/v1/auth/register')
      .set('X-CSRF-Token', token)
      .set('Cookie', `XSRF-TOKEN=${token}`)
      .send(baseUser)
      .expect(201);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('registers a new user successfully', async () => {
    const email = `user-${Date.now()}@example.com`;
    const { token } = await getCsrf(agent);
    const res = await agent
      .post('/v1/auth/register')
      .set('X-CSRF-Token', token)
      .set('Cookie', `XSRF-TOKEN=${token}`)
      .send({ email, password: 'Password1!', displayName: 'Test User', workspaceName: 'Workspace One' })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.csrfToken).toBeDefined();
    expect(prisma.users.some((u) => u.email === email)).toBe(true);
  });

  it('prevents duplicate registration', async () => {
    const { token } = await getCsrf(agent);
    await agent
      .post('/v1/auth/register')
      .set('X-CSRF-Token', token)
      .set('Cookie', `XSRF-TOKEN=${token}`)
      .send(baseUser)
      .expect(400);
  });

  it('requires CSRF token for state-changing requests', async () => {
    const email = `csrf-missing-${Date.now()}@example.com`;
    const freshAgent = request.agent(app.getHttpServer());
    await freshAgent
      .post('/v1/auth/register')
      .send({ email, password: 'Password1!', displayName: 'No Csrf', workspaceName: 'Denied' })
      .expect(403);
  });

  it('logs in and returns JWT plus refresh token', async () => {
    const tokens = await loginUser(agent, baseUser.email, baseUser.password);
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
  });

  it('rejects login with wrong password', async () => {
    const { token } = await getCsrf(agent);
    await agent
      .post('/v1/auth/login')
      .set('X-CSRF-Token', token)
      .set('Cookie', `XSRF-TOKEN=${token}`)
      .send({ email: baseUser.email, password: 'WrongPassword1!' })
      .expect(401);
  });

  it('returns profile data when JWT is valid', async () => {
    const { accessToken } = await loginUser(agent, baseUser.email, baseUser.password);
    const res = await agent.get('/v1/auth/me').set(authHeader(accessToken)).expect(200);
    expect(res.body.email).toBe(baseUser.email);
  });

  it('blocks profile access without JWT header', async () => {
    await agent.get('/v1/auth/me').expect(401);
  });

  it('blocks profile access with invalid token', async () => {
    await agent.get('/v1/auth/me').set(authHeader('invalid.token.value')).expect(401);
  });

  describe('TOTP 2FA', () => {
    it('enables TOTP and enforces code during login', async () => {
      const setupLogin = await loginUser(agent, baseUser.email, baseUser.password);
      const setupRes = await agent
        .post('/v1/auth/2fa/setup')
        .set(authHeader(setupLogin.accessToken))
        .expect(201);

      const secret = setupRes.body.secret as string;
      expect(secret).toBeDefined();

      const { authenticator } = await import('otplib');
      const code = authenticator.generate(secret);

      await agent
        .post('/v1/auth/2fa/confirm')
        .set(authHeader(setupLogin.accessToken))
        .send({ code })
        .expect(201);

      const { token: missingTotpCsrf } = await getCsrf(agent);
      const noTotp = await agent
        .post('/v1/auth/login')
        .set('X-CSRF-Token', missingTotpCsrf)
        .set('Cookie', `XSRF-TOKEN=${missingTotpCsrf}`)
        .send({ email: baseUser.email, password: baseUser.password })
        .expect(401);
      expect(noTotp.body.code).toBe('TOTP_REQUIRED');

      const { token: wrongTotpCsrf } = await getCsrf(agent);
      const wrongTotp = await agent
        .post('/v1/auth/login')
        .set('X-CSRF-Token', wrongTotpCsrf)
        .set('Cookie', `XSRF-TOKEN=${wrongTotpCsrf}`)
        .send({ email: baseUser.email, password: baseUser.password, totpCode: '000000' })
        .expect(401);
      expect(wrongTotp.body.code).toBe('TOTP_REQUIRED');

      const { token: okCsrf } = await getCsrf(agent);
      const okLogin = await agent
        .post('/v1/auth/login')
        .set('X-CSRF-Token', okCsrf)
        .set('Cookie', `XSRF-TOKEN=${okCsrf}`)
        .send({ email: baseUser.email, password: baseUser.password, totpCode: code })
        .expect(200);
      expect(okLogin.body.accessToken).toBeDefined();
    });
  });
});
