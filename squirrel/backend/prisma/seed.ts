import { PrismaClient } from '@prisma/client';
import { compressJson } from '@sdl/sync-core';

const prisma = new PrismaClient();

async function ensureSnapshot(scopeType: string, scopeId: string) {
  const existing = await prisma.syncSnapshot.findFirst({
    where: { scopeType, scopeId },
    orderBy: { version: 'desc' },
  });
  if (existing) {
    return existing;
  }
  const payload = compressJson({ scopeType, scopeId, createdAt: new Date().toISOString(), data: {} });
  return prisma.syncSnapshot.create({
    data: {
      scopeType,
      scopeId,
      version: BigInt(1),
      payloadCompressed: Buffer.from(payload),
    },
  });
}

async function main() {
  const workspaces = await prisma.workspace.findMany({
    select: { id: true, projects: { select: { id: true } } },
  });
  for (const workspace of workspaces) {
    await ensureSnapshot('workspace', workspace.id);
    if (workspace.projects.length === 0) {
      continue;
    }
    for (const project of workspace.projects) {
      await ensureSnapshot('project', project.id);
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seeding workspace sync snapshots failed', error);
    await prisma.$disconnect();
    process.exit(1);
  });
