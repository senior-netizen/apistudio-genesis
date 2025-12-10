import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CacheService } from '../../infra/cache/cache.service';
import { OpenApiGenerator } from './generators/openapi.generator';

@Injectable()
export class DocumentationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly openApiGenerator: OpenApiGenerator,
    ) { }

    async generateOpenApiSpec(
        collectionId: string,
        userId: string,
        config?: { title?: string; description?: string; version?: string },
    ) {
        // Verify ownership
        await this.verifyCollectionOwnership(collectionId, userId);

        // Get or create documentation config
        let docConfig = await this.prisma.documentationConfig.findUnique({
            where: { collectionId },
        });

        if (!docConfig) {
            const collection = await this.prisma.collection.findUnique({
                where: { id: collectionId },
                select: { name: true, workspaceId: true },
            });

            docConfig = await this.prisma.documentationConfig.create({
                data: {
                    collectionId,
                    workspaceId: collection!.workspaceId,
                    title: config?.title || collection!.name,
                    description: config?.description || `API documentation for ${collection!.name}`,
                    version: config?.version || '1.0.0',
                },
            });
        } else if (config) {
            // Update config if provided
            docConfig = await this.prisma.documentationConfig.update({
                where: { id: docConfig.id },
                data: {
                    title: config.title ?? docConfig.title,
                    description: config.description ?? docConfig.description,
                    version: config.version ?? docConfig.version,
                },
            });
        }

        // Generate OpenAPI spec
        const spec = await this.openApiGenerator.generate(collectionId, {
            title: docConfig.title,
            description: docConfig.description || undefined,
            version: docConfig.version,
        });

        return {
            config: docConfig,
            spec,
        };
    }

    async getDocumentationConfig(collectionId: string, userId: string) {
        await this.verifyCollectionOwnership(collectionId, userId);

        const config = await this.prisma.documentationConfig.findUnique({
            where: { collectionId },
        });

        if (!config) {
            throw new NotFoundException({
                code: 'DOCUMENTATION_NOT_FOUND',
                message: 'Documentation configuration not found',
            });
        }

        // Generate preview
        const spec = await this.openApiGenerator.generate(collectionId, {
            title: config.title,
            description: config.description || undefined,
            version: config.version,
        });

        return {
            config,
            spec,
        };
    }

    async publishDocumentation(collectionId: string, userId: string) {
        await this.verifyCollectionOwnership(collectionId, userId);

        const config = await this.prisma.documentationConfig.findUnique({
            where: { collectionId },
        });

        if (!config) {
            throw new NotFoundException({
                code: 'DOCUMENTATION_NOT_FOUND',
                message: 'Documentation configuration not found. Generate documentation first.',
            });
        }

        // Generate unique public URL if not exists
        const publishedUrl = config.publishedUrl || this.generatePublicUrl(collectionId);

        const updated = await this.prisma.documentationConfig.update({
            where: { id: config.id },
            data: {
                published: true,
                publishedUrl,
            },
        });

        return {
            published: true,
            url: publishedUrl,
            config: updated,
        };
    }

    async exportDocumentation(collectionId: string, userId: string) {
        await this.verifyCollectionOwnership(collectionId, userId);

        const config = await this.prisma.documentationConfig.findUnique({
            where: { collectionId },
        });

        if (!config) {
            throw new NotFoundException({
                code: 'DOCUMENTATION_NOT_FOUND',
                message: 'Documentation configuration not found',
            });
        }

        const spec = await this.openApiGenerator.generate(collectionId, {
            title: config.title,
            description: config.description || undefined,
            version: config.version,
        });

        return {
            format: 'openapi-json',
            spec,
        };
    }

    private async verifyCollectionOwnership(collectionId: string, userId: string) {
        const collection = await this.prisma.collection.findUnique({
            where: { id: collectionId },
            select: {
                id: true,
                workspace: {
                    select: { ownerId: true },
                },
            },
        });

        if (!collection || collection.workspace.ownerId !== userId) {
            throw new NotFoundException({
                code: 'COLLECTION_NOT_FOUND',
                message: 'Collection not found',
            });
        }

        return collection;
    }

    private generatePublicUrl(collectionId: string): string {
        // Generate a unique slug for the public documentation URL
        const shortId = collectionId.substring(0, 8);
        return `docs-${shortId}`;
    }
}
