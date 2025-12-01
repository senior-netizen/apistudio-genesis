import { PrismaClient } from '@prisma/client';
import { isIP } from 'net';
import Redis from 'ioredis';
import { QueueService, type RegisteredJob } from '@squirrel/queue';
import { QUEUES } from '../infra/queue/queue.constants';

const redisUrl = process.env.REDIS_URL ?? process.env.WS_REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL must be set to start workers.');
}

const runExecuteJob: RegisteredJob<{
  requestId: string;
  runId: string;
  userId?: string;
  environment?: string;
}> = { name: 'execute', queueName: QUEUES.RUN_EXECUTE };

let prisma: PrismaClient | null = null;
let redis: Redis | null = null;

function ensureClients() {
  if (!prisma) prisma = new PrismaClient();
  if (!redis) redis = new Redis(redisUrl as string);
  return { prisma: prisma!, redis: redis! };
}

function isPrivateIpV4(ip: string) {
  const parts = ip.split('.').map((x) => parseInt(x, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local
  if (a === 0) return true; // 0.0.0.0/8
  return false;
}

function isBlockedHost(host: string): boolean {
  const lower = host.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local')) return true;
  const ipVersion = isIP(lower);
  if (ipVersion === 4) return isPrivateIpV4(lower);
  if (ipVersion === 6) {
    return lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd');
  }
  return false;
}

const MAX_BYTES = parseInt(process.env.WORKER_MAX_RESPONSE_BYTES || '1048576', 10); // 1MB default
const TIMEOUT_MS = parseInt(process.env.WORKER_FETCH_TIMEOUT_MS || '5000', 10);

export const registerWorker = async (queueService: QueueService) => {
  const { prisma } = ensureClients();
  await queueService.createWorker(runExecuteJob, async (job) => {
    const { requestId, runId, userId, environment } = job.data;
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { collection: { select: { workspaceId: true } } },
    });
    if (!request) {
      await prisma.requestRun.update({ where: { id: runId }, data: { status: 'FAILED', error: 'Request missing' } });
      return;
    }
    const workspaceId = request.collection?.workspaceId;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const started = Date.now();
    try {
      const url = new URL(request.url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Unsupported protocol');
      }
      if (isBlockedHost(url.hostname)) {
        throw new Error('Blocked host');
      }
      const response = await fetch(url, {
        method: request.method,
        headers: request.headers as Record<string, string>,
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: controller.signal,
        redirect: 'manual',
      });
      let text = '';
      if (response.body) {
        const reader = (response.body as any).getReader?.();
        if (reader && typeof reader.read === 'function') {
          const decoder = new TextDecoder();
          let received = 0;
          let result = await reader.read();
          while (!result.done) {
            const value = result.value;
            if (value) {
              received += value.length;
              if (received > MAX_BYTES) {
                throw new Error('Response too large');
              }
              text += decoder.decode(value, { stream: true });
            }
            result = await reader.read();
          }
          text += new TextDecoder().decode();
        } else {
          text = await response.text();
          if (text.length > MAX_BYTES) throw new Error('Response too large');
        }
      } else {
        text = await response.text();
        if (text.length > MAX_BYTES) throw new Error('Response too large');
      }
      const durationMs = Date.now() - started;
      await prisma.requestRun.update({
        where: { id: runId },
        data: {
          status: response.ok ? 'SUCCEEDED' : 'FAILED',
          responseCode: response.status,
          responseBody: text,
          durationMs,
        },
      });
      if (workspaceId) {
        await emitLog(workspaceId, {
          requestId,
          userId,
          method: request.method,
          url: request.url,
          status: response.status,
          durationMs,
          sizeBytes: text.length,
          environment,
        });
      }
    } catch (error) {
      await prisma.requestRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      if (workspaceId) {
        await emitLog(workspaceId, {
          requestId,
          userId,
          method: request.method,
          url: request.url,
          status: undefined,
          durationMs: Date.now() - started,
          sizeBytes: undefined,
          environment,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      clearTimeout(timeout);
    }
  });
};

async function emitLog(
  workspaceId: string,
  entry: {
    requestId: string;
    userId?: string;
    method: string;
    url: string;
    status?: number;
    durationMs?: number;
    sizeBytes?: number;
    environment?: string;
    error?: string;
  },
) {
  const { prisma, redis } = ensureClients();
  const payload = {
    timestamp: new Date().toISOString(),
    userId: entry.userId,
    requestId: entry.requestId,
    method: entry.method,
    url: entry.url,
    status: entry.status,
    durationMs: entry.durationMs,
    sizeBytes: entry.sizeBytes,
    environment: entry.environment ?? null,
    error: entry.error,
  };
  const streamKey = `logs:workspace:${workspaceId}`;
  try {
    await prisma.requestLog.create({
      data: {
        workspaceId,
        requestId: entry.requestId,
        userId: entry.userId,
        method: entry.method,
        url: entry.url,
        status: entry.status,
        durationMs: entry.durationMs,
        sizeBytes: entry.sizeBytes,
        environment: entry.environment,
        timestamp: new Date(payload.timestamp),
        error: entry.error,
      },
    });
  } catch (error) {
    console.error('Failed to persist request log', error);
  }
  try {
    await redis.xadd(streamKey, '*', 'entry', JSON.stringify(payload));
    await redis.xtrim(streamKey, 'MAXLEN', '~', 500);
    await redis.publish(streamKey, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to publish request log', error);
  }
}

async function bootstrapStandalone() {
  ensureClients();
  const queueService = new QueueService({
    queueNames: [QUEUES.RUN_EXECUTE],
    defaultJobOptions: { attempts: 3, removeOnComplete: true, backoff: { type: 'exponential', delay: 2000 } },
    redis: { url: redisUrl, enabled: process.env.REDIS_DISABLED !== 'true' },
  });
  await queueService.init();
  await registerWorker(queueService);

  process.on('SIGINT', async () => {
    await queueService.close();
    if (prisma) await prisma.$disconnect();
    if (redis) await redis.quit();
    process.exit(0);
  });
}

if (require.main === module) {
  bootstrapStandalone().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
