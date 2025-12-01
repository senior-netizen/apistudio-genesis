import fs from 'node:fs';
import path from 'node:path';

export function applyVariables(template: string, variables: Record<string, string> = {}): string {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key: string) => {
    const trimmed = key.trim();
    return variables[trimmed] ?? process.env[trimmed] ?? `{{${trimmed}}}`;
  });
}

export function parseKeyValuePairs(values: string[] = []): Record<string, string> {
  return values.reduce<Record<string, string>>((acc, pair) => {
    const [key, ...rest] = pair.split('=');
    if (!key || rest.length === 0) return acc;
    acc[key] = rest.join('=');
    return acc;
  }, {});
}

export function parseJsonInput(input?: string, fromFile?: string): any {
  if (fromFile) {
    const resolved = path.resolve(fromFile);
    const data = fs.readFileSync(resolved, 'utf8');
    return JSON.parse(data);
  }
  if (!input) return undefined;
  return JSON.parse(input);
}
