import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaHealthIndicator, TerminusModule } from '@nestjs/terminus';
import { RedisService } from '../src/infra/redis/redis.service';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { HealthController } from '../src/modules/health/health.controller';
import { MetricsService } from '../src/infra/metrics/metrics.service';

describe('App e2e (health)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        { provide: PrismaHealthIndicator, useValue: { pingCheck: async () => ({ database: { status: 'up' } }) } },
        { provide: RedisService, useValue: { getClient: async () => ({ ping: async () => 'PONG' }) } },
        {
          provide: MetricsService,
          useValue: {
            getMetrics: async () => ({}),
            recordHealthCheck: () => undefined,
            recordReadinessFailure: () => undefined,
          },
        },
        { provide: PrismaService, useValue: { $queryRaw: async () => 1, $disconnect: async () => undefined } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      try {
        const prisma = app.get(PrismaService, { strict: false }) as any;
        if (prisma && typeof prisma.$disconnect === 'function') {
          await prisma.$disconnect();
        }
      } catch (error) {
        // Ignore cleanup errors
        if (process.env.DEBUG) {
          // eslint-disable-next-line no-console
          console.warn('Failed to close Prisma connection', error);
        }
      }
      await app.close();
    }
  });

  it('GET /health returns ok', async () => {
    const server = app.getHttpServer();
    await request(server)
      .get('/health')
      .expect(200)
      .expect((res) => {
        // Terminus default returns a status field
        if (!res.body || (res.body.status !== 'ok' && res.body.status !== 'error')) {
          throw new Error('Unexpected health payload');
        }
      });
  });
  it('GET /ready returns ok', async () => {
    const server = app.getHttpServer();
    await request(server).get('/ready').expect(200);
  });
  it('GET /metrics returns payload', async () => {
    const server = app.getHttpServer();
    await request(server).get('/metrics').expect(200);
  });
});
