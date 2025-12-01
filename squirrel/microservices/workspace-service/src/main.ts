import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  // Start the workspace orchestration service with shared defaults.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = new Logger('WorkspaceServiceBootstrap');

  app.use(helmet());
  app.enableCors({ origin: '*', credentials: true });
  app.setGlobalPrefix('api/workspaces');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('Squirrel Workspace Service')
    .setDescription('Workspace orchestration microservice for Squirrel API Studio')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3003;
  await app.listen(port);
  logger.log(`Workspace service running on port ${port}`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap workspace service', error);
  process.exit(1);
});
