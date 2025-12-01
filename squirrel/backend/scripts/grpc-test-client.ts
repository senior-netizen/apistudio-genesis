import { credentials, Metadata, loadPackageDefinition } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
import { join } from 'path';

const host = process.env.GRPC_HOST ?? process.env.GRPC_BIND_ADDR ?? '127.0.0.1';
const port = process.env.GRPC_PORT ?? '50051';
const target = `${host}:${port}`;

const authDef = loadSync(join(__dirname, '..', 'proto', 'auth.proto'));
const wsDef = loadSync(join(__dirname, '..', 'proto', 'workspaces.proto'));
const reqDef = loadSync(join(__dirname, '..', 'proto', 'requests.proto'));

const authPkg = loadPackageDefinition(authDef) as any;
const wsPkg = loadPackageDefinition(wsDef) as any;
const reqPkg = loadPackageDefinition(reqDef) as any;

const authClient = new authPkg.squirrel.auth.v1.AuthService(target, credentials.createInsecure());
const wsClient = new wsPkg.squirrel.workspaces.v1.WorkspacesService(target, credentials.createInsecure());
const reqClient = new reqPkg.squirrel.requests.v1.RequestsService(target, credentials.createInsecure());

const email = process.env.GRPC_TEST_EMAIL ?? 'founder@example.com';
const password = process.env.GRPC_TEST_PASSWORD ?? 'founder-dev-password';

function metadata(token: string) {
  const md = new Metadata();
  md.set('authorization', `Bearer ${token}`);
  return md;
}

function promisify<T>(fn: Function, ...args: any[]): Promise<T> {
  return new Promise((resolve, reject) => {
    fn(...args, (err: any, res: T) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

async function main() {
  console.log(`Connecting to gRPC at ${target}`);
  const tokens = await promisify<{ accessToken: string; refreshToken: string }>(
    authClient.login.bind(authClient),
    { email, password },
  );
  console.log('Authenticated');

  const profile = await promisify(authClient.profile.bind(authClient), {}, metadata(tokens.accessToken));
  console.log('Profile', profile);

  const list = await promisify(wsClient.list.bind(wsClient), { page: 1, pageSize: 5 }, metadata(tokens.accessToken));
  console.log('Workspaces', list?.items?.length ?? 0);

  const stream = reqClient.streamRun(metadata(tokens.accessToken));
  stream.on('data', (evt: any) => console.log('Stream event', evt));
  stream.on('error', (err: any) => console.error('Stream error', err));
  stream.on('end', () => console.log('Stream finished'));
  stream.write({ method: 'GET', url: 'https://postman-echo.com/get' });
  stream.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
