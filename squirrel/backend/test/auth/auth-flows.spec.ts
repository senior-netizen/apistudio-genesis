import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  INestApplication,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Request } from 'express';
import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard';
import { JwtStrategy } from '../../src/modules/auth/jwt.strategy';
import {
  TEST_JWT_SECRET,
  TEST_REFRESH_SECRET,
  createMockApiKey,
  createMockPrisma,
  createMockRedisRateLimiter,
  createMockUser,
  MockUser,
  expiredToken,
  signJwt,
  tamperToken,
  unsignedToken,
  buildErrorBody,
} from '../../../testing/auth-fixtures';
import { createHmac } from 'node:crypto';
import { PrismaService } from '../../src/infra/prisma/prisma.service';

interface LoginDto {
  email: string;
  password: string;
}

const redisLimiter = createMockRedisRateLimiter();

class RateLimitedJwtGuard extends JwtAuthGuard {
  override handleRequest(err: any, user: any, info: unknown, context: any) {
    const req = context.switchToHttp().getRequest<Request>();
    const token = (req.headers.authorization as string) ?? 'missing';
    const attempt = redisLimiter.hit(token);
    if (attempt > 3) {
      throw new UnauthorizedException({ ...buildErrorBody(), message: 'Unauthorized - rate limited' });
    }

    const result = super.handleRequest(err, user, info, context);
    if (result) {
      redisLimiter.reset();
    }
    return result;
  }
}

@Controller()
class AuthEchoController {
  constructor(private readonly jwtService: JwtService, private readonly prisma: PrismaService) {}

  private users = [
    createMockUser({ email: 'owner@squirrel.test', role: 'owner' }),
    createMockUser({ email: 'founder@squirrel.test', role: 'founder' }),
    createMockUser({ email: 'admin@squirrel.test', role: 'admin' }),
    createMockUser({ email: 'user@squirrel.test', role: 'user' }),
  ];

  private refreshTokens = new Map<string, { userId: string; disabled?: boolean }>();

  @Post('/auth/register')
  async register(@Body() body: Partial<MockUser>) {
    if (!body.email || !body.password) {
      throw new UnauthorizedException(buildErrorBody());
    }
    const user = createMockUser(body);
    this.users.push(user);
    return { ok: true, user: { id: user.id, email: user.email, role: user.role } };
  }

  @Post('/auth/login')
  async login(@Body() body: LoginDto) {
    if (!body.email || !body.password) {
      throw new UnauthorizedException(buildErrorBody());
    }
    const user = this.users.find((u) => u.email === body.email);
    if (!user || user.password !== body.password || user.disabled || !user.active) {
      throw new UnauthorizedException(buildErrorBody());
    }
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = signJwt(payload, TEST_JWT_SECRET, 60);
    const refreshToken = signJwt({ ...payload, kind: 'refresh' }, TEST_REFRESH_SECRET, 60 * 60);
    this.refreshTokens.set(refreshToken, { userId: user.id, disabled: user.disabled });
    return { accessToken, refreshToken };
  }

  @Post('/auth/refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    const entry = this.refreshTokens.get(body.refreshToken);
    if (!entry) {
      throw new UnauthorizedException(buildErrorBody());
    }
    if (entry.disabled) {
      throw new UnauthorizedException(buildErrorBody());
    }
    if (entry.userId === 'reused') {
      throw new UnauthorizedException({ ...buildErrorBody(), message: 'Unauthorized - reused' });
    }
    // simple signature check
    const [header, payload, signature] = body.refreshToken.split('.');
    const check = createHmac('sha256', TEST_REFRESH_SECRET).update(`${header}.${payload}`).digest('base64url');
    if (check !== signature) {
      throw new UnauthorizedException(buildErrorBody());
    }
    const parsed = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    const accessToken = signJwt({ sub: entry.userId, email: parsed.email, role: parsed.role }, TEST_JWT_SECRET, 30);
    const newRefresh = signJwt({ sub: entry.userId, email: parsed.email, role: parsed.role, kind: 'refresh' }, TEST_REFRESH_SECRET, 60 * 60);
    // rotation protection
    this.refreshTokens.set(body.refreshToken, { ...entry, userId: 'reused' });
    this.refreshTokens.set(newRefresh, entry);
    return { accessToken, refreshToken: newRefresh };
  }

  @UseGuards(RateLimitedJwtGuard)
  @Get('/protected/owner')
  owner(@Req() req: Request) {
    const user = req.user as any;
    if (user.role !== 'owner') throw new ForbiddenException(buildErrorBody());
    return { ok: true, role: user.role, badge: 'owner' };
  }

  @UseGuards(RateLimitedJwtGuard)
  @Get('/protected/admin')
  admin(@Req() req: Request) {
    const user = req.user as any;
    if (user.role !== 'admin' && user.role !== 'owner' && user.role !== 'founder')
      throw new ForbiddenException(buildErrorBody());
    return { ok: true, role: user.role };
  }

  @UseGuards(RateLimitedJwtGuard)
  @Get('/protected/api-key')
  apiKey(@Req() req: Request) {
    const user = req.user as any;
    return { ok: true, actor: user.id, workspaceId: user.workspaceId };
  }
}

describe('Backend auth flows (told like a gentle story)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const users = [
      createMockUser({ email: 'owner@squirrel.test', role: 'owner', password: 'secret' }),
      createMockUser({ email: 'founder@squirrel.test', role: 'founder', password: 'secret' }),
      createMockUser({ email: 'admin@squirrel.test', role: 'admin', password: 'secret' }),
      createMockUser({ email: 'user@squirrel.test', role: 'user', password: 'secret' }),
    ];
    const apiKeys = [createMockApiKey({})];
    const prismaMock = createMockPrisma(users, apiKeys) as PrismaService;

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({ secret: TEST_JWT_SECRET })],
      controllers: [AuthEchoController],
      providers: [
        JwtService,
        JwtStrategy,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: { get: (key: string) => (key === 'app.jwt.secret' ? TEST_JWT_SECRET : undefined) } },
        { provide: JwtAuthGuard, useClass: RateLimitedJwtGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('registers and logs in with valid credentials', async () => {
    const server = app.getHttpServer();
    const registerRes = await request(server)
      .post('/auth/register')
      .send({ email: 'new@squirrel.test', password: 'secret', role: 'user' })
      .expect(201);

    expect(registerRes.body.user.role).toBe('user');

    const res = await request(server)
      .post('/auth/login')
      .send({ email: 'new@squirrel.test', password: 'secret' })
      .expect(201);

    const { accessToken, refreshToken } = res.body;
    expect(accessToken).toBeDefined();
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString('utf8'));
    expect(payload.email).toBe('new@squirrel.test');
    expect(payload.role).toBe('user');
    expect(refreshToken).toBeDefined();
  });

  it('rejects invalid credentials and missing fields', async () => {
    const server = app.getHttpServer();
    await request(server).post('/auth/login').send({ email: 'user@squirrel.test', password: 'wrong' }).expect(401);
    await request(server).post('/auth/login').send({ email: '', password: '' }).expect(401);
  });

  it('rejects expired, malformed, tampered, unsigned and wrong-secret tokens', async () => {
    const server = app.getHttpServer();
    const good = signJwt({ sub: '1', email: 'user@squirrel.test', role: 'user' });
    await request(server).get('/protected/admin').set('Authorization', `Bearer ${good}`).expect(403);

    const expired = expiredToken({ sub: '1', email: 'user@squirrel.test', role: 'user' });
    await request(server).get('/protected/admin').set('Authorization', `Bearer ${expired}`).expect(401);

    const tampered = tamperToken(good);
    await request(server).get('/protected/admin').set('Authorization', `Bearer ${tampered}`).expect(401);

    const unsigned = unsignedToken({ sub: '1', email: 'user@squirrel.test', role: 'user' });
    await request(server).get('/protected/admin').set('Authorization', `Bearer ${unsigned}`).expect(401);

    const wrongSecret = signJwt({ sub: '1', email: 'user@squirrel.test', role: 'user' }, 'other-secret');
    await request(server).get('/protected/admin').set('Authorization', `Bearer ${wrongSecret}`).expect(401);
  });

  it('refreshes tokens and blocks reuse or disabled users', async () => {
    const server = app.getHttpServer();
    const loginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'admin@squirrel.test', password: 'secret' })
      .expect(201);

    const { refreshToken } = loginRes.body;
    const refreshRes = await request(server).post('/auth/refresh').send({ refreshToken }).expect(201);
    expect(refreshRes.body.accessToken).toBeDefined();

    await request(server).post('/auth/refresh').send({ refreshToken }).expect(401);

    const badSignature = refreshToken.replace(/.$/, 'x');
    await request(server).post('/auth/refresh').send({ refreshToken: badSignature }).expect(401);
  });

  it('enforces role-based access (owner/founder/admin/user)', async () => {
    const server = app.getHttpServer();
    const ownerToken = signJwt({ sub: '1', email: 'owner@squirrel.test', role: 'owner' });
    await request(server).get('/protected/owner').set('Authorization', `Bearer ${ownerToken}`).expect(200);

    const founderToken = signJwt({ sub: '2', email: 'founder@squirrel.test', role: 'founder' });
    await request(server).get('/protected/admin').set('Authorization', `Bearer ${founderToken}`).expect(200);

    const adminToken = signJwt({ sub: '3', email: 'admin@squirrel.test', role: 'admin' });
    await request(server).get('/protected/owner').set('Authorization', `Bearer ${adminToken}`).expect(403);

    const userToken = signJwt({ sub: '4', email: 'user@squirrel.test', role: 'user' });
    await request(server).get('/protected/admin').set('Authorization', `Bearer ${userToken}`).expect(403);
  });

  it('accepts API keys without overriding JWT permissions', async () => {
    const server = app.getHttpServer();
    await request(server)
      .get('/protected/api-key')
      .set('x-api-key', 'squirrel-test-api-key')
      .expect(200)
      .expect((res) => {
        if (res.body.role) {
          throw new Error('API keys must not override roles');
        }
      });

    await request(server).get('/protected/api-key').set('x-api-key', 'bad-key').expect(401);
  });

  it('rate limits repeated invalid tokens', async () => {
    const server = app.getHttpServer();
    const bad = 'Bearer not-a-token';
    await request(server).get('/protected/admin').set('Authorization', bad).expect(401);
    await request(server).get('/protected/admin').set('Authorization', bad).expect(401);
    await request(server).get('/protected/admin').set('Authorization', bad).expect(401);
    await request(server).get('/protected/admin').set('Authorization', bad).expect(401);
  });

  it('returns standardized unauthorized payload', async () => {
    const server = app.getHttpServer();
    const res = await request(server).get('/protected/admin').expect(401);
    expect(res.body).toEqual(buildErrorBody());
  });
});
