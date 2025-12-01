import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(workspaceId: string, query: string) {
    const [collections, requests] = await Promise.all([
      this.prisma.collection.findMany({
        where: { workspaceId, name: { contains: query, mode: 'insensitive' } },
        take: 10,
      }),
      this.prisma.request.findMany({
        where: { collection: { workspaceId }, name: { contains: query, mode: 'insensitive' } },
        take: 10,
      }),
    ]);
    return { collections, requests };
  }
}
