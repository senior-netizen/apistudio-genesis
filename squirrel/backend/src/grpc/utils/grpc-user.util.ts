import { Metadata } from '@grpc/grpc-js';

export type GrpcUser = { id: string; email: string; role?: string; sessionId?: string };

export function getUserFromMetadata(metadata?: Metadata): GrpcUser | null {
  if (!metadata) return null;
  const user = (metadata as any).__user as GrpcUser | undefined;
  if (!user?.id) return null;
  return user;
}
