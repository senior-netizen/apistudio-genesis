import type { ApiRequest } from '../../types/api';
import { resolveBodyForCodegen, serializeHeaders } from './shared';

export function generateJavaOkHttp(request: ApiRequest, resolvedUrl: string): string {
  const headers = serializeHeaders(request.headers);
  const body = resolveBodyForCodegen(request.body);
  const method = request.method.toUpperCase();
  const includeBody = Boolean(body);
  const lines: string[] = [];
  lines.push('OkHttpClient client = new OkHttpClient();');
  if (includeBody) {
    lines.push("MediaType mediaType = MediaType.parse(\"application/json\");");
    lines.push(`RequestBody requestBody = RequestBody.create(mediaType, ${JSON.stringify(body)});`);
  }
  lines.push('Request request = new Request.Builder()');
  lines.push(`    .url("${resolvedUrl}")`);
  headers.forEach((header) => {
    const [key, value] = header.split(':');
    lines.push(`    .addHeader("${key.trim()}", "${value.trim()}")`);
  });
  lines.push(`    .method("${method}", ${includeBody ? 'requestBody' : 'null'})`);
  lines.push('    .build();');
  lines.push('');
  lines.push('try (Response response = client.newCall(request).execute()) {');
  lines.push('    System.out.println(response.body().string());');
  lines.push('}');
  return lines.join('\n');
}
