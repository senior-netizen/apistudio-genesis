import type { ApiRequest } from '../../types/api';
import { resolveBodyForCodegen, serializeHeaders } from './shared';

export function generateAxios(request: ApiRequest, resolvedUrl: string): string {
  const headers = serializeHeaders(request.headers);
  const body = resolveBodyForCodegen(request.body);
  const lines: string[] = [];
  lines.push(`import axios from 'axios';`);
  lines.push(``);
  lines.push(`const client = axios.create({`);
  if (headers.length) {
    lines.push(`  headers: {`);
    headers.forEach((header) => {
      const [key, value] = header.split(':');
      lines.push(`    '${key.trim()}': '${value.trim()}',`);
    });
    lines.push(`  },`);
  }
  lines.push(`});`);
  lines.push(``);
  lines.push(`const response = await client.request({`);
  lines.push(`  method: '${request.method.toUpperCase()}',`);
  lines.push(`  url: '${resolvedUrl}',`);
  if (body) {
    lines.push(`  data: ${JSON.stringify(body)},`);
  }
  lines.push(`});`);
  lines.push(`console.log(response.data);`);
  return lines.join('\n');
}
