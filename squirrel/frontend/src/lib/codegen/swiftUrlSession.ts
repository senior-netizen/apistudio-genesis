import type { ApiRequest } from '../../types/api';
import { resolveBodyForCodegen, serializeHeaders } from './shared';

export function generateSwiftUrlSession(request: ApiRequest, resolvedUrl: string): string {
  const headers = serializeHeaders(request.headers);
  const body = resolveBodyForCodegen(request.body);
  const lines: string[] = [];
  lines.push(`let url = URL(string: "${resolvedUrl}")!`);
  lines.push('var request = URLRequest(url: url)');
  lines.push(`request.httpMethod = "${request.method.toUpperCase()}"`);
  headers.forEach((header) => {
    const [key, value] = header.split(':');
    lines.push(`request.addValue("${value.trim()}", forHTTPHeaderField: "${key.trim()}")`);
  });
  if (body) {
    lines.push(`request.httpBody = ${JSON.stringify(body)}.data(using: .utf8)`);
  }
  lines.push('');
  lines.push('let task = URLSession.shared.dataTask(with: request) { data, response, error in');
  lines.push('    if let error = error {');
  lines.push('        print("Error", error)');
  lines.push('        return');
  lines.push('    }');
  lines.push('    if let data = data, let body = String(data: data, encoding: .utf8) {');
  lines.push('        print(body)');
  lines.push('    }');
  lines.push('}');
  lines.push('task.resume()');
  return lines.join('\n');
}
