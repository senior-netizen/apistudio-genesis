import { resolveApiUrl } from '../config/api';
import { useAuthStore } from '../../modules/auth/authStore';
import { CsrfManager } from '@sdl/sdk';
import { getStoredCsrfToken, loadCsrfToken, setCsrfToken } from '../security/csrf';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function ensureCsrfToken(force = false) {
  if (force) {
    setCsrfToken(null);
  }
  return loadCsrfToken(resolveApiUrl('/auth/csrf'), force);
}

type ApiFetchOptions = RequestInit & {
  skipAuth?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

async function requestRefreshToken() {
  if (!refreshPromise) {
    const refresh = useAuthStore.getState().refreshAccessToken;
    refreshPromise = refresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function shouldAttemptRefresh(status: number): boolean {
  return status === 401;
}

export async function apiFetch(input: string | URL, init?: ApiFetchOptions): Promise<Response> {
  const { skipAuth, headers, credentials, ...rest } = init ?? {};
  const url = typeof input === 'string' ? resolveApiUrl(input) : input instanceof URL ? input.toString() : input;
  const mergedHeaders = new Headers(headers ?? {});
  const authState = useAuthStore.getState();
  const includeCredentials = credentials ?? 'include';
  const method = (rest.method ?? 'GET').toUpperCase();
  const requiresCsrf = UNSAFE_METHODS.has(method);

  if (!skipAuth && authState.accessToken) {
    mergedHeaders.set('Authorization', `Bearer ${authState.accessToken}`);
  }

  if (!CsrfManager.getToken()) {
    await ensureCsrfToken(requiresCsrf);
  }
  const csrfHeader = CsrfManager.getToken() ?? getStoredCsrfToken();
  if (requiresCsrf || csrfHeader) {
    await ensureCsrfToken(requiresCsrf && !csrfHeader);
    for (const [key, value] of Object.entries(CsrfManager.header())) {
      mergedHeaders.set(key, value);
    }
  }

  const execute = async () =>
    fetch(url.toString(), {
      ...rest,
      headers: mergedHeaders,
      credentials: includeCredentials,
    });

  let response = await execute();

  if (requiresCsrf && response.status === 403) {
    await ensureCsrfToken(true);
    for (const [key, value] of Object.entries(CsrfManager.header())) {
      mergedHeaders.set(key, value);
    }
    response = await execute();
  }

  if (
    !skipAuth &&
    shouldAttemptRefresh(response.status) &&
    (authState.accessToken || authState.refreshToken)
  ) {
    const newAccessToken = await requestRefreshToken();
    if (newAccessToken) {
      mergedHeaders.set('Authorization', `Bearer ${newAccessToken}`);
      response = await execute();
      if (!shouldAttemptRefresh(response.status)) {
        return response;
      }
    }
    await useAuthStore.getState().logout('Your session has expired. Please log in again.');
  }

  return response;
}
