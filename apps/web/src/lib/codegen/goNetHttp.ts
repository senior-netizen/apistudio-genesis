import type { ApiRequest } from '../../types/api';
import { resolveBodyForCodegen, serializeHeaders } from './shared';

export function generateGoNetHttp(request: ApiRequest, resolvedUrl: string): string {
  const headers = serializeHeaders(request.headers);
  const body = resolveBodyForCodegen(request.body);
  const lines: string[] = [];
  lines.push('package main');
  lines.push('');
  lines.push('import (');
  lines.push('  "bytes"');
  lines.push('  "fmt"');
  lines.push('  "io"');
  lines.push('  "net/http"');
  lines.push(')');
  lines.push('');
  lines.push('func main() {');
  if (body) {
    lines.push(`  payload := bytes.NewBufferString(${JSON.stringify(body)})`);
  } else {
    lines.push('  payload := bytes.NewBuffer(nil)');
  }
  lines.push(`  req, err := http.NewRequest("${request.method.toUpperCase()}", "${resolvedUrl}", payload)`);
  lines.push('  if err != nil {');
  lines.push('    panic(err)');
  lines.push('  }');
  headers.forEach((header) => {
    const [key, value] = header.split(':');
    lines.push(`  req.Header.Set("${key.trim()}", "${value.trim()}")`);
  });
  lines.push('  res, err := http.DefaultClient.Do(req)');
  lines.push('  if err != nil {');
  lines.push('    panic(err)');
  lines.push('  }');
  lines.push('  defer res.Body.Close()');
  lines.push('  bodyBytes, _ := io.ReadAll(res.Body)');
  lines.push('  fmt.Println(string(bodyBytes))');
  lines.push('}');
  return lines.join('\n');
}
