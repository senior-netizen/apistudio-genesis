// Loosen PrismaClient typing to allow model access without a generated client in CI/offline
import 'src';
declare module '@prisma/client' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface PrismaClient {
    // Allow arbitrary model properties like prisma.workspaceMember, prisma.featureFlag, etc.
    [key: string]: any;
  }
}

