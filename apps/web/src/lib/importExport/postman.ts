import { createId } from '../../store/utils';
import type { ApiProject, ApiCollection, ApiRequest, RequestBody, ApiFolder } from '../../types/api';

type PostmanUrl = string | { raw?: string; host?: string[]; path?: string[]; query?: Array<{ key: string; value?: string; disabled?: boolean }> };

interface PostmanItem {
  name: string;
  item?: PostmanItem[];
  request?: {
    method: string;
    header?: Array<{ key: string; value?: string; disabled?: boolean }>;
    url?: PostmanUrl;
    body?: {
      mode?: string;
      raw?: string;
      urlencoded?: Array<{ key: string; value?: string; disabled?: boolean }>;
      formdata?: Array<{ key: string; value?: string; src?: string; disabled?: boolean; type?: string }>;
    };
    auth?: any;
    description?: string;
  };
  description?: string;
}

interface PostmanCollection {
  info?: { name?: string };
  item?: PostmanItem[];
}

function parseUrl(url?: PostmanUrl): { url: string; params: ApiRequest['params'] } {
  if (!url) return { url: '', params: [] };
  if (typeof url === 'string') return { url, params: [] };
  const raw = url.raw || '';
  const params =
    url.query?.map((q) => ({
      id: createId(),
      key: q.key,
      value: q.value ?? '',
      enabled: q.disabled !== true,
      description: undefined,
    })) ?? [];
  return { url: raw, params };
}

function parseBody(body?: any): RequestBody | undefined {
  if (!body || !body.mode) return { mode: 'none' };
  if (body.mode === 'raw') {
    return { mode: 'raw', raw: body.raw ?? '' };
  }
  if (body.mode === 'urlencoded') {
    return {
      mode: 'x-www-form-urlencoded',
      urlEncoded:
        body.urlencoded?.map((entry: any) => ({
          id: createId(),
          key: entry.key,
          value: entry.value ?? '',
          enabled: entry.disabled !== true,
        })) ?? [],
    };
  }
  if (body.mode === 'formdata') {
    return {
      mode: 'form-data',
      formData:
        body.formdata?.map((entry: any) => ({
          id: createId(),
          key: entry.key,
          value: entry.src ?? entry.value ?? '',
          enabled: entry.disabled !== true,
          isFile: entry.type === 'file',
        })) ?? [],
    };
  }
  return { mode: 'none' };
}

function parseAuth(auth: any): ApiRequest['auth'] {
  if (!auth || auth.type === 'noauth') return { type: 'none' };
  const type = auth.type as string;
  if (type === 'bearer' && Array.isArray(auth.bearer) && auth.bearer[0]?.value) {
    return { type: 'bearer', bearerToken: auth.bearer[0].value };
  }
  if (type === 'apikey' && Array.isArray(auth.apikey)) {
    const entry = auth.apikey[0];
    return {
      type: 'apiKey',
      apiKey: {
        key: entry?.key || 'X-API-KEY',
        value: entry?.value ?? '',
        in: entry?.in === 'query' ? 'query' : 'header',
      },
    };
  }
  if (type === 'basic' && Array.isArray(auth.basic)) {
    const username = auth.basic.find((b: any) => b.key === 'username')?.value ?? '';
    const password = auth.basic.find((b: any) => b.key === 'password')?.value ?? '';
    return { type: 'basic', basic: { username, password } };
  }
  return { type: 'none' };
}

function mapItemToFolder(item: PostmanItem, collectionName: string): { folders: ApiFolder[]; requests: ApiRequest[] } {
  if (item.item && !item.request) {
    const childResults = item.item.map((child) => mapItemToFolder(child, collectionName));
    const mergedFolders = childResults.flatMap((c) => c.folders);
    const mergedRequests = childResults.flatMap((c) => c.requests);
    const folder: ApiFolder = {
      id: createId(),
      name: item.name || 'Folder',
      description: item.description,
      requests: mergedRequests,
      folders: mergedFolders,
    };
    return { folders: [folder], requests: [] };
  }

  if (item.item && item.request) {
    // Treat this as a folder with an entry + nested children
    const childResults = item.item.map((child) => mapItemToFolder(child, collectionName));
    const childFolders = childResults.flatMap((c) => c.folders);
    const childRequests = childResults.flatMap((c) => c.requests);
    const { url, params } = parseUrl(item.request.url);
    const request = buildRequest(item, url, params, collectionName);
    const folder: ApiFolder = {
      id: createId(),
      name: item.name || 'Folder',
      description: item.description,
      requests: [request, ...childRequests],
      folders: childFolders,
    };
    return { folders: [folder], requests: [] };
  }

  if (item.request) {
    const { url, params } = parseUrl(item.request.url);
    return { folders: [], requests: [buildRequest(item, url, params, collectionName)] };
  }

  if (item.item) {
    // Only children, no request on this node
    const childResults = item.item.map((child) => mapItemToFolder(child, collectionName));
    return {
      folders: childResults.flatMap((c) => c.folders),
      requests: childResults.flatMap((c) => c.requests),
    };
  }

  return { folders: [], requests: [] };
}

function buildRequest(item: PostmanItem, url: string, params: ApiRequest['params'], collectionName: string): ApiRequest {
  const request = item.request!;
  return {
    id: createId(),
    name: item.name || 'Request',
    method: (request.method || 'GET').toUpperCase(),
    url,
    description: request.description,
    body: parseBody(request.body),
    headers:
      request.header?.map((h: any) => ({
        id: createId(),
        key: h.key,
        value: h.value ?? '',
        enabled: h.disabled !== true,
        description: undefined,
      })) ?? [],
    params,
    auth: parseAuth(request.auth),
    scripts: { preRequest: '', test: '' },
    tags: [collectionName],
    examples: [],
  };
}

export function parsePostmanCollection(json: PostmanCollection): ApiProject {
  const projectName = json.info?.name ?? 'Imported Postman Collection';
  const collectionItems = json.item ?? [];
  const folders: ApiFolder[] = [];
  const requests: ApiRequest[] = [];
  collectionItems.forEach((item) => {
    const res = mapItemToFolder(item, projectName);
    folders.push(...res.folders);
    requests.push(...res.requests);
  });
  const collection: ApiCollection = {
    id: createId(),
    name: projectName,
    description: '',
    folders,
    requests,
    tags: [],
  };
  return {
    id: createId(),
    name: projectName,
    description: '',
    collections: [collection],
  };
}

export function toPostmanCollection(project: ApiProject) {
  const items: PostmanItem[] = project.collections.map((collection) => ({
    name: collection.name,
    description: collection.description,
    item: collection.requests.map((request) => ({
      name: request.name || `${request.method} ${request.url}`,
      request: {
        method: request.method,
        header: request.headers.map((h) => ({ key: h.key, value: h.value, disabled: h.enabled === false })),
        url: request.url,
        body:
          request.body?.mode === 'raw'
            ? { mode: 'raw', raw: request.body.raw ?? '' }
            : request.body?.mode === 'json'
            ? { mode: 'raw', raw: request.body.json ?? '' }
            : undefined,
        description: request.description,
      },
    })),
  }));

  return {
    info: {
      name: project.name,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: items,
  };
}
