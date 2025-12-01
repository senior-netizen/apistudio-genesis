export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output: any = Array.isArray(target) ? [...target] : { ...target };

  Object.entries(source ?? {}).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      output[key] = Array.isArray(output[key]) ? [...output[key], ...value] : [...value];
    } else if (value && typeof value === 'object') {
      output[key] = deepMerge(output[key] ?? {}, value);
    } else {
      output[key] = value;
    }
  });

  return output;
}
