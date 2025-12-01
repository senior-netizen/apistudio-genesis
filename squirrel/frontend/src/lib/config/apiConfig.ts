const DEFAULT_API_BASE_URL = 'http://localhost:8081';

let cachedBaseUrl: string | null = null;

function normalizeBaseUrl(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') {
    return DEFAULT_API_BASE_URL;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_API_BASE_URL;
  }
  return trimmed.replace(/\/$/, '');
}

export function getApiBaseUrl(): string {
  if (cachedBaseUrl) {
    return cachedBaseUrl;
  }
  const raw = (import.meta as Record<string, any>)?.env?.VITE_API_BASE_URL ?? (import.meta as Record<string, any>)?.env?.VITE_API_URL;
  cachedBaseUrl = normalizeBaseUrl(raw);
  return cachedBaseUrl;
}

export function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!path) {
    return base;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function getWebSocketBaseUrl(): string {
  const raw = (import.meta as Record<string, any>)?.env?.VITE_WS_URL;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim().replace(/\/$/, '');
  }
  const base = getApiBaseUrl();
  if (base.startsWith('https://')) {
    return base.replace('https://', 'wss://');
  }
  if (base.startsWith('http://')) {
    return base.replace('http://', 'ws://');
  }
  return base;
}
