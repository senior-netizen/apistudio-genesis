import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async createSignedUrl(workspaceId: string, name: string, contentType: string, sizeBytes: number) {
    const token = randomBytes(24).toString('hex');
    const storageKey = `uploads/${workspaceId}/${Date.now()}-${token}`;
    const file = await this.prisma.fileObject.create({
      data: {
        workspaceId,
        name,
        contentType,
        sizeBytes,
        storageKey,
      },
    });
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    return {
      uploadUrl: `https://storage.local/${storageKey}?token=${token}`,
      downloadUrl: `https://storage.local/${storageKey}?token=${token}`,
      expiresAt,
      fileId: file.id,
    };
  }
}
