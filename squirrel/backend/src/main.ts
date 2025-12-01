import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const compression = require('compression');
import { json, urlencoded, type Request, type Response } from 'express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require('cookie-parser');
import { ConfigService } from '@nestjs/config';
import { startOtel, shutdownOtel } from './infra/otel/opentelemetry';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { MetricsService } from './infra/metrics/metrics.service';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from './common/guards/rbac.guard';
import { PrismaService } from './infra/prisma/prisma.service';
import { CsrfGuard } from './common/guards/csrf.guard';
import { CsrfService } from './common/security/csrf.service';
import { AppLogger } from './infra/logger/app-logger.service';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { brand } from '@sdl/language';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const appLogger = app.get(AppLogger);
  app.useLogger(appLogger);
  const configService = app.get(ConfigService);
  const metricsService = app.get(MetricsService);

  await startOtel(configService.get<string>('app.otelServiceName', 'squirrel-backend'));
  app.enableShutdownHooks();

  app.use(cookieParser());
  app.use(helmet());
  app.use(compression());
  const rawBodySaver = (req: any, res: any, buf: Buffer) => {
    if (req.originalUrl?.includes('/billing/webhook')) {
      req.rawBody = Buffer.from(buf);
    }
  };
  app.use(json({ limit: '1mb', verify: rawBodySaver }));
  app.use(urlencoded({ extended: true, limit: '1mb', verify: rawBodySaver }));

  const corsOrigins = configService.get<string[]>('app.corsOrigins', []);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  if (nodeEnv === 'production' && corsOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must be set in production');
  }
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
    exposedHeaders: ['x-access-token'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Authorization', 'X-Requested-With', 'Idempotency-Key', 'x-csrf-token'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
    }),
  );

  app.useGlobalInterceptors(
    new TimeoutInterceptor(),
    new MetricsInterceptor(metricsService),
    app.get(IdempotencyInterceptor),
    app.get(ResponseEnvelopeInterceptor),
  );
  const reflector = app.get(Reflector);
  const prisma = app.get(PrismaService);
  app.useGlobalGuards(app.get(RateLimitGuard), app.get(CsrfGuard), app.get(JwtAuthGuard), new RbacGuard(reflector, prisma));
  app.useGlobalFilters(app.get(HttpExceptionFilter));

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  const expressApp = app.getHttpAdapter().getInstance();
  const csrfService = app.get(CsrfService);
  const isSecure = () => (configService.get<string>('app.nodeEnv', 'development') ?? 'development') === 'production';
  expressApp.get('/auth/csrf', (_req: Request, res: Response) => {
    const csrfToken = csrfService.generateToken();
    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false,
      secure: isSecure(),
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.json({ csrfToken });
  });
  const emitHealthPayload = (request: Request) => ({
    success: true,
    data: {
      status: 'ok' as const,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    meta: {
      path: request.url,
      method: request.method,
      requestId: (request as any).requestId ?? request.headers['x-request-id'],
    },
  });
  expressApp.get('/v1/health', (req: Request, res: Response) => {
    const payload = emitHealthPayload(req);
    metricsService.recordHealthCheck('healthz', true);
    res.json(payload);
  });
  expressApp.get('/v1/healthz', (req: Request, res: Response) => {
    const payload = emitHealthPayload(req);
    metricsService.recordHealthCheck('healthz', true);
    res.json(payload);
  });

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(brand.productName)
      .setDescription(brand.apiDescription)
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const startPort = configService.get<number>('app.port', 8080);
  const maxAttempts = 10;
  let port = startPort;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await app.listen(port);
      Logger.log(`${brand.productShortName} backend listening on http://localhost:${port}/v1`);
      break;
    } catch (err: any) {
      if (err?.code === 'EADDRINUSE') {
        Logger.warn(`Port ${port} in use, trying ${port + 1}...`);
        port += 1;
        continue;
      }
      throw err;
    }
  }

  process.on('SIGTERM', async () => {
    await app.close();
    await shutdownOtel();
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
