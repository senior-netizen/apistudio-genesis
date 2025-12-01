import type { ApiRequest } from '../../types/api';
import { resolveBodyForCodegen, serializeHeaders } from './shared';

export function generatePhpCurl(request: ApiRequest, resolvedUrl: string): string {
  const headers = serializeHeaders(request.headers);
  const body = resolveBodyForCodegen(request.body);
  const lines: string[] = [];
  lines.push('$curl = curl_init();');
  lines.push('');
  lines.push('curl_setopt_array($curl, [');
  lines.push(`    CURLOPT_URL => '${resolvedUrl}',`);
  lines.push('    CURLOPT_RETURNTRANSFER => true,');
  lines.push(`    CURLOPT_CUSTOMREQUEST => '${request.method.toUpperCase()}',`);
  if (headers.length) {
    lines.push('    CURLOPT_HTTPHEADER => [');
    headers.forEach((header) => {
      lines.push(`        '${header}',`);
    });
    lines.push('    ],');
  }
  if (body) {
    lines.push(`    CURLOPT_POSTFIELDS => ${JSON.stringify(body)},`);
  }
  lines.push(']);');
  lines.push('');
  lines.push('$response = curl_exec($curl);');
  lines.push('if ($response === false) {');
  lines.push('    throw new RuntimeException(curl_error($curl));');
  lines.push('}');
  lines.push('curl_close($curl);');
  lines.push('echo $response;');
  return lines.join('\n');
}
