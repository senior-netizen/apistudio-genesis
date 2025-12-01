import type { ApiRequest } from '../../types/api';
import { resolveBodyForCodegen, serializeHeaders } from './shared';

export function generatePythonRequests(request: ApiRequest, resolvedUrl: string): string {
  const headers = serializeHeaders(request.headers);
  const body = resolveBodyForCodegen(request.body);
  const lines: string[] = [];
  lines.push('import requests');
  lines.push('');
  lines.push(`url = '${resolvedUrl}'`);
  if (headers.length) {
    lines.push('headers = {');
    headers.forEach((header) => {
      const [key, value] = header.split(':');
      lines.push(`    '${key.trim()}': '${value.trim()}',`);
    });
    lines.push('}');
  } else {
    lines.push('headers = {}');
  }
  if (body) {
    lines.push(`payload = ${JSON.stringify(body)}`);
  } else {
    lines.push('payload = None');
  }
  lines.push(`response = requests.request('${request.method.toUpperCase()}', url, headers=headers, data=payload)`);
  lines.push('print(response.text)');
  return lines.join('\n');
}
