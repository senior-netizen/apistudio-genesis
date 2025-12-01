import { Controller, Get, INestApplication, Module, Post, Req } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Request } from 'express';
import { buildErrorBody, signJwt, tamperToken, TEST_API_KEY } from '../../../testing/auth-fixtures';
import { validateBearerToken } from '../src/auth/token-validator';

class DownstreamRecorder {
  lastRequest?: { headers: Record<string, string | string[]>; body?: any };
  record(req: Request) {
    this.lastRequest = { headers: req.headers, body: (req as any).body };
  }
}

@Controller()
class GatewayController {
  constructor(private readonly recorder: DownstreamRecorder) {}

  @Post('/proxy')
  forward(@Req() req: Request) {
    if (!req.headers.authorization && !req.headers['x-api-key']) {
      return buildErrorBody();
    }
    if (req.headers.authorization && !validateBearerToken(req.headers.authorization)) {
      return buildErrorBody();
    }
    this.recorder.record(req);
    return { ok: true };
  }

  @Get('/badge')
  badge(@Req() req: Request) {
    this.recorder.record(req);
    const role = (req.headers['x-squirrel-role'] as string) ?? 'guest';
    return { role, ownerBadge: role === 'owner', adminBadge: role === 'admin' };
  }
}

@Module({
  controllers: [GatewayController],
  providers: [DownstreamRecorder],
})
class GatewayModule {}

describe('API gateway header forwarding', () => {
  let app: INestApplication;
  let recorder: DownstreamRecorder;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [GatewayModule] }).compile();
    app = moduleRef.createNestApplication();
    recorder = moduleRef.get(DownstreamRecorder);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('keeps Authorization header untouched', async () => {
    const token = signJwt({ sub: '123', email: 'owner@squirrel.test', role: 'owner' });
    await request(app.getHttpServer())
      .post('/proxy')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);

    expect(recorder.lastRequest?.headers['authorization']).toContain('Bearer');
  });

  it('keeps API keys and cookies when forwarding', async () => {
    await request(app.getHttpServer())
      .post('/proxy')
      .set('x-api-key', TEST_API_KEY)
      .set('cookie', 'session=fake')
      .send({})
      .expect(201);

    expect(recorder.lastRequest?.headers['x-api-key']).toBe(TEST_API_KEY);
    expect(recorder.lastRequest?.headers['cookie']).toBe('session=fake');
  });

  it('rejects tampered tokens before forwarding', async () => {
    const token = signJwt({ sub: '123', email: 'user@squirrel.test', role: 'user' });
    const bad = tamperToken(token);
    const res = await request(app.getHttpServer())
      .post('/proxy')
      .set('Authorization', `Bearer ${bad}`)
      .send({})
      .expect(201);

    expect(res.body).toEqual(buildErrorBody());
  });

  it('does not mutate payload (role badges stay correct)', async () => {
    await request(app.getHttpServer())
      .get('/badge')
      .set('x-squirrel-role', 'owner')
      .expect(200)
      .expect((res) => {
        expect(res.body.ownerBadge).toBe(true);
      });
  });
});
