import type { ApiRequest } from '../../types/api';
import { resolveBodyForCodegen, serializeHeaders } from './shared';

export function generateRubyNetHttp(request: ApiRequest, resolvedUrl: string): string {
  const headers = serializeHeaders(request.headers);
  const body = resolveBodyForCodegen(request.body);
  const lines: string[] = [];
  lines.push("require 'net/http'");
  lines.push("require 'uri'");
  lines.push('');
  lines.push(`uri = URI.parse('${resolvedUrl}')`);
  lines.push('http = Net::HTTP.new(uri.host, uri.port)');
  lines.push('http.use_ssl = uri.scheme == "https"');
  lines.push(`request = Net::HTTP::${request.method.toUpperCase()}.new(uri.request_uri)`);
  headers.forEach((header) => {
    const [key, value] = header.split(':');
    lines.push(`request['${key.trim()}'] = '${value.trim()}'`);
  });
  if (body) {
    lines.push(`request.body = ${JSON.stringify(body)}`);
  }
  lines.push('response = http.request(request)');
  lines.push('puts response.body');
  return lines.join('\n');
}
