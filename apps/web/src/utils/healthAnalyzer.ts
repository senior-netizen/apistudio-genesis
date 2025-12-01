import type { NetworkProbeResult, RateLimitInfo } from './networkPing';

export type HealthStatus = 'live' | 'lagging' | 'down' | 'rate_limited' | 'unauthorized' | 'checking';

export interface HealthDiagnostics {
  status: HealthStatus;
  latencyMs: number | null;
  statusCode?: number;
  dnsResolved: boolean;
  sslValid: boolean;
  cors: { allowedOrigin?: string; allowedMethods?: string };
  rateLimit?: RateLimitInfo;
  headers?: Record<string, string>;
  errorType?: string;
  errorMessage?: string;
  recommendations: string[];
  summary: string;
}

const SENSITIVE_PATTERNS = ['authorization', 'cookie', 'token', 'secret', 'session'];

export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => !SENSITIVE_PATTERNS.some((pattern) => key.toLowerCase().includes(pattern)))
  );
}

export function buildCorsRecommendation(cors: { allowedOrigin?: string; allowedMethods?: string }, baseUrl: string): string {
  if (cors.allowedOrigin) return '';
  return [
    'Enable CORS for this origin to allow preflights to succeed.',
    'Example (Node/Express):',
    `app.use((req, res, next) => {`,
    `  res.setHeader('Access-Control-Allow-Origin', '*');`,
    `  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD');`,
    `  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');`,
    `  next();`,
    `});`,
    `// Target: ${baseUrl}`,
  ].join('\n');
}

export function analyzeProbe(result: NetworkProbeResult): HealthDiagnostics {
  const recommendations: string[] = [];
  const latencyMs = result.latencyMs;
  const statusCode = result.status;
  const sslValid = result.sslValid && result.baseUrl.startsWith('https');
  const hasHttps = result.baseUrl.startsWith('https');
  const rateLimit = result.rateLimit;
  const headers = sanitizeHeaders(result.headers ?? {});

  if (!hasHttps) {
    recommendations.push('Endpoint is served over HTTP. Upgrade to HTTPS to enable certificate validation.');
  }
  if (!sslValid) {
    recommendations.push('TLS handshake failed or certificate invalid. Rotate certificates or verify trust chain.');
  }
  if (statusCode === 429 || result.errorType === 'rate_limited') {
    recommendations.push(
      rateLimit?.reset
        ? `Rate limit reached. Retry after ${new Date(rateLimit.reset * 1000).toLocaleTimeString()}.`
        : 'Rate limit reached. Throttle requests or request higher quotas.'
    );
  }
  if (statusCode === 401 || statusCode === 403 || result.errorType === 'unauthorized') {
    recommendations.push('Authentication expired. Refresh the token to continue.');
  }
  if (!result.cors.allowedOrigin || result.errorType === 'cors') {
    recommendations.push(buildCorsRecommendation(result.cors, result.baseUrl));
  }

  const deprecation = headers['deprecation'] || headers['sunset'];
  const docsLink = headers['link'];
  if (deprecation) {
    recommendations.push(
      docsLink && docsLink.includes('rel="deprecation"')
        ? `Endpoint is deprecated. Migrate to the linked replacement: ${docsLink}`
        : 'Endpoint is deprecated. Consult the latest API documentation for a supported path.'
    );
  }

  let status: HealthStatus = 'live';
  if (!result.reachable || result.errorType === 'timeout' || result.errorType === 'offline') {
    status = 'down';
  } else if (statusCode === 429 || result.errorType === 'rate_limited') {
    status = 'rate_limited';
  } else if (statusCode === 401 || statusCode === 403 || result.errorType === 'unauthorized') {
    status = 'unauthorized';
  } else if (latencyMs !== null && latencyMs > 900) {
    status = 'lagging';
  }

  if (!result.dnsResolved) {
    recommendations.push('DNS could not be resolved. Verify the hostname and DNS propagation.');
  }

  const summaryParts = [
    status === 'live' ? 'Endpoint responsive' : status === 'lagging' ? 'Endpoint slow' : 'Endpoint unhealthy',
  ];
  if (latencyMs !== null) summaryParts.push(`${latencyMs}ms`);
  if (statusCode) summaryParts.push(`HTTP ${statusCode}`);
  if (rateLimit?.remaining !== undefined) summaryParts.push(`${rateLimit.remaining}/${rateLimit.limit ?? '?'} remaining`);

  return {
    status,
    latencyMs,
    statusCode,
    dnsResolved: result.dnsResolved,
    sslValid,
    cors: result.cors,
    rateLimit,
    headers,
    errorType: result.errorType,
    errorMessage: result.errorMessage,
    recommendations: recommendations.filter(Boolean),
    summary: summaryParts.join(' · '),
  };
}
