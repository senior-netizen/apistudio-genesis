import type { ApiRequest, RequestBody, RequestHeader } from '../../types/api';

export function serializeHeaders(headers: RequestHeader[]): string[] {
  return headers.filter((header) => header.enabled && header.key).map((header) => `${header.key}: ${header.value}`);
}

export function resolveBodyForCodegen(body?: RequestBody): string | undefined {
  if (!body || body.mode === 'none') return undefined;
  switch (body.mode) {
    case 'json':
      return body.json ?? '';
    case 'xml':
      return body.xml ?? '';
    case 'raw':
      return body.raw ?? '';
    case 'form-data':
      return JSON.stringify(
        body.formData?.filter((item) => item.enabled).map((item) => ({ key: item.key, value: item.value })) ?? []
      );
    case 'x-www-form-urlencoded':
      return new URLSearchParams(
        (body.urlEncoded ?? []).filter((item) => item.enabled).map((item) => [item.key, item.value])
      ).toString();
    case 'binary':
      return body.fileName ?? 'binary';
    default:
      return undefined;
  }
}

export type CodegenContext = {
  request: ApiRequest;
  resolvedUrl: string;
};
