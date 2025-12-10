import axios, { AxiosError, AxiosHeaders, AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders } from 'axios';
import { loadConfig, getActiveProfile } from '../config/config';
import { ensureCsrfToken, getCsrfHeader, persistCsrfToken } from '../utils/csrf';
import { logger } from '../utils/logger';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let client: AxiosInstance | null = null;

const createClient = async (): Promise<AxiosInstance> => {
  const config = await loadConfig();
  const profile = getActiveProfile(config);
  const instance = axios.create({
    baseURL: profile.baseUrl,
    timeout: 30000
  });

  instance.interceptors.request.use(async (request) => {
    const headers = new AxiosHeaders(request.headers ?? {});
    headers.set('x-squirrel-cli-version', '0.1.0');

    if (profile.accessToken) {
      headers.set('Authorization', `Bearer ${profile.accessToken}`);
    }

    const method = (request.method ?? 'GET').toUpperCase();
    const requiresCsrf = UNSAFE_METHODS.has(method);
    const hasAuthPath = typeof request.url === 'string' && request.url.includes('/auth/');
    const existingToken = getCsrfHeader()['X-CSRF-Token'];
    const shouldAttachCsrf = requiresCsrf || hasAuthPath || Boolean(existingToken);

    if (shouldAttachCsrf) {
      const token = await ensureCsrfToken(false, profile.baseUrl);
      if (token) {
        headers.set('X-CSRF-Token', token);
      } else if (existingToken) {
        headers.set('X-CSRF-Token', existingToken);
      }
    }

    request.headers = headers;
    return request;
  });

  instance.interceptors.response.use(
    async (response) => {
      const bodyToken = (response.data as { csrfToken?: string })?.csrfToken;
      const headerRaw =
        (response.headers as Record<string, string | string[] | undefined>)?.['x-csrf-token'] ??
        (response.headers as { get?: (name: string) => string | undefined }).get?.('x-csrf-token');
      const headerToken = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
      const token = typeof bodyToken === 'string' && bodyToken ? bodyToken : headerToken;
      if (typeof token === 'string' && token) {
        await persistCsrfToken(token);
      }
      return response;
    },
    async (error: AxiosError) => {
      const status = error.response?.status;
      const configWithRetry = error.config as (AxiosRequestConfig & { _csrfRetried?: boolean }) | undefined;
      if (status === 403 && configWithRetry && !configWithRetry._csrfRetried) {
        const refreshed = await ensureCsrfToken(true, profile.baseUrl);
        if (refreshed) {
          const headers = new AxiosHeaders(configWithRetry.headers as AxiosRequestHeaders | undefined);
          headers.set('X-CSRF-Token', refreshed);
          configWithRetry.headers = headers;
          configWithRetry._csrfRetried = true;
          return instance.request(configWithRetry);
        }
      }
      logger.handleAxiosError(error);
      throw error;
    }
  );

  return instance;
};

export const getClient = async (): Promise<AxiosInstance> => {
  if (!client) {
    client = await createClient();
  }
  return client;
};

export const request = async <T = unknown>(config: AxiosRequestConfig): Promise<T> => {
  const axiosClient = await getClient();
  const response = await axiosClient.request<T>(config);
  return response.data;
};

export const resetClient = (): void => {
  client = null;
};
