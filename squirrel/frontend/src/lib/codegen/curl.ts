import type { ApiRequest } from '../../types/api';
import { resolveBodyForCodegen, serializeHeaders } from './shared';

export function generateCurl(request: ApiRequest, resolvedUrl: string): string {
  const lines = [`curl -X ${request.method.toUpperCase()} '${resolvedUrl}'`];
  const headerLines = serializeHeaders(request.headers).map((header) => `  -H '${header}'`);
  const body = resolveBodyForCodegen(request.body);
  lines.push(...headerLines);
  if (body) {
    lines.push(`  --data '${body}'`);
  }
  return lines.join(' \
');
}
