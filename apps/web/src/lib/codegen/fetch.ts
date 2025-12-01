import type { ApiRequest } from '../../types/api';
import { resolveBodyForCodegen, serializeHeaders } from './shared';

export function generateFetch(request: ApiRequest, resolvedUrl: string, language: 'js' | 'ts' = 'ts'): string {
  const headers = serializeHeaders(request.headers);
  const body = resolveBodyForCodegen(request.body);
  const lines: string[] = [];
  lines.push(`const response = await fetch('${resolvedUrl}', {`);
  lines.push(`  method: '${request.method.toUpperCase()}',`);
  if (headers.length) {
    lines.push(`  headers: {`);
    headers.forEach((header) => {
      const [key, value] = header.split(':');
      lines.push(`    '${key.trim()}': '${value.trim()}',`);
    });
    lines.push(`  },`);
  }
  if (body) {
    lines.push(`  body: ${language === 'ts' ? 'JSON.stringify(' : ''}${JSON.stringify(body)}${language === 'ts' ? ')' : ''}`);
  }
  lines.push(`});`);
  lines.push(`const data = await response.json();`);
  return lines.join('\n');
}
