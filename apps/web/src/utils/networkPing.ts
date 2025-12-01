import { sanitizeHeaders } from './healthAnalyzer';

export type ProbeErrorType = 'timeout' | 'offline' | 'ssl' | 'cors' | 'unauthorized' | 'rate_limited' | 'unknown';

export interface RateLimitInfo {
  limit?: number;
  remaining?: number;
  reset?: number;
  window?: string;
}

export interface NetworkProbeResult {
  baseUrl: string;
  latencyMs: number | null;
  status?: number;
  ok: boolean;
  reachable: boolean;
  dnsResolved: boolean;
  sslValid: boolean;
  cors: { allowedOrigin?: string; allowedMethods?: string };
  rateLimit?: RateLimitInfo;
  headers: Record<string, string>;
  errorType?: ProbeErrorType;
  errorMessage?: string;
}

export interface NetworkPingOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  preferMethod?: 'HEAD' | 'OPTIONS';
  attempt?: number;
}

const SENSITIVE_HEADER_KEYS = ['authorization', 'proxy-authorization', 'cookie', 'x-api-key', 'x-auth-token'];

function createTimeoutSignal(timeoutMs: number, upstream?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
  const abortUpstream = () => controller.abort('aborted');
  upstream?.addEventListener('abort', abortUpstream, { once: true });
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timer);
    upstream?.removeEventListener('abort', abortUpstream);
  });
  return controller.signal;
}

function detectRateLimit(headers: Record<string, string>): RateLimitInfo | undefined {
  const limit = headers['x-ratelimit-limit'];
  const remaining = headers['x-ratelimit-remaining'];
  const reset = headers['x-ratelimit-reset'];
  const window = headers['x-ratelimit-window'];
  if (limit || remaining || reset || window) {
    return {
      limit: limit ? Number(limit) : undefined,
      remaining: remaining ? Number(remaining) : undefined,
      reset: reset ? Number(reset) : undefined,
      window,
    };
  }
  return undefined;
}

function normalizeHeaders(input: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  input.forEach((value, key) => {
    if (SENSITIVE_HEADER_KEYS.includes(key.toLowerCase())) {
      return;
    }
    out[key.toLowerCase()] = value;
  });
  return sanitizeHeaders(out);
}

export async function networkPing(baseUrl: string, options: NetworkPingOptions = {}): Promise<NetworkProbeResult> {
  const { preferMethod = 'HEAD', timeoutMs = 4500, signal, attempt = 1 } = options;

  const timeoutSignal = createTimeoutSignal(timeoutMs, signal);
  const combinedSignal = new AbortController();
  const forwardAbort = () => combinedSignal.abort('aborted');
  timeoutSignal.addEventListener('abort', forwardAbort, { once: true });
  signal?.addEventListener('abort', forwardAbort, { once: true });

  const methodOrder: Array<'HEAD' | 'OPTIONS'> = preferMethod === 'OPTIONS' ? ['OPTIONS', 'HEAD'] : ['HEAD', 'OPTIONS'];
  const startedAt = performance.now();

  for (const method of methodOrder) {
    try {
      const response = await fetch(baseUrl, {
        method,
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        signal: combinedSignal.signal,
      });
      const latencyMs = Math.round(performance.now() - startedAt);
      const headers = normalizeHeaders(response.headers);
      const rateLimit = detectRateLimit(headers);
      const cors = {
        allowedOrigin: headers['access-control-allow-origin'],
        allowedMethods: headers['access-control-allow-methods'],
      };

      return {
        baseUrl,
        latencyMs,
        status: response.status,
        ok: response.ok,
        reachable: true,
        dnsResolved: true,
        sslValid: baseUrl.startsWith('https'),
        cors,
        rateLimit,
        headers,
        errorType: response.status === 429 ? 'rate_limited' : response.status === 401 || response.status === 403 ? 'unauthorized' : undefined,
      };
    } catch (error) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        const latencyMs = Math.round(performance.now() - startedAt);
        return {
          baseUrl,
          latencyMs,
          status: undefined,
          ok: false,
          reachable: false,
          dnsResolved: true,
          sslValid: baseUrl.startsWith('https'),
          cors: {},
          headers: {},
          errorType: timeoutSignal.aborted ? 'timeout' : 'unknown',
          errorMessage: typeof err.message === 'string' ? err.message : 'Request aborted',
        };
      }
      const lower = (err.message || '').toLowerCase();
      const dnsResolved = !lower.includes('dns') && !lower.includes('enotfound');
      const sslValid = !lower.includes('ssl') && baseUrl.startsWith('https');
      const corsFailure = lower.includes('cors') || lower.includes('allow origin');

      if (method === methodOrder[methodOrder.length - 1]) {
        return {
          baseUrl,
          latencyMs: Math.round(performance.now() - startedAt),
          status: undefined,
          ok: false,
          reachable: false,
          dnsResolved,
          sslValid,
          cors: {},
          headers: {},
          errorType: corsFailure ? 'cors' : lower.includes('timeout') ? 'timeout' : lower.includes('offline') ? 'offline' : undefined,
          errorMessage: typeof err.message === 'string' ? err.message : 'Unknown network error',
        };
      }
    }
  }

  return {
    baseUrl,
    latencyMs: Math.round(performance.now() - startedAt),
    status: undefined,
    ok: false,
    reachable: false,
    dnsResolved: false,
    sslValid: baseUrl.startsWith('https'),
    cors: {},
    headers: {},
    errorType: 'unknown',
  };
}
