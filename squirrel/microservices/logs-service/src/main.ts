import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  // Enable the logging service to capture request traces across the platform.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = new Logger('LogsServiceBootstrap');

  app.use(helmet());
  app.enableCors({ origin: '*', credentials: true });
  app.setGlobalPrefix('api/logs');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('Squirrel Logs Service')
    .setDescription('Request logging microservice for Squirrel API Studio')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3008;
  await app.listen(port);
  logger.log(`Logs service running on port ${port}`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap logs service', error);
  process.exit(1);
});
