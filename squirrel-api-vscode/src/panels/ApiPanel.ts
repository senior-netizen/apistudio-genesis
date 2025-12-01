/**
 * @squirrel/vscode - Webview panel orchestrating the Squirrel API Studio experience.
 * Handles lifecycle, storage coordination, telemetry, websockets, AI, and advanced tooling.
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import WebSocket from "ws";
import { Script, createContext } from "vm";
import {
  ApiRequestPayload,
  ApiResponsePayload,
  ExtensionToWebviewMessage,
  TestResult,
  WebviewToExtensionMessage,
} from "../types/api";
import { makeRequest, makeGraphQLRequest } from "../services/requestManager";
import {
  applyEnvironmentToRequest,
  deleteEnvironment,
  getEnvironments,
  saveEnvironments,
} from "../services/environmentManager";
import {
  getHistory,
  getHistoryExport,
  getAnalytics,
  importHistory,
  logRequest,
  resetHistory,
  toggleFavorite,
} from "../services/historyManager";
import { getProjects, saveProjects, generateDocumentation } from "../services/projectManager";
import {
  applyAuthToRequest,
  beginOAuthFlow,
  getAuthCredentials,
  refreshOAuthToken,
  saveAuthCredentials,
} from "../services/authManager";
import { runAiCommand } from "../ai/squirrelAI";
// Cloud sync hooks (opt-in once the Squirrel Cloud endpoints are live):
// import { syncProjectsToCloud, uploadAnalyticsSnapshot } from "../services/cloudSync";

interface TelemetryClient {
  track(eventName: string, properties?: Record<string, string | number | boolean | undefined>): void;
}

export class ApiPanel {
  public static readonly viewType = "@squirrel/vscode/apiPanel";
  private static currentPanel: ApiPanel | undefined;
  private static extensionUri: vscode.Uri;
  private static telemetry: TelemetryClient;

  public static register(extensionUri: vscode.Uri, telemetry: TelemetryClient) {
    ApiPanel.extensionUri = extensionUri;
    ApiPanel.telemetry = telemetry;
  }

  public static render(context: vscode.ExtensionContext, initialSelection?: string) {
    if (!ApiPanel.extensionUri) {
      throw new Error("ApiPanel not registered with extension URI.");
    }

    if (ApiPanel.currentPanel) {
      ApiPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      if (initialSelection) {
        void ApiPanel.currentPanel.pushSelection(initialSelection);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ApiPanel.viewType,
      "Squirrel API Studio",
      { viewColumn: vscode.ViewColumn.One, preserveFocus: false },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(ApiPanel.extensionUri, "webview-ui", "dist")],
      }
    );

    ApiPanel.currentPanel = new ApiPanel(panel, context, initialSelection);
  }

  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly initialSelection?: string;
  private readonly websocketSessions = new Map<string, WebSocket>();
  private readonly context: vscode.ExtensionContext;
  private secretsAvailable?: boolean;

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext, initialSelection?: string) {
    this.panel = panel;
    this.initialSelection = initialSelection;
    this.context = context;
    this.panel.iconPath = vscode.Uri.joinPath(ApiPanel.extensionUri, "media", "icon.png");
    this.panel.webview.html = this.getHtmlForWebview(panel.webview);

    this.disposables.push(
      this.panel.webview.onDidReceiveMessage((message) => void this.handleMessage(message)),
      this.panel.onDidDispose(() => this.dispose())
    );

    void this.postInitialState();
  }

  private async postInitialState() {
    const [projects, history, environments, auth, analytics] = await Promise.all([
      getProjects(),
      getHistory(),
      getEnvironments(),
      getAuthCredentials(),
      getAnalytics(),
    ]);
    if (this.secretsAvailable === undefined) {
      this.secretsAvailable = await this.detectSecretStorage();
    }

    await this.postMessage({
      type: "initialized",
      payload: {
        projects,
        history,
        environments,
        auth,
        analytics,
        secretsAvailable: this.secretsAvailable,
      },
    });
    if (this.initialSelection) {
      await this.postMessage({ type: "preloadSelection", payload: this.initialSelection });
    }
  }

  private async detectSecretStorage(): Promise<boolean> {
    const probeKey = `@squirrel/vscode/probe-${randomUUID()}`;
    try {
      await this.context.secrets.store(probeKey, "ok");
      const value = await this.context.secrets.get(probeKey);
      await this.context.secrets.delete(probeKey);
      return value === "ok";
    } catch (error) {
      console.warn("[Squirrel] Secret storage unavailable:", error);
      return false;
    }
  }

  private async handleMessage(message: WebviewToExtensionMessage) {
    switch (message.type) {
      case "initialize":
        await this.postInitialState();
        break;
      case "makeRequest":
        await this.handleMakeRequest(message.payload);
        break;
      case "makeGraphQLRequest":
        await this.handleGraphQLRequest(message.payload);
        break;
      case "clearHistory": {
        const { history, analytics } = await resetHistory();
        await this.postMessage({ type: "historyUpdated", payload: { history, analytics } });
        break;
      }
      case "toggleFavorite": {
        const { history, analytics } = await toggleFavorite(message.payload.id, message.payload.favorite);
        await this.postMessage({ type: "historyUpdated", payload: { history, analytics } });
        break;
      }
      case "exportHistory": {
        const exportData = await getHistoryExport();
        await this.postMessage({ type: "historyExportReady", payload: exportData });
        break;
      }
      case "importHistory": {
        const { history, analytics } = await importHistory(message.payload);
        await this.postMessage({ type: "historyUpdated", payload: { history, analytics } });
        break;
      }
      case "setEnvironments": {
        const environments = await saveEnvironments(message.payload);
        await this.postMessage({ type: "environmentsUpdated", payload: environments });
        break;
      }
      case "deleteEnvironment": {
        const environments = await deleteEnvironment(message.payload.id);
        await this.postMessage({ type: "environmentsUpdated", payload: environments });
        break;
      }
      case "loadEnvironment": {
        const environments = await getEnvironments();
        await this.postMessage({ type: "environmentsUpdated", payload: environments });
        break;
      }
      case "setAuth": {
        const auth = await saveAuthCredentials(message.payload);
        await this.postMessage({ type: "authUpdated", payload: auth });
        break;
      }
      case "requestOAuth": {
        const auth = await beginOAuthFlow(message.payload.authId);
        if (auth) {
          await this.postMessage({ type: "authUpdated", payload: auth });
        }
        break;
      }
      case "refreshOAuth": {
        const auth = await refreshOAuthToken(message.payload.authId);
        if (auth) {
          await this.postMessage({ type: "authUpdated", payload: auth });
        }
        break;
      }
      case "saveProjects": {
        const projects = await saveProjects(message.payload);
        await this.postMessage({ type: "projectsUpdated", payload: projects });
        // Uncomment to sync collections to Squirrel Cloud when the workspace API is available.
        // void syncProjectsToCloud(projects);
        break;
      }
      case "generateDocs": {
        const docs = await generateDocumentation(message.payload.projectId);
        if (docs) {
          await this.postMessage({ type: "docsGenerated", payload: docs });
        } else {
          vscode.window.showWarningMessage("Project not found for documentation export.");
        }
        break;
      }
      case "runTests": {
        const results = await this.executeTests(message.payload.request, message.payload.response, message.payload.tests);
        await this.postMessage({ type: "testsResult", payload: { requestId: message.payload.request.id, results } });
        break;
      }
      case "aiCommand": {
        const content = await runAiCommand(message.payload.command, message.payload.context);
        await this.postMessage({ type: "aiResult", payload: { command: message.payload.command, content } });
        break;
      }
      case "openWebSocket":
        this.openWebSocket(message.payload.sessionId, message.payload.url, message.payload.protocols, message.payload.headers);
        break;
      case "sendWebSocketMessage":
        this.sendWebSocketMessage(message.payload.sessionId, message.payload.message);
        break;
      case "closeWebSocket":
        this.closeWebSocket(message.payload.sessionId);
        break;
      default:
        ApiPanel.telemetry.track("unknownMessage", { type: (message as { type: string }).type });
    }
  }

  private async handleMakeRequest(request: ApiRequestPayload) {
    const { request: envApplied } = await applyEnvironmentToRequest(request);
    const authApplied = await applyAuthToRequest(envApplied);

    try {
      const response = await makeRequest(authApplied);
      const { history, analytics } = await logRequest(authApplied, response);
      // Uncomment to push analytics snapshots to Squirrel Cloud when endpoints are available.
      // void uploadAnalyticsSnapshot(analytics);
      ApiPanel.telemetry.track("requestSuccess", {
        method: authApplied.method,
        status: response.status,
      });
      await this.postMessage({
        type: "showResponse",
        payload: {
          history,
          activeResponse: response,
          analytics,
        },
      });
      if (authApplied.tests?.trim()) {
        const results = await this.executeTests(authApplied, response, authApplied.tests);
        await this.postMessage({ type: "testsResult", payload: { requestId: authApplied.id, results } });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const { history, analytics } = await logRequest(authApplied, undefined, message);
      // Uncomment to push analytics snapshots to Squirrel Cloud when endpoints are available.
      // void uploadAnalyticsSnapshot(analytics);
      ApiPanel.telemetry.track("requestFailure", {
        method: authApplied.method,
        error: message,
      });
      await this.postMessage({
        type: "showResponse",
        payload: {
          history,
          errorMessage: message,
          analytics,
        },
      });
    }
  }

  private async handleGraphQLRequest(payload: {
    id?: string;
    url: string;
    query: string;
    variables?: string;
    headers?: Record<string, string>;
  }) {
    try {
      const variables = payload.variables ? JSON.parse(payload.variables) : undefined;
      const requestPayload: ApiRequestPayload = {
        id: payload.id ?? randomUUID(),
        method: "POST",
        url: payload.url,
        headers: { "Content-Type": "application/json", ...(payload.headers ?? {}) },
        body: JSON.stringify({ query: payload.query, variables }),
        name: "GraphQL Request",
      };
      const response = await makeGraphQLRequest(payload);
      const { history, analytics } = await logRequest(requestPayload, response);
      // Uncomment to push analytics snapshots to Squirrel Cloud when endpoints are available.
      // void uploadAnalyticsSnapshot(analytics);
      ApiPanel.telemetry.track("graphqlSuccess", { url: payload.url });
      await this.postMessage({
        type: "showResponse",
        payload: {
          history,
          activeResponse: response,
          analytics,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown GraphQL error";
      const requestPayload: ApiRequestPayload = {
        id: payload.id ?? randomUUID(),
        method: "POST",
        url: payload.url,
        headers: { "Content-Type": "application/json", ...(payload.headers ?? {}) },
        body: JSON.stringify({ query: payload.query, variables: payload.variables }),
        name: "GraphQL Request",
      };
      const { history, analytics } = await logRequest(requestPayload, undefined, message);
      // Uncomment to push analytics snapshots to Squirrel Cloud when endpoints are available.
      // void uploadAnalyticsSnapshot(analytics);
      ApiPanel.telemetry.track("graphqlFailure", { url: payload.url, error: message });
      await this.postMessage({
        type: "showResponse",
        payload: {
          history,
          errorMessage: message,
          analytics,
        },
      });
    }
  }

  private async executeTests(
    request: ApiRequestPayload,
    response: ApiResponsePayload | undefined,
    tests?: string
  ): Promise<TestResult[]> {
    const scriptSource = tests ?? request.tests;
    if (!scriptSource) {
      return [];
    }
    const results: TestResult[] = [];
    const pending: Promise<void>[] = [];
    const register = (title: string, passed: boolean, message?: string) => {
      results.push({ id: randomUUID(), title, passed, message });
    };
    const sandbox = {
      request,
      response,
      console,
      test: (title: string, fn: () => void | Promise<void>) => {
        try {
          const outcome = fn();
          if (outcome instanceof Promise) {
            pending.push(
              outcome
                .then(() => register(title, true))
                .catch((error) => register(title, false, error instanceof Error ? error.message : String(error)))
            );
          } else {
            register(title, true);
          }
        } catch (error) {
          register(title, false, error instanceof Error ? error.message : String(error));
        }
      },
      expect: (condition: unknown, message?: string) => {
        if (!condition) {
          throw new Error(message ?? "Expectation failed");
        }
      },
    };
    try {
      const script = new Script(scriptSource, { filename: "request.tests.js" });
      const context = createContext(sandbox);
      script.runInContext(context, { timeout: 3000 });
      await Promise.all(pending);
      if (!results.length) {
        register("Tests executed", true, "No assertions recorded");
      }
    } catch (error) {
      register("Test harness", false, error instanceof Error ? error.message : String(error));
    }
    return results;
  }

  private openWebSocket(
    sessionId: string,
    url: string,
    protocols?: string[],
    headers?: Record<string, string>
  ) {
    this.closeWebSocket(sessionId);
    try {
      const ws = new WebSocket(url, protocols, { headers });
      this.websocketSessions.set(sessionId, ws);
      ws.on("open", () => {
        void this.postMessage({
          type: "websocketMessage",
          payload: { sessionId, direction: "in", message: "[connected]" },
        });
      });
      ws.on("message", (data) => {
        try {
          void this.postMessage({
            type: "websocketMessage",
            payload: { sessionId, direction: "in", message: data.toString() },
          });
        } catch (error) {
          console.error("[ApiPanel] Failed to process websocket message", error);
        }
      });
      ws.on("error", (error) => {
        void this.postMessage({
          type: "websocketMessage",
          payload: { sessionId, direction: "in", message: `[error] ${error instanceof Error ? error.message : error}` },
        });
      });
      ws.on("close", () => {
        this.websocketSessions.delete(sessionId);
        void this.postMessage({ type: "websocketClosed", payload: { sessionId } });
      });
    } catch (error) {
      void this.postMessage({
        type: "websocketMessage",
        payload: {
          sessionId,
          direction: "in",
          message: `[connection failed] ${error instanceof Error ? error.message : String(error)}`,
        },
      });
    }
  }

  private sendWebSocketMessage(sessionId: string, message: string) {
    const ws = this.websocketSessions.get(sessionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      void this.postMessage({
        type: "websocketMessage",
        payload: { sessionId, direction: "in", message: "[not connected]" },
      });
      return;
    }
    ws.send(message);
    void this.postMessage({
      type: "websocketMessage",
      payload: { sessionId, direction: "out", message },
    });
  }

  private closeWebSocket(sessionId: string) {
    const ws = this.websocketSessions.get(sessionId);
    if (ws) {
      ws.terminate();
      this.websocketSessions.delete(sessionId);
    }
  }

  private async pushSelection(selection: string) {
    await this.postMessage({ type: "preloadSelection", payload: selection });
  }

  private async postMessage(message: ExtensionToWebviewMessage) {
    await this.panel.webview.postMessage(message);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const distPath = path.join(ApiPanel.extensionUri.fsPath, "webview-ui", "dist");
    const manifestPath = path.join(distPath, "manifest.json");

    if (!fs.existsSync(manifestPath)) {
      vscode.window.showWarningMessage(
        "Squirrel API Studio webview assets were not found. Run `npm run build:webview` before packaging."
      );
    }

    const manifest = fs.existsSync(manifestPath)
      ? (JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<string, { file: string; css?: string[]; isEntry?: boolean }>)
      : {};

    const entry = Object.values(manifest).find((item) => item.isEntry) ?? Object.values(manifest)[0];

    const scriptUri = entry
      ? webview.asWebviewUri(vscode.Uri.joinPath(ApiPanel.extensionUri, "webview-ui", "dist", entry.file))
      : undefined;

    const styleUris = entry?.css ?? [];
    const stylesheets = styleUris
      .map((href) =>
        webview.asWebviewUri(vscode.Uri.joinPath(ApiPanel.extensionUri, "webview-ui", "dist", href)).toString()
      )
      .map((href) => `<link rel="stylesheet" href="${href}" />`)
      .join("\n");

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en" data-theme="vs-code">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; style-src 'nonce-${nonce}' ${webview.cspSource} https:; script-src 'nonce-${nonce}'; font-src ${webview.cspSource} https:; connect-src ${webview.cspSource} https: wss:; frame-src ${webview.cspSource} https: data:;" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Squirrel API Studio</title>
          <style nonce="${nonce}">
            :root { color-scheme: light dark; }
            body { margin: 0; padding: 0; }
          </style>
          ${stylesheets}
        </head>
        <body>
          <div id="root"></div>
          ${scriptUri ? `<script nonce="${nonce}" type="module" src="${scriptUri}"></script>` : ""}
        </body>
      </html>`;
  }

  private dispose() {
    ApiPanel.currentPanel = undefined;
    for (const ws of this.websocketSessions.values()) {
      try {
        ws.terminate();
      } catch {
        // ignore
      }
    }
    this.websocketSessions.clear();
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

const getNonce = () => {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};
