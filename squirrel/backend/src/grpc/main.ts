import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { GrpcAppModule } from './grpc.module';
import { buildServerCredentials } from './utils/tls.util';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const host = process.env.GRPC_BIND_ADDR ?? '0.0.0.0';
  const port = process.env.GRPC_PORT ?? '50051';

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(GrpcAppModule, {
    transport: Transport.GRPC,
    options: {
      url: `${host}:${port}`,
      package: ['squirrel.auth.v1', 'squirrel.workspaces.v1', 'squirrel.requests.v1'],
      protoPath: [
        join(__dirname, '..', '..', 'proto', 'auth.proto'),
        join(__dirname, '..', '..', 'proto', 'workspaces.proto'),
        join(__dirname, '..', '..', 'proto', 'requests.proto'),
        join(__dirname, '..', '..', 'proto', 'common.proto'),
      ],
      loader: {
        keepCase: false,
        defaults: true,
        longs: String,
        enums: String,
        arrays: true,
      },
      credentials: buildServerCredentials(null),
    },
  });

  // Update credentials with fully parsed config after DI is ready.
  const config = app.get(ConfigService, { strict: false });
  if (config) {
    (app as any).options.credentials = buildServerCredentials(config);
    (app as any).options.url = `${config.get<string>('app.grpc.host', host)}:${config.get<number>('app.grpc.port', Number(port))}`;
  }

  await app.listen();
  // eslint-disable-next-line no-console
  console.log(`gRPC server listening on ${(app as any).options?.url ?? `${host}:${port}`}`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start gRPC server', error);
  process.exit(1);
});
