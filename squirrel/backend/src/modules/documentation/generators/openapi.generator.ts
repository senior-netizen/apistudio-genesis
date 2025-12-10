import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

interface OpenApiInfo {
    title: string;
    description?: string;
    version: string;
}

@Injectable()
export class OpenApiGenerator {
    constructor(private readonly prisma: PrismaService) { }

    async generate(collectionId: string, info: OpenApiInfo) {
        // Fetch collection with all requests
        const collection = await this.prisma.collection.findUnique({
            where: { id: collectionId },
            include: {
                requests: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!collection) {
            throw new Error('Collection not found');
        }

        // Build OpenAPI 3.0 specification
        const spec: any = {
            openapi: '3.0.0',
            info: {
                title: info.title,
                description: info.description,
                version: info.version,
            },
            servers: [],
            paths: {},
            components: {
                schemas: {},
                securitySchemes: {},
            },
        };

        // Group requests by path
        const pathGroups = this.groupRequestsByPath(collection.requests);

        // Generate path items
        for (const [path, requests] of Object.entries(pathGroups)) {
            spec.paths[path] = {};

            for (const request of requests) {
                const method = request.method.toLowerCase();
                spec.paths[path][method] = this.generateOperation(request);
            }
        }

        // Extract unique servers from request URLs
        spec.servers = this.extractServers(collection.requests);

        return spec;
    }

    private groupRequestsByPath(requests: any[]): Record<string, any[]> {
        const groups: Record<string, any[]> = {};

        for (const request of requests) {
            // Extract path from URL (remove protocol and domain)
            const path = this.extractPath(request.url);

            if (!groups[path]) {
                groups[path] = [];
            }
            groups[path].push(request);
        }

        return groups;
    }

    private extractPath(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.pathname || '/';
        } catch {
            // If not a valid URL, treat the whole thing as a path
            return url.startsWith('/') ? url : `/${url}`;
        }
    }

    private extractServers(requests: any[]): any[] {
        const servers = new Set<string>();

        for (const request of requests) {
            try {
                const urlObj = new URL(request.url);
                servers.add(`${urlObj.protocol}//${urlObj.host}`);
            } catch {
                // Skip invalid URLs
            }
        }

        return Array.from(servers).map((url) => ({ url }));
    }

    private generateOperation(request: any): any {
        const operation: any = {
            summary: request.name,
            operationId: `${request.method.toLowerCase()}_${request.id}`,
            tags: [],
            parameters: [],
            responses: {
                '200': {
                    description: 'Successful response',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                            },
                        },
                    },
                },
            },
        };

        // Parse headers
        const headers = typeof request.headers === 'object' ? request.headers : {};

        // Add header parameters
        for (const [name, value] of Object.entries(headers)) {
            if (name.toLowerCase() === 'content-type') continue; // Skip content-type
            if (name.toLowerCase() === 'authorization') {
                // Add security requirement
                operation.security = [{ bearerAuth: [] }];
                continue;
            }

            operation.parameters.push({
                name,
                in: 'header',
                required: false,
                schema: {
                    type: 'string',
                    default: value,
                },
            });
        }

        // Add request body for POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.body) {
            operation.requestBody = {
                content: {
                    'application/json': {
                        schema: this.inferSchemaFromJson(request.body),
                    },
                },
            };
        }

        // Extract query parameters from URL
        const queryParams = this.extractQueryParams(request.url);
        for (const [name, value] of Object.entries(queryParams)) {
            operation.parameters.push({
                name,
                in: 'query',
                required: false,
                schema: {
                    type: 'string',
                    default: value,
                },
            });
        }

        // Extract path parameters
        const pathParams = this.extractPathParams(request.url);
        for (const param of pathParams) {
            operation.parameters.push({
                name: param,
                in: 'path',
                required: true,
                schema: {
                    type: 'string',
                },
            });
        }

        return operation;
    }

    private extractQueryParams(url: string): Record<string, string> {
        try {
            const urlObj = new URL(url);
            const params: Record<string, string> = {};
            urlObj.searchParams.forEach((value, key) => {
                params[key] = value;
            });
            return params;
        } catch {
            return {};
        }
    }

    private extractPathParams(url: string): string[] {
        const path = this.extractPath(url);
        const params: string[] = [];
        const regex = /:([a-zA-Z0-9_]+)/g;
        let match;

        while ((match = regex.exec(path)) !== null) {
            params.push(match[1]);
        }

        return params;
    }

    private inferSchemaFromJson(json: any): any {
        if (typeof json !== 'object' || json === null) {
            return { type: typeof json };
        }

        if (Array.isArray(json)) {
            return {
                type: 'array',
                items: json.length > 0 ? this.inferSchemaFromJson(json[0]) : { type: 'object' },
            };
        }

        const properties: any = {};
        const required: string[] = [];

        for (const [key, value] of Object.entries(json)) {
            properties[key] = this.inferSchemaFromJson(value);
            if (value !== null && value !== undefined) {
                required.push(key);
            }
        }

        return {
            type: 'object',
            properties,
            required: required.length > 0 ? required : undefined,
        };
    }
}
