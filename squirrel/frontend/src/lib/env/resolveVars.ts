import type { ApiEnvironment, Variable } from '../../types/api';

export interface VariableContext {
  globals: Variable[];
  environment?: ApiEnvironment;
  locals?: Variable[];
}

function variableList(context: VariableContext): Variable[] {
  const fromGlobals = context.globals ?? [];
  const fromEnv = context.environment?.variables ?? [];
  const fromLocals = context.locals ?? [];
  return [...fromGlobals, ...fromEnv, ...fromLocals];
}

export function resolveValue(template: string, context: VariableContext): { value: string; unresolved: string[] } {
  const pattern = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;
  const unresolved = new Set<string>();
  const merged = variableList(context).filter((variable) => variable.enabled);

  const value = template.replace(pattern, (match, key) => {
    const variable = merged.find((entry) => entry.key === key);
    if (!variable) {
      unresolved.add(key);
      return match;
    }
    return variable.value;
  });

  return { value, unresolved: Array.from(unresolved) };
}

export interface ResolvedVariables {
  key: string;
  value: string;
  scope: Variable['scope'];
  secret?: boolean;
}

export function inspectVariables(context: VariableContext): ResolvedVariables[] {
  const seen = new Map<string, ResolvedVariables>();
  const append = (variable: Variable) => {
    if (!variable.enabled) return;
    seen.set(variable.key, {
      key: variable.key,
      value: variable.secret ? '••••••••' : variable.value,
      scope: variable.scope,
      secret: variable.secret
    });
  };

  context.globals?.forEach(append);
  context.environment?.variables?.forEach(append);
  context.locals?.forEach(append);

  return Array.from(seen.values());
}
