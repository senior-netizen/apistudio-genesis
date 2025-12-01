const raw = typeof import.meta !== 'undefined' ? (import.meta as Record<string, any>)?.env?.VITE_API_URL : undefined;

const normalized = typeof raw === 'string' ? raw.trim().replace(/\/$/, '') : '';

export const API_BASE_URL = normalized;

export function resolveApiUrl(path: string): string {
  if (!path) {
    return API_BASE_URL || '';
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = API_BASE_URL;
  if (!base) {
    return path;
  }
  const trimmedPath = path.replace(/^\/+/, '');
  return `${base}/${trimmedPath}`;
}

export function resolveHealthEndpoint(): string {
  const base = API_BASE_URL;
  const path = 'v1/health';
  if (!base) {
    return `/${path}`;
  }
  return `${base.replace(/\/$/, '')}/${path}`;
}
