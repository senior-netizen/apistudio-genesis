import { createId } from '../../store/utils';
import type { ApiProject, ApiCollection, ApiRequest, RequestBody, RequestParam, RequestHeader } from '../../types/api';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';

interface OpenApiSpec {
  openapi?: string;
  swagger?: string;
  info?: { title?: string; version?: string; description?: string };
  servers?: Array<{ url?: string }>;
  paths?: Record<
    string,
    Partial<
      Record<
        HttpMethod,
        {
          summary?: string;
          description?: string;
          parameters?: Array<{ name: string; in: string; required?: boolean; schema?: { type?: string }; example?: string }>;
          requestBody?: {
            content?: Record<string, { example?: unknown; examples?: Record<string, unknown>; schema?: { example?: unknown } }>;
          };
        }
      >
    >
  >;
}

function buildUrl(server: string | undefined, path: string) {
  if (!server) return path;
  return `${server.replace(/\/$/, '')}${path}`;
}

function buildParams(parameters?: any[]): RequestParam[] {
  return (
    parameters
      ?.filter((p) => p.in === 'query')
      .map((p) => ({
        id: createId(),
        key: p.name,
        value: p.example ?? '',
        description: p.description,
        enabled: true,
      })) ?? []
  );
}

function buildHeaders(parameters?: any[]): RequestHeader[] {
  return (
    parameters
      ?.filter((p) => p.in === 'header')
      .map((p) => ({
        id: createId(),
        key: p.name,
        value: p.example ?? '',
        description: p.description,
        enabled: true,
      })) ?? []
  );
}

function buildBody(requestBody: any): RequestBody | undefined {
  if (!requestBody || !requestBody.content) return { mode: 'none' };
  const firstMedia = Object.entries(requestBody.content)[0];
  if (!firstMedia) return { mode: 'none' };
  const [mediaType, media] = firstMedia as [string, any];
  const example = media?.example ?? media?.schema?.example;
  if (mediaType.includes('json')) {
    return { mode: 'json', json: typeof example === 'string' ? example : JSON.stringify(example, null, 2) };
  }
  return { mode: 'raw', raw: typeof example === 'string' ? example : JSON.stringify(example ?? '', null, 2) };
}

export function parseOpenApi(spec: OpenApiSpec): ApiProject {
  const projectName = spec.info?.title ?? 'Imported OpenAPI';
  const collection: ApiCollection = { id: createId(), name: projectName, description: spec.info?.description, folders: [], requests: [], tags: [] };
  const serverUrl = spec.servers?.[0]?.url;

  if (spec.paths) {
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, definition] of Object.entries(methods ?? {})) {
        const verb = method.toUpperCase();
        const request: ApiRequest = {
          id: createId(),
          name: definition?.summary || `${verb} ${path}`,
          method: verb,
          url: buildUrl(serverUrl, path),
          description: definition?.description,
          params: buildParams((definition as any)?.parameters),
          headers: buildHeaders((definition as any)?.parameters),
          body: buildBody((definition as any)?.requestBody),
          auth: { type: 'none' },
          scripts: { preRequest: '', test: '' },
          tags: [],
          examples: [],
        };
        collection.requests.push(request);
      }
    }
  }

  return { id: createId(), name: projectName, description: spec.info?.description, collections: [collection] };
}

export function toOpenApi(project: ApiProject) {
  const paths: Record<string, any> = {};
  const addRequest = (request: ApiRequest) => {
    try {
      const urlObj = new URL(request.url);
      const path = urlObj.pathname || request.url;
      const queryParams: RequestParam[] = request.params ?? [];
      paths[path] = paths[path] || {};
      paths[path][request.method.toLowerCase()] = {
        summary: request.name,
        description: request.description,
        parameters: [
          ...(queryParams?.map((p) => ({
            name: p.key,
            in: 'query',
            required: false,
            example: p.value,
          })) ?? []),
          ...(request.headers?.map((h) => ({
            name: h.key,
            in: 'header',
            required: false,
            example: h.value,
          })) ?? []),
        ],
        requestBody:
          request.body && request.body.mode !== 'none'
            ? {
                content: {
                  'application/json': {
                    example: request.body.json ?? request.body.raw ?? '',
                  },
                },
              }
            : undefined,
      };
    } catch {
      // fallback: place under literal url
      paths[request.url] = paths[request.url] || {};
      paths[request.url][request.method.toLowerCase()] = {
        summary: request.name,
        description: request.description,
      };
    }
  };

  project.collections.forEach((collection) => collection.requests.forEach(addRequest));

  return {
    openapi: '3.0.0',
    info: {
      title: project.name,
      version: '1.0.0',
    },
    paths,
  };
}
