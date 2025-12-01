import { readFileSync, existsSync } from 'fs';
import { ChannelCredentials } from '@grpc/grpc-js';
import { ConfigService } from '@nestjs/config';

export function buildServerCredentials(config?: ConfigService | null): ChannelCredentials {
  const certPath = config?.get<string>('app.grpc.tlsCertPath') ?? process.env.GRPC_TLS_CERT_PATH;
  const keyPath = config?.get<string>('app.grpc.tlsKeyPath') ?? process.env.GRPC_TLS_KEY_PATH;
  const caPath = config?.get<string>('app.grpc.tlsCaPath') ?? process.env.GRPC_TLS_CA_PATH;
  const requireClientCert =
    config?.get<boolean>('app.grpc.requireClientCert', false) ??
    (process.env.GRPC_REQUIRE_CLIENT_CERT ? process.env.GRPC_REQUIRE_CLIENT_CERT === 'true' : false);

  if (certPath && keyPath && existsSync(certPath) && existsSync(keyPath)) {
    const cert = readFileSync(certPath);
    const key = readFileSync(keyPath);
    const ca = caPath && existsSync(caPath) ? readFileSync(caPath) : undefined;
    return ChannelCredentials.createSsl(
      ca,
      key,
      cert,
      { checkServerIdentity: () => undefined, rejectUnauthorized: requireClientCert },
    );
  }

  // Development fallback: insecure credentials to keep local workflows simple.
  return ChannelCredentials.createInsecure();
}
