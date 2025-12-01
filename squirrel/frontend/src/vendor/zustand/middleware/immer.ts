import type { StateCreator } from '../index';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (Object.prototype.toString.call(value) !== '[object Object]') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function safeClone<T>(value: T): T {
  // Preserve primitives, functions, and non-plain objects by reference
  if (value === null || typeof value !== 'object') return value;
  if (typeof (value as unknown) === 'function') return value;
  if (Array.isArray(value)) return (value as unknown[]).map((v) => safeClone(v)) as unknown as T;
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    // Keep functions by reference
    out[k] = typeof v === 'function' ? v : safeClone(v as unknown);
  }
  return out as T;
}

export function immer<TState>(initializer: StateCreator<TState>): StateCreator<TState> {
  return (set, get, api) =>
    initializer(
      (partial, replace) => {
        if (typeof partial === 'function') {
          set((state: TState) => {
            const draft = safeClone(state);
            (partial as (draft: TState) => void)(draft);
            return draft;
          }, replace);
        } else {
          set(partial, replace);
        }
      },
      get,
      api
    );
}
