import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import vscode from "./vscode";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { HistoryPanel } from "./components/HistoryPanel";
import { EnvManager } from "./components/EnvManager";
import { AuthManager } from "./components/AuthManager";
import { TestRunner } from "./components/TestRunner";
import { DocsGenerator } from "./components/DocsGenerator";
import { WebSocketClient } from "./components/WebSocketClient";
import { GraphQLPlayground } from "./components/GraphQLPlayground";
import { AnalyticsPanel } from "./components/AnalyticsPanel";
import { AIAssistantPanel } from "./components/AIAssistantPanel";
import { RequestBuilder } from "./components/RequestBuilder";
import { ResponseViewer } from "./components/ResponseViewer";
import {
  AiCommand,
  ApiProject,
  ApiRequest,
  ApiResponse,
  AuthCredentials,
  DocumentationBundle,
  EnvironmentDefinition,
  HistoryAnalyticsSnapshot,
  HistoryEntry,
  TestResult,
} from "./components/types";

type HostMessage =
  | {
      type: "initialized";
      payload: {
        projects: ApiProject[];
        history: HistoryEntry[];
        environments: EnvironmentDefinition[];
        auth: AuthCredentials[];
        analytics: HistoryAnalyticsSnapshot;
        secretsAvailable: boolean;
      };
    }
  | {
      type: "showResponse";
      payload: {
        history: HistoryEntry[];
        analytics: HistoryAnalyticsSnapshot;
        activeResponse?: ApiResponse;
        errorMessage?: string;
      };
    }
  | {
      type: "historyUpdated";
      payload: { history: HistoryEntry[]; analytics: HistoryAnalyticsSnapshot };
    }
  | { type: "environmentsUpdated"; payload: EnvironmentDefinition[] }
  | { type: "authUpdated"; payload: AuthCredentials[] }
  | { type: "projectsUpdated"; payload: ApiProject[] }
  | { type: "docsGenerated"; payload: DocumentationBundle }
  | { type: "testsResult"; payload: { requestId?: string; results: TestResult[] } }
  | { type: "aiResult"; payload: { command: AiCommand; content: string } }
  | { type: "websocketMessage"; payload: { sessionId: string; direction: "in" | "out"; message: string } }
  | { type: "websocketClosed"; payload: { sessionId: string } }
  | { type: "historyExportReady"; payload: HistoryEntry[] }
  | { type: "preloadSelection"; payload: string };

const websocketSessionId = "primary";

const INITIAL_REQUEST: ApiRequest = {
  method: "GET",
  url: "https://api.example.com/health",
  headers: { Accept: "application/json" },
  body: "",
};

const backgroundGradient = "bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(129,140,248,0.12),_transparent_60%)]";

const App = () => {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [analytics, setAnalytics] = useState<HistoryAnalyticsSnapshot | undefined>();
  const [environments, setEnvironments] = useState<EnvironmentDefinition[]>([]);
  const [auth, setAuth] = useState<AuthCredentials[]>([]);
  const [request, setRequest] = useState<ApiRequest>(INITIAL_REQUEST);
  const [response, setResponse] = useState<ApiResponse | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [testsResults, setTestsResults] = useState<TestResult[]>([]);
  const [docsBundle, setDocsBundle] = useState<DocumentationBundle | undefined>();
  const [aiTranscript, setAiTranscript] = useState<string | undefined>();
  const [snippet, setSnippet] = useState<{ type: string; code: string } | undefined>();
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | undefined>();
  const [websocketLogs, setWebsocketLogs] = useState<{ direction: "in" | "out"; message: string }[]>([]);
  const [websocketConnected, setWebsocketConnected] = useState(false);
  const [secretsAvailable, setSecretsAvailable] = useState(false);

  const postMessage = useCallback((message: unknown) => {
    vscode.postMessage(message);
  }, []);

  useEffect(() => {
    const listener = (event: MessageEvent<HostMessage>) => {
      const message = event.data;
      switch (message.type) {
        case "initialized": {
          setProjects(message.payload.projects);
          setHistory(message.payload.history);
          setAnalytics(message.payload.analytics);
          setEnvironments(message.payload.environments);
          setAuth(message.payload.auth);
          setSelectedHistoryId(message.payload.history[0]?.id);
          const defaultEnvironment = message.payload.environments.find((env) => env.isDefault)?.id;
          setRequest((prev) => ({ ...prev, environmentId: prev.environmentId ?? defaultEnvironment }));
          setSecretsAvailable(message.payload.secretsAvailable);
          break;
        }
        case "showResponse": {
          setHistory(message.payload.history);
          setAnalytics(message.payload.analytics);
          setResponse(message.payload.activeResponse);
          setError(message.payload.errorMessage);
          setSelectedHistoryId(message.payload.history[0]?.id);
          break;
        }
        case "historyUpdated": {
          setHistory(message.payload.history);
          setAnalytics(message.payload.analytics);
          break;
        }
        case "environmentsUpdated": {
          setEnvironments(message.payload);
          const defaultEnvironment = message.payload.find((env) => env.isDefault)?.id;
          setRequest((prev) => ({ ...prev, environmentId: prev.environmentId ?? defaultEnvironment }));
          break;
        }
        case "authUpdated": {
          setAuth(message.payload);
          break;
        }
        case "projectsUpdated": {
          setProjects(message.payload);
          break;
        }
        case "docsGenerated": {
          setDocsBundle(message.payload);
          break;
        }
        case "testsResult": {
          setTestsResults(message.payload.results);
          break;
        }
        case "aiResult": {
          setAiTranscript(message.payload.content);
          break;
        }
        case "websocketMessage": {
          setWebsocketConnected(true);
          setWebsocketLogs((prev) => {
            const next = [...prev, { direction: message.payload.direction, message: message.payload.message }];
            return next.slice(-200);
          });
          break;
        }
        case "websocketClosed": {
          setWebsocketConnected(false);
          break;
        }
        case "historyExportReady": {
          const blob = new Blob([JSON.stringify(message.payload, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = "squirrel-history.json";
          anchor.click();
          URL.revokeObjectURL(url);
          break;
        }
        case "preloadSelection": {
          setRequest((prev) => ({ ...prev, body: message.payload }));
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("message", listener);
    postMessage({ type: "initialize" });
    return () => window.removeEventListener("message", listener);
  }, [postMessage]);

  const handleSendRequest = () => {
    postMessage({ type: "makeRequest", payload: request });
  };

  const handleResend = (entry: HistoryEntry) => {
    setRequest(entry.request);
    setTestsResults(entry.tests ?? []);
    setSelectedHistoryId(entry.id);
    setSnippet(undefined);
    postMessage({ type: "makeRequest", payload: entry.request });
  };

  const handleSelectHistory = (entry: HistoryEntry) => {
    setRequest(entry.request);
    setResponse(entry.response);
    setError(entry.errorMessage);
    setSelectedHistoryId(entry.id);
    setTestsResults(entry.tests ?? []);
    setSnippet(undefined);
  };

  const handleEnvironmentChange = (next: EnvironmentDefinition[]) => {
    setEnvironments(next);
    postMessage({ type: "setEnvironments", payload: next });
  };

  const handleAuthChange = (next: AuthCredentials[]) => {
    setAuth(next);
    postMessage({ type: "setAuth", payload: next });
  };

  const handleProjectsChange = (next: ApiProject[]) => {
    setProjects(next);
    postMessage({ type: "saveProjects", payload: next });
  };

  const handleGenerateDocs = (projectId: string) => {
    postMessage({ type: "generateDocs", payload: { projectId } });
  };

  const handleRunTests = () => {
    if (!response) return;
    postMessage({ type: "runTests", payload: { request, response, tests: request.tests } });
  };

  const handleGraphQLExecute = (payload: { url: string; query: string; variables?: string; headers?: Record<string, string> }) => {
    postMessage({ type: "makeGraphQLRequest", payload });
  };

  const handleWebSocketOpen = (url: string, protocols: string[]) => {
    setWebsocketLogs([]);
    postMessage({ type: "openWebSocket", payload: { sessionId: websocketSessionId, url, protocols } });
  };

  const handleWebSocketSend = (message: string) => {
    postMessage({ type: "sendWebSocketMessage", payload: { sessionId: websocketSessionId, message } });
  };

  const handleWebSocketClose = () => {
    postMessage({ type: "closeWebSocket", payload: { sessionId: websocketSessionId } });
  };

  const handleHistoryExport = () => {
    postMessage({ type: "exportHistory" });
  };

  const handleHistoryImport = (entries: HistoryEntry[]) => {
    postMessage({ type: "importHistory", payload: entries });
  };

  const handleToggleFavorite = (id: string, favorite: boolean) => {
    postMessage({ type: "toggleFavorite", payload: { id, favorite } });
  };

  const handleClearHistory = () => {
    postMessage({ type: "clearHistory" });
  };

  const handleAiCommand = (command: AiCommand, context: Record<string, unknown>) => {
    postMessage({ type: "aiCommand", payload: { command, context } });
  };

  const handleAuthorize = (id: string) => {
    postMessage({ type: "requestOAuth", payload: { authId: id, environmentId: request.environmentId } });
  };

  const handleRefreshToken = (id: string) => {
    postMessage({ type: "refreshOAuth", payload: { authId: id } });
  };

  const generateSnippet = (type: "curl" | "axios" | "fetch") => {
    const code = buildSnippet(type, request);
    setSnippet({ type: type.toUpperCase(), code });
  };

  const activeProject = useMemo(
    () => projects.find((project) => project.collections.some((node) => containsRequest(node, request.id))),
    [projects, request.id]
  );

  return (
    <div className={`min-h-screen text-slate-100 ${backgroundGradient}`}>
      <div className="max-w-[1400px] mx-auto py-8 px-6 space-y-6">
        <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Squirrel API Studio</h1>
            <p className="text-sm text-slate-400">Build, test, document, and analyze APIs without leaving VS Code.</p>
          </div>
          {activeProject && <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{activeProject.name}</span>}
        </motion.header>
        <div className="grid grid-cols-12 gap-6">
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="col-span-12 lg:col-span-3 space-y-4">
            <ProjectSidebar
              projects={projects}
              selectedRequestId={request.id}
              onSelectRequest={(node) => {
                setRequest({ ...node.request, tests: node.tests });
                setTestsResults([]);
              }}
              onSave={handleProjectsChange}
            />
            <EnvManager environments={environments} onChange={handleEnvironmentChange} />
            <AuthManager
              credentials={auth}
              onChange={handleAuthChange}
              onAuthorize={handleAuthorize}
              onRefresh={handleRefreshToken}
              secretsAvailable={secretsAvailable}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="col-span-12 lg:col-span-5 space-y-4">
            <RequestBuilder
              request={request}
              environments={environments}
              auth={auth}
              onChange={(next) => setRequest(next)}
              onSend={handleSendRequest}
              onGenerateSnippet={generateSnippet}
            />
            <ResponseViewer response={response} error={error} snippet={snippet} />
            <TestRunner
              tests={request.tests}
              results={testsResults}
              onChange={(tests) => setRequest((prev) => ({ ...prev, tests }))}
              onRun={handleRunTests}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="col-span-12 lg:col-span-4 space-y-4">
            <HistoryPanel
              history={history}
              analytics={analytics}
              selectedId={selectedHistoryId}
              onSelect={handleSelectHistory}
              onResend={handleResend}
              onClear={handleClearHistory}
              onToggleFavorite={handleToggleFavorite}
              onExport={handleHistoryExport}
              onImport={handleHistoryImport}
            />
            <GraphQLPlayground onExecute={handleGraphQLExecute} />
            <WebSocketClient
              logs={websocketLogs}
              connected={websocketConnected}
              onOpen={handleWebSocketOpen}
              onSend={handleWebSocketSend}
              onClose={handleWebSocketClose}
            />
            <DocsGenerator projects={projects} latest={docsBundle} onGenerate={handleGenerateDocs} />
            <AnalyticsPanel analytics={analytics} history={history} />
            <AIAssistantPanel request={request} response={response} onCommand={handleAiCommand} transcript={aiTranscript} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

function buildSnippet(type: "curl" | "axios" | "fetch", request: ApiRequest): string {
  const headerEntries = Object.entries(request.headers ?? {});
  const body = request.body ? request.body : undefined;
  switch (type) {
    case "curl":
      return [
        `curl -X ${request.method} '${request.url}'`,
        ...headerEntries.map(([key, value]) => `  -H '${key}: ${value}'`),
        body ? `  -d '${body.replace(/'/g, "'\\''")}'` : undefined,
      ]
        .filter(Boolean)
        .join(" \\n");
    case "axios":
      return [
        "import axios from 'axios';",
        "",
        "async function run() {",
        "  const response = await axios.request({",
        `    method: '${request.method}',`,
        `    url: '${request.url}',`,
        headerEntries.length ? `    headers: ${JSON.stringify(Object.fromEntries(headerEntries), null, 6)},` : undefined,
        body ? `    data: ${body},` : undefined,
        "  });",
        "  console.log(response.data);",
        "}",
        "",
        "run();",
      ]
        .filter(Boolean)
        .join("\n");
    case "fetch":
    default:
      return [
        "fetch('" + request.url + "', {",
        `  method: '${request.method}',`,
        headerEntries.length ? `  headers: ${JSON.stringify(Object.fromEntries(headerEntries), null, 4)},` : undefined,
        body ? `  body: ${body},` : undefined,
        "}).then(res => res.json()).then(console.log);",
      ]
        .filter(Boolean)
        .join("\n");
  }
}

function containsRequest(node: ApiProject["collections"][number], requestId?: string): boolean {
  if (!requestId) {
    return false;
  }
  if (node.type === "request") {
    return node.request.id === requestId;
  }
  return node.children.some((child) => containsRequest(child, requestId));
}

export default App;
