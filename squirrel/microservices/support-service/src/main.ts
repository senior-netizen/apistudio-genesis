import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const logger = new Logger('SupportServiceBootstrap');

    app.use(helmet());
    app.enableCors({ origin: '*', credentials: true });
    app.setGlobalPrefix('api/support');
    app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );

    const config = new DocumentBuilder()
        .setTitle('Squirrel Support Service')
        .setDescription('Ticketing and support microservice')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    const port = process.env.PORT || 3004;
    await app.listen(port);
    logger.log(`Support service running on port ${port}`);
}

bootstrap().catch((error) => {
    console.error('Failed to bootstrap support service', error);
    process.exit(1);
});
