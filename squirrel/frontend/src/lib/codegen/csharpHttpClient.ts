import type { ApiRequest } from '../../types/api';
import { resolveBodyForCodegen, serializeHeaders } from './shared';

export function generateCsharpHttpClient(request: ApiRequest, resolvedUrl: string): string {
  const headers = serializeHeaders(request.headers);
  const body = resolveBodyForCodegen(request.body);
  const lines: string[] = [];
  lines.push('using System.Net.Http;');
  lines.push('using System.Text;');
  lines.push('');
  lines.push('var client = new HttpClient();');
  lines.push(`var requestMessage = new HttpRequestMessage(HttpMethod.${request.method.toUpperCase()}, "${resolvedUrl}");`);
  headers.forEach((header) => {
    const [key, value] = header.split(':');
    lines.push(`requestMessage.Headers.Add("${key.trim()}", "${value.trim()}");`);
  });
  if (body) {
    lines.push(`requestMessage.Content = new StringContent(${JSON.stringify(body)}, Encoding.UTF8, "application/json");`);
  }
  lines.push('var response = await client.SendAsync(requestMessage);');
  lines.push('response.EnsureSuccessStatusCode();');
  lines.push('var content = await response.Content.ReadAsStringAsync();');
  lines.push('Console.WriteLine(content);');
  return lines.join('\n');
}
