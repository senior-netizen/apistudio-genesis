import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  // Temporary startup breadcrumbs for local debugging of container boot issues.
  // eslint-disable-next-line no-console
  console.log('Gateway bootstrap starting');
  let app;
  try {
    // Bootstrap the API gateway which fronts and secures all domain services.
    app = await NestFactory.create(AppModule, { bufferLogs: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('NestFactory.create failed', error);
    throw error;
  }
  const logger = new Logger('GatewayBootstrap');

  app.use(helmet());

  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: ${origin} not allowed`));
      }
    },
  });
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Squirrel API Gateway')
    .setDescription('Gateway orchestrating all Squirrel microservices')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3080;
  try {
    await app.listen(port);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Gateway failed to listen on port', port, error);
    throw error;
  }
  // eslint-disable-next-line no-console
  console.log('Gateway bootstrap completed');
  logger.log(`Gateway running on port ${port}`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap gateway', error);
  process.exit(1);
});
