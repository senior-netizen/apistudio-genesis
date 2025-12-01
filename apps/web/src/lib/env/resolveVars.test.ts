import { describe, expect, it } from 'vitest';
import { inspectVariables, resolveValue } from './resolveVars';

const globals = [{ id: '1', key: 'token', value: 'abc', enabled: true, scope: 'global' as const }];
const environment = {
  id: 'env',
  name: 'dev',
  variables: [
    { id: '2', key: 'baseUrl', value: 'https://example.com', enabled: true, scope: 'environment' as const },
    { id: '3', key: 'secret', value: 'hidden', enabled: true, scope: 'environment' as const, secret: true }
  ]
};

describe('resolveValue', () => {
  it('replaces variables with priority', () => {
    const result = resolveValue('{{baseUrl}}/users/{{token}}', { globals, environment, locals: [] });
    expect(result.value).toBe('https://example.com/users/abc');
    expect(result.unresolved).toHaveLength(0);
  });

  it('reports unresolved variables', () => {
    const result = resolveValue('{{missing}}', { globals, environment, locals: [] });
    expect(result.unresolved).toContain('missing');
  });
});

describe('inspectVariables', () => {
  it('masks secret values', () => {
    const vars = inspectVariables({ globals, environment, locals: [] });
    const secret = vars.find((variable) => variable.key === 'secret');
    expect(secret?.value).toBe('••••••••');
  });
});
