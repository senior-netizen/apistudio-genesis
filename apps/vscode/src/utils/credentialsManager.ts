import * as vscode from 'vscode';
import { TokenManager, type TokenUpdate } from '@sdl/sdk/auth';
import { CsrfManager } from '@sdl/sdk';
import { brand } from '@sdl/language';

const REFRESH_TOKEN_KEY = 'apistudio.refreshToken';
const CSRF_TOKEN_KEY = 'apistudio.csrfToken';

export class CredentialsManager {
  private readonly tokenManager: TokenManager;
  private refreshBaseUrl: string | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.tokenManager = new TokenManager({
      storage: {
        read: async () => {
          const value = await this.context.secrets.get(REFRESH_TOKEN_KEY);
          return value ?? null;
        },
        write: async (value: string | null) => {
          if (!value) {
            await this.context.secrets.delete(REFRESH_TOKEN_KEY);
            return;
          }
          await this.context.secrets.store(REFRESH_TOKEN_KEY, value);
        },
      },
      leewayMs: 5_000,
    });
    this.tokenManager.onSessionExpired(() => {
      void vscode.window.showWarningMessage('Session expired — click to log back in');
    });
    const storedCsrf = this.context.globalState.get<string | null>(CSRF_TOKEN_KEY);
    if (storedCsrf) {
      CsrfManager.setToken(storedCsrf);
    }
  }

  private async persistCsrfToken(token: string | null) {
    CsrfManager.setToken(token);
    await this.context.globalState.update(CSRF_TOKEN_KEY, token ?? undefined);
  }

  private normaliseBaseUrl(raw: string): string {
    return raw.replace(/\/$/, '');
  }

  private configureRefreshHandler(apiBase: string) {
    const normalized = this.normaliseBaseUrl(apiBase);
    if (this.refreshBaseUrl === normalized) {
      return;
    }
    this.refreshBaseUrl = normalized;
    this.tokenManager.setRefreshHandler(async (refreshToken: string) => {
      try {
        await this.ensureCsrf(normalized);
        const response = await fetch(`${normalized}/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...CsrfManager.header() },
          credentials: 'include',
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) {
          return null;
        }
        const data = (await response
          .json()
          .catch(() => undefined)) as { accessToken?: string; refreshToken?: string; csrfToken?: string } | undefined;
        if (!data?.accessToken) {
          return null;
        }
        const update: TokenUpdate = { accessToken: String(data.accessToken) };
        if (typeof data.refreshToken === 'string' && data.refreshToken) {
          update.refreshToken = data.refreshToken;
        }
        if (typeof data.csrfToken === 'string') {
          await this.persistCsrfToken(data.csrfToken);
        }
        return update;
      } catch (error) {
        console.warn('[apistudio] Refresh request failed', error);
        return null;
      }
    });
  }

  public onSessionExpired(listener: () => void): () => void {
    return this.tokenManager.onSessionExpired(listener);
  }

  public async hasSession(): Promise<boolean> {
    return Boolean(await this.tokenManager.getRefreshToken());
  }

  public async ensureAccessToken(apiBase: string): Promise<string | null> {
    this.configureRefreshHandler(apiBase);
    return this.tokenManager.ensureAccessToken();
  }

  public async login(
    apiBase: string,
    email: string,
    password: string,
    totpCode?: string,
  ): Promise<void> {
    const normalized = this.normaliseBaseUrl(apiBase);
    this.configureRefreshHandler(normalized);
    try {
      await this.ensureCsrf(normalized, true);
      const response = await fetch(`${normalized}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...CsrfManager.header() },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          totpCode: totpCode?.trim() ? totpCode.trim() : undefined,
        }),
      });
      const payload = await response
        .json()
        .catch(() => undefined) as { accessToken?: string; refreshToken?: string; message?: string; csrfToken?: string } | undefined;
      if (!response.ok || !payload?.accessToken || !payload?.refreshToken) {
        const message = payload?.message ?? `Login failed (${response.status})`;
        throw new Error(typeof message === 'string' ? message : 'Login failed');
      }
      await this.tokenManager.applyTokens({
        accessToken: String(payload.accessToken),
        refreshToken: String(payload.refreshToken),
      });
      if (typeof payload.csrfToken === 'string') {
        await this.persistCsrfToken(payload.csrfToken);
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error(`Unable to authenticate with ${brand.productName}.`);
    }
  }

  public async logout(apiBase: string): Promise<void> {
    const normalized = this.normaliseBaseUrl(apiBase);
    const refreshToken = await this.tokenManager.getRefreshToken();
    if (refreshToken) {
      try {
        await this.ensureCsrf(normalized);
        await fetch(`${normalized}/v1/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...CsrfManager.header() },
          credentials: 'include',
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.warn('[apistudio] Logout request failed', error);
      }
    }
    await this.tokenManager.clear({ silent: true });
    await this.persistCsrfToken(null);
  }

  private async ensureCsrf(baseUrl: string, force = false) {
    if (force) {
      await this.persistCsrfToken(null);
    }
    if (CsrfManager.getToken()) {
      return;
    }
    const token = await CsrfManager.load(`${this.normaliseBaseUrl(baseUrl)}/auth/csrf`);
    if (token) {
      await this.persistCsrfToken(token);
    }
  }
}
