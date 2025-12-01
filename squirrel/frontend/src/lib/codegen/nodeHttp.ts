import type { ApiRequest } from '../../types/api';
import { resolveBodyForCodegen, serializeHeaders } from './shared';

export function generateNodeHttp(request: ApiRequest, resolvedUrl: string): string {
  const headers = serializeHeaders(request.headers);
  const body = resolveBodyForCodegen(request.body);
  const lines: string[] = [];
  lines.push("import https from 'https';");
  lines.push('');
  lines.push('const options = {');
  lines.push(`  method: '${request.method.toUpperCase()}',`);
  if (headers.length) {
    lines.push('  headers: {');
    headers.forEach((header) => {
      const [key, value] = header.split(':');
      lines.push(`    '${key.trim()}': '${value.trim()}',`);
    });
    lines.push('  },');
  }
  lines.push('};');
  lines.push('');
  lines.push(`const req = https.request('${resolvedUrl}', options, (res) => {`);
  lines.push('  let data = "";');
  lines.push("  res.on('data', (chunk) => { data += chunk; });");
  lines.push("  res.on('end', () => { console.log(data); });");
  lines.push('});');
  lines.push('');
  lines.push("req.on('error', (error) => { console.error(error); });");
  if (body) {
    lines.push(`req.write(${JSON.stringify(body)});`);
  }
  lines.push('req.end();');
  return lines.join('\n');
}
