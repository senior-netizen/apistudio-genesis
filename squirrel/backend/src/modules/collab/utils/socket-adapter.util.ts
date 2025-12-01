import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Redis } from 'ioredis';

export async function configureSocketAdapter(
  logger: Logger,
  server: Server,
  pubClient: Redis,
  subClient: Redis,
): Promise<void> {
  const adapterFactory = createAdapter(pubClient, subClient);
  const target = resolveAdapterTarget(server);
  if (target) {
    target.adapter(adapterFactory);
    logger.log('Collaboration gateway initialized with Redis adapter');
  } else {
    logger.warn('Socket.io adapter method not available; skipping Redis adapter configuration');
  }
}

function resolveAdapterTarget(server: Server): { adapter: (factory: ReturnType<typeof createAdapter>) => void } | null {
  const namespace = server as unknown;
  if (isAdapterCapable(namespace)) {
    return namespace as { adapter: (factory: ReturnType<typeof createAdapter>) => void };
  }
  if (
    namespace &&
    typeof namespace === 'object' &&
    'server' in (namespace as { server?: unknown }) &&
    isAdapterCapable((namespace as { server?: unknown }).server)
  ) {
    return (namespace as { server?: unknown }).server as {
      adapter: (factory: ReturnType<typeof createAdapter>) => void;
    };
  }
  return null;
}

function isAdapterCapable(
  value: unknown,
): value is { adapter: (factory: ReturnType<typeof createAdapter>) => void } {
  return typeof value === 'object' && value !== null && typeof (value as { adapter?: unknown }).adapter === 'function';
}
