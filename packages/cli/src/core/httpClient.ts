import { EnvConfig } from '../types/config.js';
import { loadConfig, updateConfig } from './config.js';
import { readSecret } from './vault.js';
import { applyVariables } from '../utils/parser.js';

export interface RequestOptions {
  method: string;
  path: string;
  body?: any;
  headers?: Record<string, string>;
  environmentName?: string;
  signal?: AbortSignal;
  authToken?: string;
}

export interface HttpResponseSnapshot {
  status: number;
  headers: Record<string, string>;
  bodyText: string;
  durationMs: number;
}

function buildUrl(env: EnvConfig, requestPath: string): string {
  const base = env.url.replace(/\/$/, '');
  const path = requestPath.startsWith('/') ? requestPath : `/${requestPath}`;
  return `${base}${path}`;
}

export async function sendRequest(options: RequestOptions): Promise<HttpResponseSnapshot> {
  const config = await loadConfig();
  const envName = options.environmentName ?? config.currentEnvironment;
  if (!envName) {
    throw new Error('No active environment. Run `squirrel env use <name>` first.');
  }
  const environment = config.environments[envName];
  if (!environment) {
    throw new Error(`Environment "${envName}" not found.`);
  }

  const url = buildUrl(environment, applyVariables(options.path, environment.variables));
  const controller = new AbortController();
  const signal = options.signal ?? controller.signal;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(environment.headers ?? {}),
    ...(options.headers ?? {}),
  };

  const token = options.authToken ?? (config.user?.tokenId ? await readSecret(config.user.tokenId) : undefined);
  if (token) {
    headers.Authorization = headers.Authorization ?? `Bearer ${token}`;
  }

  let body: string | undefined;
  if (options.body !== undefined) {
    if (typeof options.body === 'string') {
      body = options.body;
    } else {
      body = JSON.stringify(options.body);
      headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
    }
  }

  const started = Date.now();
  const response = await fetch(url, {
    method: options.method,
    headers,
    body,
    signal,
  });
  const durationMs = Date.now() - started;
  const bodyText = await response.text();
  const headersObj = Object.fromEntries(response.headers.entries());

  await updateConfig({
    recentRequests: [
      {
        method: options.method,
        url,
        status: response.status,
        durationMs,
        savedAt: new Date().toISOString(),
      },
      ...config.recentRequests.slice(0, 49),
    ],
  });

  return {
    status: response.status,
    headers: headersObj,
    bodyText,
    durationMs,
  };
}
