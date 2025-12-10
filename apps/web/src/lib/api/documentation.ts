import { apiFetch } from './client';

export interface DocumentationConfig {
    id: string;
    collectionId: string;
    title: string;
    description?: string;
    version: string;
    logoUrl?: string;
    theme: string;
    published: boolean;
    publishedUrl?: string;
}

export interface GenerateDocumentationParams {
    title?: string;
    description?: string;
    version?: string;
}

export const documentationApi = {
    async generate(collectionId: string, config?: GenerateDocumentationParams) {
        const response = await apiFetch(
            `/collections/${collectionId}/documentation/generate`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            }
        );
        return response.json();
    },

    async getPreview(collectionId: string) {
        const response = await apiFetch(
            `/collections/${collectionId}/documentation/preview`
        );
        return response.json();
    },

    async publish(collectionId: string) {
        const response = await apiFetch(
            `/collections/${collectionId}/documentation/publish`,
            { method: 'POST' }
        );
        return response.json();
    },

    async export(collectionId: string) {
        const response = await apiFetch(
            `/collections/${collectionId}/documentation/export`
        );
        return response.json();
    },

    async introspectGraphQL(requestId: string) {
        const response = await apiFetch(
            `/requests/${requestId}/graphql/introspect`,
            { method: 'POST' }
        );
        return response.json();
    },
};
