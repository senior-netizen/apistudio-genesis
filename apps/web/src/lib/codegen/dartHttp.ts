import type { ApiRequest } from '../../types/api';
import { resolveBodyForCodegen, serializeHeaders } from './shared';

export function generateDartHttp(request: ApiRequest, resolvedUrl: string): string {
  const headers = serializeHeaders(request.headers);
  const body = resolveBodyForCodegen(request.body);
  const lines: string[] = [];
  lines.push("import 'package:http/http.dart' as http;");
  lines.push('');
  lines.push('final client = http.Client();');
  lines.push('try {');
  lines.push(`  final response = await client.${request.method.toLowerCase()}(`);
  lines.push(`    Uri.parse('${resolvedUrl}'),`);
  if (headers.length) {
    lines.push('    headers: {');
    headers.forEach((header) => {
      const [key, value] = header.split(':');
      lines.push(`      '${key.trim()}': '${value.trim()}',`);
    });
    lines.push('    },');
  }
  if (body) {
    lines.push(`    body: ${JSON.stringify(body)},`);
  }
  lines.push('  );');
  lines.push('  print(response.body);');
  lines.push('} finally {');
  lines.push('  client.close();');
  lines.push('}');
  return lines.join('\n');
}
