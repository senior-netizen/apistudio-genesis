import { Controller, Get, INestApplication, Post, Req, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import cookieParser from 'cookie-parser';
import { Request, Response } from 'express';
import * as request from 'supertest';
import csrfMiddleware from '../src/middleware/csrf';
import sessionMiddleware, { SESSION_COOKIE_NAME } from '../src/middleware/session';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { RedisService } from '../src/infra/redis/redis.service';
import { FounderProvisionerService } from '../src/modules/auth/founder-provisioner.service';
import { QueueService } from '../src/infra/queue/queue.service';

@Controller({ path: 'auth', version: VERSION_NEUTRAL })
class CsrfTestController {
  @Get('csrf')
  csrf(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const csrfToken = randomUUID();
    if (req.session) {
      req.session.csrfToken = csrfToken;
    }
    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
    });
    return { csrfToken };
  }
}

@Controller({ path: 'api', version: VERSION_NEUTRAL })
class TestProtectedController {
  @Post('test-protected')
  protectedRoute() {
    return { ok: true };
  }
}

type CookieMap = Record<string, string>;
const parseCookies = (setCookieHeader: string[] | string | undefined): CookieMap => {
  const entries: CookieMap = {};
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
  cookies.forEach((cookie) => {
    const [pair] = cookie.split(';');
    const [name, ...rest] = pair.split('=');
    entries[name.trim()] = rest.join('=').trim();
  });
  return entries;
};
const PROTECTED_PATH = '/v1/api/test-protected';

describe('CSRF System (e2e)', () => {
  let app: INestApplication;
  let agent: request.SuperAgentTest;
  let initialSessionId: string | undefined;
  const prismaMock: Partial<PrismaService> = {
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    syncChange: {
      aggregate: jest.fn().mockResolvedValue({ _max: { serverEpoch: 0 } }),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
  } as unknown as PrismaService;
  const redisClientStub = {
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    psubscribe: jest.fn(),
    punsubscribe: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    publish: jest.fn(),
  };

  const redisMock: Partial<RedisService> = {
    getClient: jest.fn().mockResolvedValue({ ping: jest.fn().mockResolvedValue('PONG'), ...redisClientStub }),
    publishRevocation: jest.fn(),
    subscribeRevocation: jest.fn(),
    duplicate: jest.fn().mockReturnValue(redisClientStub),
    onModuleDestroy: jest.fn(),
  } as unknown as RedisService;
  const queueServiceMock: Partial<QueueService> = {
    getQueue: jest.fn(),
    onModuleDestroy: jest.fn(),
  } as unknown as QueueService;

  beforeAll(async () => {
    process.env.REDIS_DISABLED = 'true';
    process.env.COLLAB_ENABLED = 'false';
    process.env.LIVE_LOGS_ENABLED = 'false';
    process.env.PAIR_DEBUG_ENABLED = 'false';
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestProtectedController, CsrfTestController],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(RedisService)
      .useValue(redisMock)
      .overrideProvider(FounderProvisionerService)
      .useValue({ onModuleInit: jest.fn() })
      .overrideProvider(QueueService)
      .useValue(queueServiceMock);

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.use(sessionMiddleware);
    app.use(csrfMiddleware);
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.post('/api/test-protected', (_req: Request, res: Response) => res.json({ ok: true }));
    expressApp.post('/v1/api/test-protected', (_req: Request, res: Response) => res.json({ ok: true }));
    await app.init();

    agent = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /auth/csrf should return 200 and JSON { csrfToken }', async () => {
    const res = await agent.get('/auth/csrf');
    const cookies = parseCookies(res.headers['set-cookie']);
    initialSessionId = cookies[SESSION_COOKIE_NAME] ?? initialSessionId;

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('csrfToken');
    expect(typeof res.body.csrfToken).toBe('string');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('GET /auth/csrf should set XSRF-TOKEN cookie', async () => {
    const res = await agent.get('/auth/csrf');
    const cookies = parseCookies(res.headers['set-cookie']);
    const sessionCookie = cookies[SESSION_COOKIE_NAME];
    const xsrfCookie = cookies['XSRF-TOKEN'];

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie.length).toBeGreaterThan(0);
    expect(xsrfCookie).toBeDefined();
    expect(xsrfCookie.length).toBeGreaterThan(0);
  });

  it('POST /api/test-protected without CSRF → 403', async () => {
    const res = await agent.post(PROTECTED_PATH).send({});
    expect(res.status).toBe(403);
    expect(res.status).not.toBe(404);
  });

  it('POST /api/test-protected with INVALID token → 403', async () => {
    const csrfRes = await agent.get('/auth/csrf');
    const invalidToken = `${csrfRes.body.csrfToken}-invalid`;
    const res = await agent.post(PROTECTED_PATH).set('X-CSRF-Token', invalidToken).send({});

    expect(res.status).toBe(403);
    expect(res.status).not.toBe(404);
  });

  it('POST /api/test-protected with MISSING cookies → 403', async () => {
    const freshAgent = request.agent(app.getHttpServer());
    const res = await freshAgent.post(PROTECTED_PATH).set('X-CSRF-Token', 'missing-cookies');

    expect(res.status).toBe(403);
    expect(res.status).not.toBe(404);
  });

  it('POST /api/test-protected with VALID token → 200', async () => {
    const csrfRes = await agent.get('/auth/csrf');
    const token = csrfRes.body.csrfToken;
    const res = await agent.post(PROTECTED_PATH).set('X-CSRF-Token', token).send({});
    if (res.status !== 200) {
      // eslint-disable-next-line no-console
      console.error('Valid CSRF response', res.status, res.body);
    }

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  it('CSRF token should refresh or remain valid depending on middleware settings', async () => {
    const first = await agent.get('/auth/csrf');
    const firstCookies = parseCookies(first.headers['set-cookie']);
    const firstSession = firstCookies[SESSION_COOKIE_NAME];
    const firstToken = first.body.csrfToken;

    const second = await agent.get('/auth/csrf');
    const secondCookies = parseCookies(second.headers['set-cookie']);
    const secondSession = secondCookies[SESSION_COOKIE_NAME];
    const secondToken = second.body.csrfToken;

    if (firstSession && secondSession) {
      expect(secondSession).toBe(firstSession);
    }
    expect(secondToken).toBeDefined();

    if (secondToken !== firstToken) {
      const firstAttempt = await agent.post(PROTECTED_PATH).set('X-CSRF-Token', firstToken).send({});
      const secondAttempt = await agent.post(PROTECTED_PATH).set('X-CSRF-Token', secondToken).send({});
      expect(firstAttempt.status).toBe(403);
      if (secondAttempt.status !== 200) {
        // eslint-disable-next-line no-console
        console.error('Refresh CSRF response', secondAttempt.status, secondAttempt.body);
      }
      expect(secondAttempt.status).toBe(200);
      expect(secondAttempt.body).toHaveProperty('ok', true);
    } else {
      const attempt = await agent.post(PROTECTED_PATH).set('X-CSRF-Token', secondToken).send({});
      if (attempt.status !== 200) {
        // eslint-disable-next-line no-console
        console.error('Stable CSRF response', attempt.status, attempt.body);
      }
      expect(attempt.status).toBe(200);
      expect(attempt.body).toHaveProperty('ok', true);
    }

    if (initialSessionId && secondSession) {
      expect(secondSession).toBe(initialSessionId);
    }
  });

  it('No CSRF failure should ever return 404 (must be 403)', async () => {
    const res = await agent.post(PROTECTED_PATH).set('X-CSRF-Token', 'totally-wrong');
    expect(res.status).toBe(403);
    expect(res.status).not.toBe(404);
  });
});
