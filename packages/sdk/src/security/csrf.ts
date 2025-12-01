export type CsrfFetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

const DEFAULT_ENDPOINT = '/auth/csrf';
const FALLBACK_ENDPOINT = '/v1/auth/csrf';

export class CsrfManager {
  private static token: string | null = null;
  private static loading: Promise<string | null> | null = null;

  static getToken(): string | null {
    return this.token;
  }

  static setToken(token: string | null): void {
    this.token = token;
  }

  static header(): Record<string, string> {
    return this.token ? { 'X-CSRF-Token': this.token } : {};
  }

  static async load(endpoint = DEFAULT_ENDPOINT, fetchImpl?: CsrfFetcher): Promise<string | null> {
    if (this.loading) {
      return this.loading;
    }

    const fetcher = fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetcher) {
      throw new Error('No fetch implementation available for CsrfManager.load');
    }

    const endpoints: string[] = [endpoint];
    if (endpoint === DEFAULT_ENDPOINT) {
      endpoints.push(FALLBACK_ENDPOINT);
    }

    this.loading = (async () => {
      try {
        for (const candidate of endpoints) {
          const response = await fetcher(candidate, { method: 'GET', credentials: 'include' });
          if (!response.ok) {
            if (response.status === 404) {
              continue;
            }
            this.token = null;
            return null;
          }
          const data = (await response.json().catch(() => undefined)) as { csrfToken?: string } | undefined;
          this.token = data?.csrfToken ?? null;
          if (this.token) {
            return this.token;
          }
        }
        this.token = null;
        return null;
      } finally {
        this.loading = null;
      }
    })();

    return this.loading;
  }
}
