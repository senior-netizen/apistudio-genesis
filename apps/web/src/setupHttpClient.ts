import axios, { AxiosHeaders } from 'axios';
import { CsrfManager } from '@sdl/sdk';
import { fetchAndPersistCsrfToken, getStoredCsrfToken, primeCsrfFromStorage, setCsrfToken } from './lib/security/csrf';

primeCsrfFromStorage();
axios.defaults.withCredentials = true;

axios.interceptors.request.use((config) => {
  const token = CsrfManager.getToken() ?? getStoredCsrfToken();
  if (token) {
    const headers = config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers ?? {});
    headers.set('X-CSRF-Token', token);
    config.headers = headers;
  }
  return config;
});

if (typeof window !== 'undefined') {
  void fetchAndPersistCsrfToken().catch((error) => {
    console.warn('[csrf] unable to prefetch token', error);
    setCsrfToken(null);
  });
}
