/**
 * @squirrel/vscode - Shared API types between the extension backend and the webview UI.
 * These types model HTTP requests, responses, history records, and environment definitions
 * that power the Squirrel API Studio VS Code experience.
 */

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS"
  | "TRACE";

export interface ApiRequestPayload {
  id?: string;
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  environmentId?: string;
  authId?: string;
  tests?: string;
  name?: string;
  description?: string;
}

export interface ApiResponsePayload {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  duration: number;
  size?: number;
}

export interface TestResult {
  id: string;
  passed: boolean;
  title: string;
  message?: string;
}

export interface ApiHistoryEntry {
  id: string;
  timestamp: number;
  request: ApiRequestPayload;
  response?: ApiResponsePayload;
  errorMessage?: string;
  status?: number;
  favorite?: boolean;
  latency?: number;
  tests?: TestResult[];
}

export interface EnvironmentDefinition {
  id: string;
  name: string;
  variables: Record<string, string>;
  isDefault?: boolean;
  color?: string;
  authIds?: string[];
}

export type AuthType = "none" | "basic" | "bearer" | "apiKey" | "oauth2";

export interface BasicAuthCredentials {
  username: string;
  password: string;
}

export interface BearerAuthCredentials {
  token: string;
}

export interface ApiKeyCredentials {
  key: string;
  placement: "header" | "query";
  target: string;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
}

export interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret?: string;
  scopes?: string[];
  redirectUri?: string;
  usePKCE?: boolean;
}

export type AuthCredentials =
  | { id: string; name: string; type: "none" }
  | { id: string; name: string; type: "basic"; data: BasicAuthCredentials }
  | { id: string; name: string; type: "bearer"; data: BearerAuthCredentials }
  | { id: string; name: string; type: "apiKey"; data: ApiKeyCredentials }
  | { id: string; name: string; type: "oauth2"; data: OAuthConfig; token?: OAuthToken };

export interface CollectionRequestNode {
  id: string;
  type: "request";
  name: string;
  request: ApiRequestPayload;
  tests?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionFolderNode {
  id: string;
  type: "folder";
  name: string;
  children: CollectionNode[];
  createdAt: number;
  updatedAt: number;
}

export type CollectionNode = CollectionRequestNode | CollectionFolderNode;

export interface ApiProject {
  id: string;
  name: string;
  description?: string;
  collections: CollectionNode[];
  createdAt: number;
  updatedAt: number;
}

export interface HistoryAnalyticsSnapshot {
  total: number;
  successes: number;
  failures: number;
  averageLatency: number;
  favorites: number;
}

export interface DocumentationBundle {
  markdown: string;
  html: string;
  generatedAt: number;
}

export type AiCommand = "analyzeResponse" | "suggestFix" | "generateRequest" | "explainError";

export interface AnalyticsEvent {
  type: string;
  properties?: Record<string, string | number | boolean>;
}

export type ExtensionToWebviewMessage =
  | {
      type: "initialized";
      payload: {
        projects: ApiProject[];
        history: ApiHistoryEntry[];
        environments: EnvironmentDefinition[];
        auth: AuthCredentials[];
        analytics: HistoryAnalyticsSnapshot;
        secretsAvailable: boolean;
      };
    }
  | {
      type: "showResponse";
      payload: {
        history: ApiHistoryEntry[];
        activeResponse?: ApiResponsePayload;
        errorMessage?: string;
        analytics: HistoryAnalyticsSnapshot;
      };
    }
  | {
      type: "historyUpdated";
      payload: {
        history: ApiHistoryEntry[];
        analytics: HistoryAnalyticsSnapshot;
      };
    }
  | {
      type: "historyExportReady";
      payload: ApiHistoryEntry[];
    }
  | {
      type: "environmentsUpdated";
      payload: EnvironmentDefinition[];
    }
  | {
      type: "authUpdated";
      payload: AuthCredentials[];
    }
  | {
      type: "projectsUpdated";
      payload: ApiProject[];
    }
  | {
      type: "docsGenerated";
      payload: DocumentationBundle;
    }
  | {
      type: "testsResult";
      payload: {
        requestId?: string;
        results: TestResult[];
      };
    }
  | {
      type: "aiResult";
      payload: {
        command: AiCommand;
        content: string;
      };
    }
  | {
      type: "websocketMessage";
      payload: {
        sessionId: string;
        direction: "in" | "out";
        message: string;
      };
    }
  | {
      type: "websocketClosed";
      payload: { sessionId: string };
    }
  | {
      type: "preloadSelection";
      payload: string;
    };

export type WebviewToExtensionMessage =
  | { type: "initialize" }
  | {
      type: "makeRequest";
      payload: ApiRequestPayload;
    }
  | {
      type: "makeGraphQLRequest";
      payload: { id?: string; url: string; query: string; variables?: string; headers?: Record<string, string> };
    }
  | {
      type: "clearHistory";
    }
  | {
      type: "toggleFavorite";
      payload: { id: string; favorite: boolean };
    }
  | {
      type: "exportHistory";
    }
  | {
      type: "importHistory";
      payload: ApiHistoryEntry[];
    }
  | {
      type: "setEnvironments";
      payload: EnvironmentDefinition[];
    }
  | {
      type: "deleteEnvironment";
      payload: { id: string };
    }
  | {
      type: "loadEnvironment";
      payload: { id: string };
    }
  | {
      type: "setAuth";
      payload: AuthCredentials[];
    }
  | {
      type: "requestOAuth";
      payload: { authId: string; environmentId?: string };
    }
  | {
      type: "refreshOAuth";
      payload: { authId: string };
    }
  | {
      type: "saveProjects";
      payload: ApiProject[];
    }
  | {
      type: "generateDocs";
      payload: { projectId: string };
    }
  | {
      type: "runTests";
      payload: { request: ApiRequestPayload; response?: ApiResponsePayload; tests?: string };
    }
  | {
      type: "aiCommand";
      payload: { command: AiCommand; context: Record<string, unknown> };
    }
  | {
      type: "openWebSocket";
      payload: { sessionId: string; url: string; protocols?: string[]; headers?: Record<string, string> };
    }
  | {
      type: "sendWebSocketMessage";
      payload: { sessionId: string; message: string };
    }
  | {
      type: "closeWebSocket";
      payload: { sessionId: string };
    };
