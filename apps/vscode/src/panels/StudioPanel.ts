import * as vscode from 'vscode';
import { brand } from '@sdl/language';
import { getNonce } from '../utils/getNonce';
import { ApiClient, ApiError } from '../utils/apiClient';
import { ApiRequest, WorkspaceSnapshot, CurrentUser } from '../types';

type ThemeVariant = 'light' | 'dark' | 'high-contrast';

export class StudioPanel {
  public static currentPanel: StudioPanel | undefined;
  private static readonly viewType = 'apistudio.studioPanel';

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private api: ApiClient;
  private disposables: vscode.Disposable[] = [];
  private healthUrl: string;

  private ready = false;
  private currentWorkspaceId: string | undefined;
  private currentWorkspaceLabel = 'Workspace';
  private currentTheme: ThemeVariant = 'dark';
  private currentSnapshot: WorkspaceSnapshot | null = null;
  private currentUser: CurrentUser | null = null;
  private loading = false;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, api: ApiClient, workspaceId?: string) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.api = api;
    this.healthUrl = this.resolveHealthUrl();
    this.currentWorkspaceId = workspaceId;

    this.panel.webview.html = this.renderHtml(this.currentWorkspaceLabel, this.healthUrl);
    this.panel.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'squirrel.svg');

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        if (!message) {
          return;
        }

        switch (message.type) {
          case 'webview-ready': {
            this.ready = true;
            this.postConnectionConfig();
            this.syncState();
            void this.ensureSnapshot();
            break;
          }
          case 'open-web': {
            const workspace = this.currentSnapshot?.workspace;
            const targetSlug = workspace?.slug ?? workspace?.id ?? undefined;
            const configuredBase = vscode.workspace
              .getConfiguration('apistudio')
              .get<string>('studioBaseUrl');
            const normalizedBase = (configuredBase?.trim()?.length
              ? configuredBase.trim()
              : 'https://studio.squirrel.dev'
            ).replace(/\/$/, '');
            const targetUrl = targetSlug ? `${normalizedBase}/workspaces/${targetSlug}` : normalizedBase;
            await vscode.env.openExternal(vscode.Uri.parse(targetUrl));
            break;
          }
          case 'run-latest-flow': {
            await this.runPrimaryRequest();
            break;
          }
          case 'replay-request': {
            const requestId =
              typeof message.requestId === 'string' && message.requestId.trim().length
                ? message.requestId.trim()
                : undefined;
            if (requestId) {
              await this.runRequest(requestId);
            }
            break;
          }
          case 'request-selected': {
            const requestId =
              typeof message.requestId === 'string' && message.requestId.trim().length
                ? message.requestId.trim()
                : undefined;
            if (requestId) {
              void this.postActiveRequest(requestId);
            }
            break;
          }
          default:
            break;
        }
      },
      undefined,
      this.disposables,
    );
  }

  public static createOrShow(extensionUri: vscode.Uri, api: ApiClient, workspaceId?: string) {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.Two;

    if (StudioPanel.currentPanel) {
      StudioPanel.currentPanel.panel.reveal(column);
      StudioPanel.currentPanel.setApiClient(api);
      StudioPanel.currentPanel.setWorkspace(workspaceId);
      const themeKind = vscode.window.activeColorTheme?.kind;
      if (themeKind !== undefined) {
        StudioPanel.currentPanel.setTheme(themeKind);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      StudioPanel.viewType,
      brand.productName,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    StudioPanel.currentPanel = new StudioPanel(panel, extensionUri, api, workspaceId);

    const themeKind = vscode.window.activeColorTheme?.kind;
    if (themeKind !== undefined) {
      StudioPanel.currentPanel.setTheme(themeKind);
    }
  }

  public static updateTheme(kind: vscode.ColorThemeKind) {
    StudioPanel.currentPanel?.setTheme(kind);
  }

  public static async reloadActive(api: ApiClient) {
    if (!StudioPanel.currentPanel) {
      return;
    }
    StudioPanel.currentPanel.setApiClient(api);
    await StudioPanel.currentPanel.reload();
  }

  public dispose() {
    StudioPanel.currentPanel = undefined;

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      disposable?.dispose();
    }
  }

  public setWorkspace(workspaceId?: string) {
    this.currentWorkspaceId = workspaceId;
    this.currentWorkspaceLabel = this.fallbackWorkspaceLabel(workspaceId);
    if (this.ready) {
      this.loading = true;
      this.syncState();
    }
    void this.ensureSnapshot();
  }

  public setTheme(kind: vscode.ColorThemeKind) {
    this.currentTheme = this.resolveTheme(kind);
    this.syncState();
  }

  public setApiClient(api: ApiClient) {
    this.api = api;
    this.healthUrl = this.resolveHealthUrl();
    this.postConnectionConfig();
  }

  public async reload() {
    await this.ensureSnapshot();
  }

  private resolveHealthUrl(): string {
    const base = this.api.getResolvedBaseUrl();
    try {
      return new URL('/health', base).toString();
    } catch (error) {
      const normalized = typeof base === 'string' ? base.trim().replace(/\/$/, '') : '';
      return normalized ? `${normalized}/health` : '/health';
    }
  }

  private postConnectionConfig() {
    if (!this.ready) {
      return;
    }
    this.panel.webview.postMessage({
      type: 'connection:config',
      payload: { healthUrl: this.healthUrl },
    });
  }

  private syncState() {
    if (!this.ready) {
      return;
    }

    this.panel.webview.postMessage({
      type: 'workspace:selected',
      payload: {
        id: this.currentWorkspaceId ?? null,
        label: this.currentWorkspaceLabel,
        loading: this.loading,
      },
    });

    this.panel.webview.postMessage({
      type: 'theme:update',
      payload: this.currentTheme,
    });

    this.panel.webview.postMessage({
      type: 'account:update',
      payload: this.currentUser,
    });

    if (this.currentSnapshot) {
      this.panel.webview.postMessage({
        type: 'workspace:data',
        payload: this.currentSnapshot,
      });
    }
  }

  private async ensureSnapshot() {
    if (!this.ready) {
      return;
    }

    this.loading = true;
    this.syncState();

    try {
      const [snapshot, account] = await Promise.all([
        this.api.getWorkspaceSnapshot(this.currentWorkspaceId),
        this.api.getCurrentUser().catch(() => null),
      ]);
      this.currentSnapshot = snapshot;
      this.currentWorkspaceId = snapshot.workspace.id;
      this.currentWorkspaceLabel = snapshot.workspace.name;
      this.currentUser = account;
      this.loading = false;
      this.panel.webview.postMessage({ type: 'workspace:data', payload: snapshot });
      this.panel.webview.postMessage({
        type: 'workspace:selected',
        payload: {
          id: snapshot.workspace.id,
          label: snapshot.workspace.name,
          loading: false,
        },
      });
      this.panel.webview.postMessage({ type: 'account:update', payload: account });
      void this.postActiveRequest(snapshot.requests[0]?.id);
    } catch (error) {
      this.loading = false;
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
          ? error.message
          : 'Unable to load workspace data.';
      this.panel.webview.postMessage({
        type: 'workspace:error',
        payload: { message },
      });
      vscode.window.showErrorMessage(`${brand.productName}: ${message}`);
    }
  }

  private fallbackWorkspaceLabel(workspaceId?: string): string {
    if (!workspaceId) {
      return 'Workspace';
    }
    const trimmed = workspaceId.trim();
    if (!trimmed) {
      return 'Workspace';
    }
    if (/^[a-z0-9-_]+$/.test(trimmed.toLowerCase()) && trimmed === trimmed.toLowerCase()) {
      return trimmed
        .replace(/[-_]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
    }
    return trimmed;
  }

  private async postActiveRequest(requestId?: string) {
    if (!this.ready || !this.currentSnapshot) {
      return;
    }
    const target = requestId
      ? this.currentSnapshot.requests.find((request) => request.id === requestId)
      : this.currentSnapshot.requests[0];
    if (!target) {
      return;
    }
    const history = await this.api.getRequestHistory(target.id, 6).catch(() => []);
    this.panel.webview.postMessage({
      type: 'workspace:request',
      payload: { request: target, history },
    });
  }

  private async runPrimaryRequest() {
    const request = this.currentSnapshot?.requests[0];
    if (!request) {
      vscode.window.showWarningMessage('No requests available to run for this workspace.');
      return;
    }
    await this.runRequest(request.id, request);
  }

  private async runRequest(requestId: string, request?: ApiRequest) {
    try {
      const result = await this.api.runRequest(requestId);
      const summary = request ? `${request.method} ${request.url}` : requestId;
      const suffix = result.runId ? ' \u00b7 run #' + result.runId : '';
      vscode.window.showInformationMessage(`Request queued: ${summary}${suffix}`);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
          ? error.message
          : 'Unable to queue request run.';
      vscode.window.showErrorMessage(`Failed to queue request: ${message}`);
    }
  }

  private resolveTheme(kind: vscode.ColorThemeKind): ThemeVariant {
    switch (kind) {
      case vscode.ColorThemeKind.Light:
        return 'light';
      case vscode.ColorThemeKind.HighContrast:
      case vscode.ColorThemeKind.HighContrastLight:
        return 'high-contrast';
      default:
        return 'dark';
    }
  }

  private renderHtml(workspaceLabel: string, healthUrl: string) {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${brand.title(workspaceLabel)}</title>
    <style>
      :root {
        color-scheme: light dark;
      }

      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      body {
        --color-background: 9 10 16;
        --color-surface: 17 19 28;
        --color-surface-strong: 24 26 38;
        --color-border: 43 46 58;
        --color-foreground: 242 244 248;
        --color-muted: 139 142 153;
        --color-accent-start: 99 102 241;
        --color-accent-end: 20 184 166;
        --shadow-elevated: 0 32px 96px rgba(8, 12, 24, 0.55);
        --radius-xl: 32px;
        --radius-lg: 24px;
        --radius-pill: 999px;

        margin: 0;
        min-height: 100vh;
        font-family: 'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        -webkit-font-smoothing: antialiased;
        background-color: rgb(var(--color-background));
        background-image: radial-gradient(120% 120% at 50% 0%, rgba(var(--color-accent-start), 0.25), rgba(var(--color-background), 1));
        color: rgb(var(--color-foreground));
        transition: background-color 300ms ease, color 300ms ease;
      }

      body::before {
        content: '';
        position: fixed;
        inset: -40vh -20vw auto;
        width: 140vw;
        height: 140vh;
        pointer-events: none;
        background:
          radial-gradient(60% 60% at 20% 20%, rgba(var(--color-accent-start), 0.28), transparent),
          radial-gradient(50% 50% at 80% 0%, rgba(var(--color-accent-end), 0.22), transparent);
        filter: blur(120px);
        opacity: 0.9;
        z-index: -1;
      }

      body[data-theme='light'] {
        --color-background: 246 247 249;
        --color-surface: 250 251 253;
        --color-surface-strong: 232 234 241;
        --color-border: 214 215 221;
        --color-foreground: 15 17 26;
        --color-muted: 120 123 135;
        --color-accent-start: 88 101 242;
        --color-accent-end: 20 184 166;
        --shadow-elevated: 0 30px 80px rgba(15, 25, 55, 0.18);
      }

      body[data-theme='high-contrast'] {
        --color-background: 0 0 0;
        --color-surface: 16 16 16;
        --color-surface-strong: 24 24 24;
        --color-border: 120 120 120;
        --color-foreground: 255 255 255;
        --color-muted: 200 200 200;
        --color-accent-start: 135 176 255;
        --color-accent-end: 64 224 208;
        --shadow-elevated: 0 0 0 rgba(0, 0, 0, 0.4);
      }

      .viewport {
        max-width: 1080px;
        margin: 0 auto;
        padding: clamp(32px, 6vw, 96px) clamp(24px, 6vw, 64px);
        display: flex;
        flex-direction: column;
        gap: 48px;
        min-height: 100vh;
      }

      .hero {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .hero__eyebrow {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.32em;
        color: rgba(var(--color-muted), 0.9);
      }

      .hero__headline {
        margin: 0;
        font-size: clamp(32px, 6vw, 56px);
        font-weight: 600;
        letter-spacing: -0.02em;
      }

      .hero__copy {
        margin: 0;
        max-width: 640px;
        font-size: 16px;
        line-height: 1.6;
        color: rgba(var(--color-muted), 0.88);
      }

      .surface {
        background: linear-gradient(150deg, rgba(var(--color-surface), 0.92), rgba(var(--color-surface-strong), 0.96));
        border-radius: var(--radius-xl);
        padding: clamp(32px, 5vw, 56px);
        box-shadow: var(--shadow-elevated);
        border: 1px solid rgba(var(--color-border), 0.45);
        backdrop-filter: blur(28px);
        display: flex;
        flex-direction: column;
        gap: 32px;
      }

      .surface__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 24px;
      }

      .surface__summary {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .surface__headline {
        margin: 0;
        font-size: clamp(24px, 3.6vw, 32px);
        font-weight: 600;
        letter-spacing: -0.01em;
      }

      .surface__copy {
        margin: 0;
        max-width: 560px;
        font-size: 15px;
        line-height: 1.7;
        color: rgba(var(--color-muted), 0.9);
      }

      .workspace-pill {
        display: inline-flex;
        align-items: center;
        align-self: flex-start;
        gap: 8px;
        padding: 10px 20px;
        border-radius: var(--radius-pill);
        background: rgba(var(--color-foreground), 0.08);
        color: rgb(var(--color-foreground));
        font-size: 13px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .presence {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: var(--radius-pill);
        background: rgba(var(--color-foreground), 0.08);
        border: 1px solid rgba(var(--color-border), 0.35);
      }

      .presence__dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: rgb(var(--color-accent-end));
        box-shadow: 0 0 0 6px rgba(var(--color-accent-end), 0.22);
        transition: background 200ms ease, box-shadow 200ms ease;
      }

      .presence__text {
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.22em;
        color: rgba(var(--color-muted), 0.9);
        transition: color 200ms ease;
      }

      .presence[data-status='checking'] .presence__dot {
        background: rgba(var(--color-muted), 0.7);
        box-shadow: 0 0 0 6px rgba(var(--color-muted), 0.24);
      }

      .presence[data-status='checking'] .presence__text {
        color: rgba(var(--color-muted), 0.85);
      }

      .presence[data-status='offline'] .presence__dot {
        background: #ef4444;
        box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.24);
      }

      .presence[data-status='offline'] .presence__text {
        color: rgba(255, 190, 190, 0.92);
      }

      .status-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 20px;
        border-radius: var(--radius-lg);
        background: rgba(255, 92, 92, 0.12);
        border: 1px solid rgba(255, 92, 92, 0.3);
        color: rgba(255, 214, 214, 0.92);
      }

      .status-banner[hidden] {
        display: none;
      }

      .status-banner__action {
        appearance: none;
        border: none;
        cursor: pointer;
        font: inherit;
        border-radius: var(--radius-pill);
        padding: 8px 16px;
        background: rgba(var(--color-foreground), 0.12);
        color: inherit;
        transition: background 200ms ease;
      }

      .status-banner__action:hover {
        background: rgba(var(--color-foreground), 0.2);
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 24px;
      }

      .metric {
        background: rgba(var(--color-foreground), 0.04);
        border-radius: var(--radius-lg);
        padding: 20px 24px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        box-shadow: inset 0 1px 0 rgba(var(--color-foreground), 0.06);
      }

      .metric__label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.24em;
        color: rgba(var(--color-muted), 0.78);
        margin: 0;
      }

      .metric__value {
        margin: 0;
        font-size: 26px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: rgb(var(--color-foreground));
      }

      .metric__hint {
        margin: 0;
        font-size: 13px;
        color: rgba(var(--color-muted), 0.82);
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 16px;
      }

      button {
        appearance: none;
        border: none;
        cursor: pointer;
        font: inherit;
        border-radius: var(--radius-pill);
        padding: 14px 28px;
        transition: transform 250ms ease, box-shadow 250ms ease, background 250ms ease;
      }

      button:focus-visible {
        outline: 2px solid rgba(var(--color-accent-start), 0.8);
        outline-offset: 2px;
      }

      .primary-button {
        background: linear-gradient(135deg, rgba(var(--color-accent-start), 1), rgba(var(--color-accent-end), 1));
        color: white;
        box-shadow: 0 24px 48px rgba(var(--color-accent-start), 0.35);
      }

      .primary-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 28px 64px rgba(var(--color-accent-start), 0.4);
      }

      .secondary-button {
        background: rgba(var(--color-foreground), 0.08);
        color: rgb(var(--color-foreground));
        border: 1px solid rgba(var(--color-border), 0.4);
      }

      .secondary-button:hover {
        transform: translateY(-2px);
        background: rgba(var(--color-foreground), 0.12);
      }

      .request-console {
        display: flex;
        flex-direction: column;
        gap: 24px;
        background: rgba(var(--color-foreground), 0.04);
        border-radius: calc(var(--radius-lg) + 8px);
        border: 1px solid rgba(var(--color-border), 0.4);
        padding: clamp(24px, 5vw, 40px);
        box-shadow: inset 0 1px 0 rgba(var(--color-foreground), 0.08);
        backdrop-filter: blur(24px);
      }

      .request-console__header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
      }

      .request-console__title {
        margin: 0;
        font-size: 18px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(var(--color-muted), 0.8);
      }

      .request-console__subtitle {
        margin: 4px 0 0;
        font-size: 14px;
        max-width: 440px;
        color: rgba(var(--color-muted), 0.88);
      }

      .request-console__status {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        border-radius: var(--radius-pill);
        border: 1px solid rgba(var(--color-border), 0.45);
        background: rgba(var(--color-foreground), 0.06);
        font-size: 13px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: rgba(var(--color-muted), 0.85);
      }

      .request-console__status-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: linear-gradient(135deg, rgba(var(--color-accent-start), 1), rgba(var(--color-accent-end), 1));
        box-shadow: 0 0 0 6px rgba(var(--color-accent-end), 0.18);
      }

      .request-console__body {
        display: grid;
        gap: 24px;
        grid-template-columns: minmax(220px, 280px) 1fr;
      }

      .request-console__operations {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin: 0;
        padding: 0;
      }

      .request-console__empty {
        margin: 0;
        padding: 24px;
        border-radius: var(--radius-lg);
        background: rgba(var(--color-foreground), 0.05);
        border: 1px dashed rgba(var(--color-border), 0.4);
        color: rgba(var(--color-muted), 0.9);
        text-align: center;
      }

      .request-console__operation {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        border-radius: calc(var(--radius-lg) - 6px);
        padding: 18px 22px;
        width: 100%;
        background: rgba(var(--color-foreground), 0.06);
        border: 1px solid transparent;
        color: rgb(var(--color-foreground));
      }

      .request-console__operation:hover {
        transform: translateY(-2px);
      }

      .request-console__operation.is-active {
        background: linear-gradient(135deg, rgba(var(--color-accent-start), 0.28), rgba(var(--color-accent-end), 0.32));
        border-color: rgba(var(--color-foreground), 0.08);
        box-shadow: 0 20px 44px rgba(var(--color-accent-start), 0.25);
      }

      .request-console__operation::after {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: inherit;
        pointer-events: none;
        border: 1px solid rgba(var(--color-foreground), 0.06);
      }

      .request-console__operation.is-active::after {
        border-color: rgba(var(--color-foreground), 0.12);
      }

      .request-console__verb {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 6px 14px;
        border-radius: var(--radius-pill);
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        background: rgba(var(--color-foreground), 0.12);
        box-shadow: inset 0 1px 0 rgba(var(--color-foreground), 0.18);
      }

      .request-console__operation.is-active .request-console__verb {
        background: rgba(var(--color-foreground), 0.25);
      }

      .request-console__label {
        font-size: 16px;
        font-weight: 600;
        letter-spacing: -0.01em;
      }

      .request-console__hint {
        font-size: 13px;
        color: rgba(var(--color-muted), 0.85);
      }

      .request-console__viewer {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: clamp(20px, 3vw, 32px);
        border-radius: calc(var(--radius-lg) + 6px);
        border: 1px solid rgba(var(--color-border), 0.45);
        background: rgba(var(--color-surface), 0.9);
        box-shadow: inset 0 1px 0 rgba(var(--color-foreground), 0.08);
      }

      .request-viewer__header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .request-viewer__meta {
        display: inline-flex;
        align-items: center;
        gap: 14px;
        font-size: 15px;
      }

      .request-viewer__verb {
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        padding: 6px 12px;
        border-radius: var(--radius-pill);
        background: rgba(var(--color-foreground), 0.12);
      }

      .request-viewer__path {
        font-family: 'Menlo', 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
        font-size: 14px;
        letter-spacing: 0.01em;
        color: rgba(var(--color-foreground), 0.92);
      }

      .request-viewer__status {
        font-size: 13px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(var(--color-muted), 0.78);
      }

      .request-viewer__replay {
        background: rgba(var(--color-accent-start), 0.18);
        color: rgb(var(--color-foreground));
        border: 1px solid rgba(var(--color-accent-start), 0.32);
        padding: 10px 22px;
        font-size: 13px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .request-viewer__replay:hover {
        background: rgba(var(--color-accent-start), 0.26);
      }

      .request-viewer__description {
        margin: 0;
        font-size: 15px;
        line-height: 1.6;
        color: rgba(var(--color-muted), 0.92);
      }

      .request-viewer__panels {
        display: grid;
        gap: 20px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }

      .request-viewer__panel {
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: rgba(var(--color-foreground), 0.05);
        border-radius: var(--radius-lg);
        border: 1px solid rgba(var(--color-border), 0.35);
        padding: 18px;
        box-shadow: inset 0 1px 0 rgba(var(--color-foreground), 0.08);
      }

      .request-viewer__panel h4 {
        margin: 0;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.22em;
        color: rgba(var(--color-muted), 0.88);
      }

      pre {
        margin: 0;
        font-family: 'Menlo', 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.6;
        color: rgba(var(--color-foreground), 0.88);
        background: rgba(var(--color-surface-strong), 0.72);
        border-radius: calc(var(--radius-lg) - 6px);
        padding: 18px;
        overflow: auto;
        box-shadow: inset 0 1px 0 rgba(var(--color-foreground), 0.06);
      }

      code {
        font-family: inherit;
      }

      @media (max-width: 960px) {
        .request-console__body {
          grid-template-columns: 1fr;
        }

        .request-console__operation {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }

        .request-console__operation .request-console__label {
          flex: 1 1 auto;
        }
      }

      @media (max-width: 720px) {
        .request-viewer__panels {
          grid-template-columns: 1fr;
        }
      }

      .shortcut {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        padding: 10px 20px;
        border-radius: var(--radius-pill);
        background: rgba(var(--color-foreground), 0.08);
        border: 1px solid rgba(var(--color-border), 0.35);
        color: rgba(var(--color-muted), 0.9);
      }

      .shortcut__badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 6px 12px;
        border-radius: var(--radius-pill);
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.08em;
        color: rgb(var(--color-foreground));
        background: rgba(var(--color-foreground), 0.1);
        box-shadow: inset 0 0 0 1px rgba(var(--color-border), 0.4);
      }

      .shortcut__text {
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.22em;
      }

      .timeline {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .timeline__title {
        margin: 0;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.28em;
        color: rgba(var(--color-muted), 0.8);
      }

      .timeline__list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .timeline__item {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        padding-bottom: 20px;
        border-bottom: 1px solid rgba(var(--color-border), 0.35);
      }

      .timeline__item:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }

      .timeline__indicator {
        width: 12px;
        height: 12px;
        border-radius: 999px;
        background: linear-gradient(135deg, rgba(var(--color-accent-start), 1), rgba(var(--color-accent-end), 1));
        box-shadow: 0 0 0 6px rgba(var(--color-accent-start), 0.18);
        margin-top: 4px;
      }

      .timeline__content {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .timeline__headline {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: rgb(var(--color-foreground));
      }

      .timeline__meta {
        margin: 0;
        font-size: 13px;
        color: rgba(var(--color-muted), 0.82);
      }

      .status-bar {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 16px;
        font-size: 13px;
        color: rgba(var(--color-muted), 0.78);
        border-top: 1px solid rgba(var(--color-border), 0.3);
        padding-top: 16px;
        margin-top: auto;
      }

      body[data-loading='true'] .request-console__operations {
        opacity: 0.6;
        pointer-events: none;
      }

      @media (max-width: 900px) {
        .surface__header {
          flex-direction: column;
          align-items: stretch;
        }

        .presence {
          align-self: flex-start;
        }

        .status-bar {
          flex-direction: column;
          align-items: flex-start;
        }
      }

      @media (max-width: 600px) {
        .viewport {
          padding: 32px 20px 56px;
          gap: 40px;
        }

        .surface {
          border-radius: 24px;
          padding: 28px;
          gap: 28px;
        }

        button {
          width: 100%;
          justify-content: center;
        }

        .shortcut {
          width: 100%;
          justify-content: center;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }
    </style>
  </head>
  <body data-theme="dark" data-loading="false">
    <div class="viewport">
      <header class="hero">
        <span class="hero__eyebrow">Overview</span>
        <h1 class="hero__headline">${brand.productName}</h1>
        <p class="hero__copy">
          Monitor and orchestrate your API platform without leaving VS Code. Live data flows in from the
          workspace you select.
        </p>
      </header>

      <section class="surface" aria-labelledby="workspace-heading">
        <div class="surface__header">
          <div class="surface__summary">
            <span class="workspace-pill" data-workspace-label>${workspaceLabel}</span>
            <h2 class="surface__headline" id="workspace-heading" data-workspace-heading>${workspaceLabel} control surface</h2>
            <p class="surface__copy" data-workspace-copy>
              Requests, tests, and analytics mirror the ${workspaceLabel} space in real time.
            </p>
          </div>
          <div class="presence" role="status" aria-live="polite" data-connection-indicator data-status="checking">
            <span class="presence__dot" aria-hidden="true" data-connection-dot></span>
            <span class="presence__text" data-connection-text>Checking...</span>
          </div>
        </div>

        <div class="status-banner" data-error hidden role="alert">
          <span data-error-message>Unable to load workspace data.</span>
          <button type="button" class="status-banner__action" data-error-dismiss>Dismiss</button>
        </div>

        <dl class="metrics-grid" data-metrics aria-live="polite" aria-busy="false"></dl>

        <div class="actions" role="group" aria-label="Primary actions">
          <button class="primary-button" id="open-web">Open Web Studio</button>
          <button class="secondary-button" id="run-latest" disabled>Run highlighted request</button>
          <div class="shortcut" aria-hidden="true">
            <span class="shortcut__badge">\u2318K</span>
            <span class="shortcut__text">Command palette</span>
          </div>
        </div>

        <div class="request-console" role="region" aria-labelledby="request-console-title">
          <div class="request-console__header">
            <div>
              <p class="request-console__title" id="request-console-title">API operations</p>
              <p class="request-console__subtitle" data-request-subtitle>
                Select a saved request to inspect its details, replay it, or queue a new run.
              </p>
            </div>
            <div class="request-console__status">
              <span class="request-console__status-dot" aria-hidden="true"></span>
              <span data-request-status-pill>Live request viewer</span>
            </div>
          </div>

          <div class="request-console__body">
            <nav class="request-console__operations" role="tablist" aria-label="API operations" data-operation-list></nav>

            <section
              class="request-console__viewer"
              id="request-viewer"
              role="tabpanel"
              aria-labelledby="request-console-title"
              tabindex="0"
              aria-live="polite"
            >
              <header class="request-viewer__header">
                <div class="request-viewer__meta">
            <span class="request-viewer__verb" data-request-verb>\u2014</span>
                  <span class="request-viewer__path" data-request-path></span>
                </div>
                <div class="request-viewer__status" data-request-status>Waiting for data...</div>
                <button class="request-viewer__replay" id="replay-request" disabled>Replay request</button>
              </header>
              <p class="request-viewer__description" data-request-description>
                Choose a request from the list to view its configuration and recent activity.
              </p>
              <div class="request-viewer__panels">
                <div class="request-viewer__panel">
                  <h4>Request</h4>
                  <pre><code data-request-code></code></pre>
                </div>
                <div class="request-viewer__panel">
                  <h4>Response preview</h4>
                  <pre><code data-response-code></code></pre>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div class="timeline">
          <h3 class="timeline__title">Latest activity</h3>
          <ol class="timeline__list" role="list" data-timeline></ol>
        </div>

        <div class="status-bar">
          <span data-status-primary>Workspace ready</span>
          <span data-status-secondary></span>
        </div>
      </section>
    </div>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const savedState = vscode.getState?.() ?? {};
      const state = {
        theme: savedState.theme ?? 'dark',
        workspaceLabel: savedState.workspaceLabel ?? '${workspaceLabel}',
        activeRequestId: savedState.activeRequestId ?? null,
        loading: false,
        snapshot: null,
        connectionStatus: 'checking',
        currentUser: savedState.currentUser ?? null,
      };

      const initialHealthUrl = ${JSON.stringify(healthUrl)};
      let healthEndpoint = initialHealthUrl;
      let healthTimer = null;
      let healthAbortController = null;

      const workspaceBadge = document.querySelector('[data-workspace-label]');
      const workspaceHeading = document.querySelector('[data-workspace-heading]');
      const workspaceCopy = document.querySelector('[data-workspace-copy]');
      const metricsContainer = document.querySelector('[data-metrics]');
      const operationList = document.querySelector('[data-operation-list]');
      const requestVerb = document.querySelector('[data-request-verb]');
      const requestPath = document.querySelector('[data-request-path]');
      const requestStatus = document.querySelector('[data-request-status]');
      const requestDescription = document.querySelector('[data-request-description]');
      const requestCode = document.querySelector('[data-request-code]');
      const responseCode = document.querySelector('[data-response-code]');
      const requestSubtitle = document.querySelector('[data-request-subtitle]');
      const requestStatusPill = document.querySelector('[data-request-status-pill]');
      const openWebButton = document.getElementById('open-web');
      const runLatestButton = document.getElementById('run-latest');
      const replayButton = document.getElementById('replay-request');
      const timelineList = document.querySelector('[data-timeline]');
      const statusPrimary = document.querySelector('[data-status-primary]');
      const statusSecondary = document.querySelector('[data-status-secondary]');
      const connectionIndicator = document.querySelector('[data-connection-indicator]');
      const connectionText = document.querySelector('[data-connection-text]');
      const errorBanner = document.querySelector('[data-error]');
      const errorMessage = document.querySelector('[data-error-message]');
      const errorDismiss = document.querySelector('[data-error-dismiss]');

      const updateConnectionIndicator = (status) => {
        const normalized = status === 'online' || status === 'offline' ? status : 'checking';
        state.connectionStatus = normalized;
        if (connectionIndicator) {
          connectionIndicator.setAttribute('data-status', normalized);
        }
        if (connectionText) {
          connectionText.textContent =
            normalized === 'online' ? 'Connected' : normalized === 'offline' ? 'Offline' : 'Checking...';
        }
      };

      const stopHealthChecks = () => {
        if (healthTimer) {
          clearInterval(healthTimer);
          healthTimer = null;
        }
        if (healthAbortController) {
          healthAbortController.abort();
          healthAbortController = null;
        }
      };

      const performHealthCheck = async () => {
        if (!healthEndpoint) {
          updateConnectionIndicator('offline');
          return;
        }
        if (healthAbortController) {
          healthAbortController.abort();
        }
        const controller = new AbortController();
        healthAbortController = controller;
        try {
          const response = await fetch(healthEndpoint, { cache: 'no-store', signal: controller.signal });
          if (!response.ok) {
            throw new Error('Status ' + response.status);
          }
          const payload = await response.json().catch(() => null);
          if (payload && payload.status === 'ok') {
            updateConnectionIndicator('online');
            return;
          }
          throw new Error('Unexpected payload');
        } catch (error) {
          if ((error ?? {}).name === 'AbortError') {
            return;
          }
          updateConnectionIndicator('offline');
        }
      };

      const startHealthChecks = () => {
        stopHealthChecks();
        updateConnectionIndicator('checking');
        void performHealthCheck();
        healthTimer = setInterval(() => {
          void performHealthCheck();
        }, 10000);
      };

      startHealthChecks();

      const persistState = () => {
        vscode.setState?.({
          theme: state.theme,
          workspaceLabel: state.workspaceLabel,
          activeRequestId: state.activeRequestId,
          currentUser: state.currentUser,
        });
      };

      const updateWorkspaceLabel = (label) => {
        const normalized = typeof label === 'string' && label.trim().length ? label.trim() : 'Workspace';
        state.workspaceLabel = normalized;
        if (workspaceBadge) workspaceBadge.textContent = normalized;
        if (workspaceHeading) workspaceHeading.textContent = normalized + ' control surface';
        if (workspaceCopy)
          workspaceCopy.textContent = 'Requests, tests, and analytics mirror the ' + normalized + ' space in real time.';
        document.title = '${brand.productName} \u00b7 ' + normalized;
        updateStatusBar();
        persistState();
      };

      const setLoading = (loading) => {
        state.loading = Boolean(loading);
        document.body.dataset.loading = state.loading ? 'true' : 'false';
        metricsContainer?.setAttribute('aria-busy', state.loading ? 'true' : 'false');
        if (runLatestButton) {
          const hasRequests = Array.isArray(state.snapshot?.requests) && state.snapshot.requests.length > 0;
          runLatestButton.disabled = state.loading || !hasRequests;
        }
        updateStatusBar();
      };

      const applyTheme = (mode) => {
        const normalized = mode === 'light' || mode === 'high-contrast' ? mode : 'dark';
        document.body.dataset.theme = normalized;
        state.theme = normalized;
        persistState();
      };

      const formatNumber = (value) => new Intl.NumberFormat().format(value ?? 0);
      const formatDuration = (ms) => {
        const value = Number(ms ?? 0);
        if (!value) return '\u2014';
        if (value < 1000) {
          return Math.round(value) + ' ms';
        }
        const seconds = value / 1000;
        if (seconds < 60) {
          return seconds.toFixed(1) + ' s';
        }
        const minutes = Math.round(seconds / 60);
        return String(minutes) + ' min';
      };
      const formatRelativeTime = (iso) => {
        const date = iso ? new Date(iso) : null;
        if (!date || Number.isNaN(date.getTime())) {
          return '';
        }
        const diff = Date.now() - date.getTime();
        const minutes = Math.round(diff / 60000);
        if (minutes <= 1) return 'moments ago';
        if (minutes < 60) return String(minutes) + ' min ago';
        const hours = Math.round(minutes / 60);
        if (hours < 24) return String(hours) + ' hr' + (hours === 1 ? '' : 's') + ' ago';
        const days = Math.round(hours / 24);
        return String(days) + ' day' + (days === 1 ? '' : 's') + ' ago';
      };

      const hideError = () => {
        if (errorBanner) {
          errorBanner.hidden = true;
        }
      };

      const showError = (message) => {
        if (errorBanner) {
          errorBanner.hidden = false;
        }
        if (errorMessage) {
          errorMessage.textContent = message;
        }
      };

      const renderMetrics = (snapshot) => {
        if (!metricsContainer) return;
        metricsContainer.innerHTML = '';
        const metrics = [
          {
            label: 'Runs queued',
            value: formatNumber(snapshot?.analytics?.totalRuns ?? 0),
            hint: 'Analytics summary',
          },
          {
            label: 'Average duration',
            value: formatDuration(snapshot?.analytics?.averageDurationMs ?? 0),
            hint: 'Latest rollup',
          },
          {
            label: 'Projects',
            value: formatNumber(snapshot?.projects?.length ?? 0),
            hint: 'Workspace projects',
          },
          {
            label: 'Environments',
            value: formatNumber(snapshot?.environments?.length ?? 0),
            hint: 'Environment scopes',
          },
        ];
        metrics.forEach((metric) => {
          const wrapper = document.createElement('div');
          wrapper.className = 'metric';
          const dt = document.createElement('dt');
          dt.className = 'metric__label';
          dt.textContent = metric.label;
          const ddValue = document.createElement('dd');
          ddValue.className = 'metric__value';
          ddValue.textContent = metric.value;
          const ddHint = document.createElement('dd');
          ddHint.className = 'metric__hint';
          ddHint.textContent = metric.hint;
          wrapper.appendChild(dt);
          wrapper.appendChild(ddValue);
          wrapper.appendChild(ddHint);
          metricsContainer.appendChild(wrapper);
        });
      };

      const highlightOperationButton = (requestId, { focus = false } = {}) => {
        const buttons = Array.from(operationList?.querySelectorAll('[data-request-id]') ?? []);
        buttons.forEach((button) => {
          const isActive = button.dataset.requestId === requestId;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-selected', isActive ? 'true' : 'false');
          button.setAttribute('tabindex', isActive ? '0' : '-1');
          if (isActive && focus) {
            button.focus();
          }
        });
      };

      const handleOperationKeydown = (event, button) => {
        const buttons = Array.from(operationList?.querySelectorAll('[data-request-id]') ?? []);
        if (!buttons.length) {
          return;
        }
        const index = buttons.indexOf(button);
        if (index === -1) {
          return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
          event.preventDefault();
          const next = buttons[(index + 1) % buttons.length];
          selectOperation(next.dataset.requestId, { focus: true });
          return;
        }
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const previous = buttons[(index - 1 + buttons.length) % buttons.length];
          selectOperation(previous.dataset.requestId, { focus: true });
          return;
        }
        if (event.key === 'Home') {
          event.preventDefault();
          selectOperation(buttons[0].dataset.requestId, { focus: true });
          return;
        }
        if (event.key === 'End') {
          event.preventDefault();
          selectOperation(buttons[buttons.length - 1].dataset.requestId, { focus: true });
        }
      };

      const renderOperations = (snapshot) => {
        if (!operationList) return;
        operationList.innerHTML = '';
        const requests = Array.isArray(snapshot?.requests) ? snapshot.requests : [];
        if (requests.length === 0) {
          const empty = document.createElement('p');
          empty.className = 'request-console__empty';
          empty.textContent = 'No saved requests yet. Create one from the Studio web experience.';
          operationList.appendChild(empty);
          if (requestSubtitle) {
            requestSubtitle.textContent = 'No saved requests yet.';
          }
          if (requestStatusPill) {
            requestStatusPill.textContent = 'Live request viewer';
          }
          if (replayButton) replayButton.disabled = true;
          if (runLatestButton) runLatestButton.disabled = true;
        requestVerb.textContent = '\u2014';
          requestPath.textContent = '';
          requestDescription.textContent = 'Create a request to mirror its definition here.';
          requestCode.textContent = '';
          responseCode.textContent = '';
          requestStatus.textContent = 'No request selected';
          renderTimeline([]);
          updateStatusBar();
          return;
        }

        requests.forEach((request) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'request-console__operation';
          button.dataset.requestId = request.id;
          button.setAttribute('role', 'tab');
          button.setAttribute('aria-controls', 'request-viewer');
          button.setAttribute('aria-selected', 'false');
          button.setAttribute('tabindex', '-1');

          const verb = document.createElement('span');
          verb.className = 'request-console__verb';
          verb.textContent = (request.method ?? 'GET').toUpperCase();
          const label = document.createElement('span');
          label.className = 'request-console__label';
          label.textContent = request.name ?? 'Untitled request';
          const hint = document.createElement('span');
          hint.className = 'request-console__hint';
          hint.textContent = request.url ?? '/';

          button.appendChild(verb);
          button.appendChild(label);
          button.appendChild(hint);

          button.addEventListener('click', () => selectOperation(request.id, { focus: true }));
          button.addEventListener('keydown', (event) => handleOperationKeydown(event, button));
          operationList.appendChild(button);
        });

        const firstId = requests[0]?.id ?? null;
        const hasPersisted = state.activeRequestId && requests.some((request) => request.id === state.activeRequestId);
        const activeId = hasPersisted ? state.activeRequestId : firstId;
        state.activeRequestId = activeId;
        highlightOperationButton(activeId, { focus: false });
        if (activeId && hasPersisted && activeId !== firstId) {
          vscode.postMessage({ type: 'request-selected', requestId: activeId });
        }
        if (runLatestButton) runLatestButton.disabled = false;
        if (requestSubtitle) {
          const count = requests.length;
          requestSubtitle.textContent = 'Showing ' + count + ' saved ' + (count === 1 ? 'request' : 'requests') + ' from the workspace.';
        }
        updateStatusBar();
        persistState();
      };

      const buildRequestCode = (request) => {
        const lines = [((request.method ?? 'GET').toUpperCase() + ' ' + (request.url ?? '/'))];
        if (state.snapshot?.workspace?.slug) {
          lines.push('X-Workspace: ' + state.snapshot.workspace.slug);
        }
        lines.push('Authorization: Bearer <token>');
        return lines.join('\n');
      };

      const buildResponsePreview = (request) => {
        const lines = ['{'];
        if (state.snapshot?.workspace?.id) {
          lines.push('  "workspaceId": "' + state.snapshot.workspace.id + '",');
        }
          lines.push('  "requestId": "' + request.id + '",');
        lines.push('  "status": "QUEUED"');
        lines.push('}');
        return lines.join('\n');
      };

      const formatStatusLine = (history) => {
        if (!Array.isArray(history) || history.length === 0) {
          return '';
        }
        const latest = history[0];
        const parts = [];
        if (latest.status) {
          parts.push(String(latest.status).toUpperCase());
        }
        if (latest.durationMs) {
          parts.push(String(latest.durationMs) + ' ms');
        }
        const relative = formatRelativeTime(latest.createdAt);
        if (relative) {
          parts.push(relative);
        }
        return parts.join(' \u00b7 ');
      };

      const renderTimeline = (history) => {
        if (!timelineList) return;
        timelineList.innerHTML = '';
        const items = Array.isArray(history) ? history : [];
        if (!items.length) {
          const li = document.createElement('li');
          li.className = 'timeline__item';
          const indicator = document.createElement('span');
          indicator.className = 'timeline__indicator';
          indicator.setAttribute('aria-hidden', 'true');
          const content = document.createElement('div');
          content.className = 'timeline__content';
          const headline = document.createElement('p');
          headline.className = 'timeline__headline';
          headline.textContent = 'No runs yet';
          const meta = document.createElement('p');
          meta.className = 'timeline__meta';
          meta.textContent = 'Replay the request to queue a run.';
          content.appendChild(headline);
          content.appendChild(meta);
          li.appendChild(indicator);
          li.appendChild(content);
          timelineList.appendChild(li);
          return;
        }

        items.forEach((entry) => {
          const li = document.createElement('li');
          li.className = 'timeline__item';
          const indicator = document.createElement('span');
          indicator.className = 'timeline__indicator';
          indicator.setAttribute('aria-hidden', 'true');
          const content = document.createElement('div');
          content.className = 'timeline__content';
          const headline = document.createElement('p');
          headline.className = 'timeline__headline';
          headline.textContent = entry.status ? String(entry.status).toUpperCase() : 'RUN';
          const meta = document.createElement('p');
          meta.className = 'timeline__meta';
          const pieces = [];
          const relative = formatRelativeTime(entry.createdAt);
          if (relative) pieces.push(relative);
          if (entry.durationMs) pieces.push(String(entry.durationMs) + ' ms');
          meta.textContent = pieces.join(' \u00b7 ');
          content.appendChild(headline);
          content.appendChild(meta);
          li.appendChild(indicator);
          li.appendChild(content);
          timelineList.appendChild(li);
        });
      };

      const renderRequestDetails = (payload) => {
        const request = payload?.request;
        const history = Array.isArray(payload?.history) ? payload.history : [];
        if (!request) {
          requestVerb.textContent = '\u2014';
          requestPath.textContent = '';
          requestDescription.textContent = 'Choose a request from the list to view its configuration.';
          requestCode.textContent = '';
          responseCode.textContent = '';
          requestStatus.textContent = 'No request selected';
          if (requestStatusPill) requestStatusPill.textContent = 'Live request viewer';
          if (replayButton) replayButton.disabled = true;
          renderTimeline([]);
          return;
        }
        state.activeRequestId = request.id;
        highlightOperationButton(request.id, { focus: false });
        requestVerb.textContent = (request.method ?? 'GET').toUpperCase();
        requestPath.textContent = request.url ?? '/';
        requestDescription.textContent = request.description?.trim().length
          ? request.description
          : 'This request does not include a description yet.';
        requestCode.textContent = buildRequestCode(request);
        responseCode.textContent = buildResponsePreview(request);
        const statusLine = formatStatusLine(history);
        requestStatus.textContent = statusLine || 'Ready to queue a run';
        if (requestStatusPill) requestStatusPill.textContent = statusLine ? 'Recent activity' : 'Ready';
        if (replayButton) {
          replayButton.disabled = false;
          replayButton.dataset.requestId = request.id;
        }
        renderTimeline(history);
        updateStatusBar();
        persistState();
      };

      const updateStatusBar = () => {
        if (statusPrimary) {
          const role = (state.currentUser?.role ?? '').toLowerCase();
          const founderSuffix = role === 'owner' ? ' (Founder)' : '';
          statusPrimary.textContent = state.loading
            ? 'Syncing workspace...'
            : 'Workspace \u00b7 ' + state.workspaceLabel + founderSuffix;
        }
        if (statusSecondary) {
          if (state.snapshot) {
            const requestsCount = state.snapshot.requests?.length ?? 0;
            const envCount = state.snapshot.environments?.length ?? 0;
            const requestLabel = requestsCount === 1 ? 'request' : 'requests';
            const environmentLabel = envCount === 1 ? 'environment' : 'environments';
            statusSecondary.textContent =
              requestsCount + ' ' + requestLabel + ' \u00b7 ' + envCount + ' ' + environmentLabel;
          } else {
            statusSecondary.textContent = '';
          }
        }
      };

      const selectOperation = (requestId, options = {}) => {
        if (!requestId) {
          return;
        }
        state.activeRequestId = requestId;
        highlightOperationButton(requestId, { focus: options.focus !== false });
        if (options.notify !== false) {
          vscode.postMessage({ type: 'request-selected', requestId });
        }
        persistState();
      };

      if (openWebButton) {
        openWebButton.addEventListener('click', () => {
          vscode.postMessage({ type: 'open-web' });
        });
      }

      if (runLatestButton) {
        runLatestButton.addEventListener('click', () => {
          vscode.postMessage({ type: 'run-latest-flow', workspaceId: state.snapshot?.workspace?.id ?? null });
        });
      }

      if (replayButton) {
        replayButton.addEventListener('click', () => {
          if (!state.activeRequestId) {
            return;
          }
          vscode.postMessage({ type: 'replay-request', requestId: state.activeRequestId });
        });
      }

      if (errorDismiss) {
        errorDismiss.addEventListener('click', hideError);
      }

      window.addEventListener('beforeunload', stopHealthChecks);

      window.addEventListener('message', (event) => {
        const message = event.data;
        if (!message) {
          return;
        }
        if (message.type === 'connection:config') {
          const next = message.payload?.healthUrl;
          if (typeof next === 'string' && next.trim().length) {
            healthEndpoint = next;
          } else {
            healthEndpoint = initialHealthUrl;
          }
          startHealthChecks();
        }
        if (message.type === 'workspace:selected') {
          const payload = message.payload ?? {};
          updateWorkspaceLabel(payload.label ?? state.workspaceLabel);
          setLoading(Boolean(payload.loading));
        }
        if (message.type === 'theme:update') {
          applyTheme(message.payload);
        }
        if (message.type === 'account:update') {
          state.currentUser = message.payload ?? null;
          persistState();
          updateStatusBar();
        }
        if (message.type === 'workspace:data') {
          hideError();
          state.snapshot = message.payload ?? null;
          renderMetrics(state.snapshot);
          renderOperations(state.snapshot);
          updateStatusBar();
        }
        if (message.type === 'workspace:request') {
          renderRequestDetails(message.payload ?? {});
        }
        if (message.type === 'workspace:error') {
          showError(message.payload?.message ?? 'Unable to load workspace data.');
          setLoading(false);
        }
      });

      applyTheme(state.theme);
      updateWorkspaceLabel(state.workspaceLabel);
      updateStatusBar();
      vscode.postMessage({ type: 'webview-ready' });
    </script>
  </body>
</html>`;
  }
}
