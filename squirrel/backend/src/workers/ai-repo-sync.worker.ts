import { PrismaClient } from '@prisma/client';
import { randomBytes, createCipheriv } from 'crypto';
import { QueueService, type RegisteredJob } from '@squirrel/queue';
import { QUEUES } from '../infra/queue/queue.constants';

const redisUrl = process.env.REDIS_URL ?? process.env.WS_REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL must be set to start workers.');
}

const SUPPORTED_PROVIDER = 'github';
const REPO_SYNC_TOKEN_KEY_PREFIX = 'repo_sync.github.token';

const repoSyncOAuthExchangeJob: RegisteredJob<{
  provider: string;
  workspaceId: string;
  userId: string;
  code: string;
  receivedAt: string;
}> = { name: 'repo-sync-oauth-exchange', queueName: QUEUES.AI_GENERATE };

let prisma: PrismaClient | null = null;

function ensurePrisma() {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required for repo-sync OAuth exchange worker.`);
  }
  return value;
}

function encryptJsonPayload(payload: unknown) {
  const encryptionKeyBase64 = getRequiredEnv('ENCRYPTION_KEY_BASE64');
  const key = Buffer.from(encryptionKeyBase64, 'base64');
  if (key.byteLength !== 32) {
    throw new Error('ENCRYPTION_KEY_BASE64 must decode to 32 bytes.');
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    alg: 'aes-256-gcm',
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

async function exchangeGithubCodeForToken(code: string) {
  const tokenUrl = process.env.GITHUB_OAUTH_TOKEN_URL ?? 'https://github.com/login/oauth/access_token';
  const clientId = getRequiredEnv('GITHUB_OAUTH_CLIENT_ID');
  const clientSecret = getRequiredEnv('GITHUB_OAUTH_CLIENT_SECRET');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }).toString(),
  });

  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_token_expires_in?: number;
    scope?: string;
    token_type?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? `GitHub OAuth token exchange failed with status ${response.status}`);
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresInSeconds: json.expires_in,
    refreshExpiresInSeconds: json.refresh_token_expires_in,
    scope: json.scope,
    tokenType: json.token_type,
  };
}

async function persistRepoSyncCredentials(input: {
  workspaceId: string;
  userId: string;
  provider: string;
  token: Awaited<ReturnType<typeof exchangeGithubCodeForToken>>;
}) {
  const db = ensurePrisma();
  const now = new Date();
  const encrypted = encryptJsonPayload({
    provider: input.provider,
    workspaceId: input.workspaceId,
    userId: input.userId,
    token: input.token,
    issuedAt: now.toISOString(),
  });

  const key = `${REPO_SYNC_TOKEN_KEY_PREFIX}.${input.workspaceId}`;
  const value = JSON.stringify(encrypted);

  await db.variable.deleteMany({
    where: {
      workspaceId: input.workspaceId,
      key,
    },
  });

  await db.variable.create({
    data: {
      workspaceId: input.workspaceId,
      key,
      value,
    },
  });

  await db.auditLog.create({
    data: {
      workspaceId: input.workspaceId,
      actorId: input.userId,
      action: 'repo_sync.oauth.connected',
      metadata: {
        provider: input.provider,
        key,
        storedAt: now.toISOString(),
        hasRefreshToken: Boolean(input.token.refreshToken),
      },
    },
  });
}

export const registerWorker = async (queueService: QueueService) => {
  ensurePrisma();
  await queueService.createWorker(repoSyncOAuthExchangeJob, async (job) => {
    const { provider, workspaceId, userId, code } = job.data;
    if (provider !== SUPPORTED_PROVIDER) {
      throw new Error(`Unsupported repo sync provider in worker: ${provider}`);
    }

    const token = await exchangeGithubCodeForToken(code);
    await persistRepoSyncCredentials({ workspaceId, userId, provider, token });
  });
};

async function bootstrapStandalone() {
  ensurePrisma();
  const queueService = new QueueService({
    queueNames: [QUEUES.AI_GENERATE],
    defaultJobOptions: { attempts: 3, removeOnComplete: true, backoff: { type: 'exponential', delay: 2000 } },
    redis: { url: redisUrl, enabled: process.env.REDIS_DISABLED !== 'true' },
  });

  await queueService.init();
  await registerWorker(queueService);

  process.on('SIGINT', async () => {
    await queueService.close();
    if (prisma) await prisma.$disconnect();
    process.exit(0);
  });
}

if (require.main === module) {
  bootstrapStandalone().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
