export function ensureUrl(url: string): string {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return url;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
}

export function ensureNonEmpty(value: string, label: string): string {
  if (!value || !value.trim()) {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}
