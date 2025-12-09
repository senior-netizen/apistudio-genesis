import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Badge, Button, Card } from '@sdl/ui';
import { ClipboardCopy, Code2, Terminal, X } from 'lucide-react';
import { LightAsync as SyntaxHighlighter } from 'react-syntax-highlighter';
import { useAppStore } from '../../store';
import BodyPanel from './BodyPanel';
import HeadersPanel from './HeadersPanel';
import CookiesPanel from './CookiesPanel';
import TimelinePanel from './TimelinePanel';
import StatusBar from './StatusBar';
import { generateCurl } from '../../lib/codegen/curl';
import { generateFetch } from '../../lib/codegen/fetch';
import { generateAxios } from '../../lib/codegen/axios';
import { generatePythonRequests } from '../../lib/codegen/pythonRequests';
import { generateGoNetHttp } from '../../lib/codegen/goNetHttp';
import { generateNodeHttp } from '../../lib/codegen/nodeHttp';
import { generatePhpCurl } from '../../lib/codegen/phpCurl';
import { generateRubyNetHttp } from '../../lib/codegen/rubyNetHttp';
import { generateJavaOkHttp } from '../../lib/codegen/javaOkHttp';
import { generateCsharpHttpClient } from '../../lib/codegen/csharpHttpClient';
import { generateSwiftUrlSession } from '../../lib/codegen/swiftUrlSession';
import { generateDartHttp } from '../../lib/codegen/dartHttp';
import type { ApiRequest } from '../../types/api';

const tabs = [
  { id: 'body', label: 'Body' },
  { id: 'headers', label: 'Headers' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'diff', label: 'Diff' },
] as const;

type SnippetOption = {
  id:
  | 'curl'
  | 'fetch'
  | 'axios'
  | 'node'
  | 'python'
  | 'go'
  | 'php'
  | 'ruby'
  | 'java'
  | 'csharp'
  | 'swift'
  | 'dart';
  label: string;
  description: string;
};

const snippetOptions: SnippetOption[] = [
  { id: 'curl', label: 'cURL', description: 'Command-line invocation' },
  { id: 'fetch', label: 'JavaScript fetch', description: 'Modern browser/Node fetch' },
  { id: 'axios', label: 'JavaScript axios', description: 'Axios instance snippet' },
  { id: 'node', label: 'Node http', description: 'Built-in https module' },
  { id: 'python', label: 'Python requests', description: 'requests library' },
  { id: 'go', label: 'Go net/http', description: 'Go standard library' },
  { id: 'php', label: 'PHP cURL', description: 'PHP cURL client' },
  { id: 'ruby', label: 'Ruby Net::HTTP', description: 'Ruby standard library' },
  { id: 'java', label: 'Java OkHttp', description: 'OkHttp client' },
  { id: 'csharp', label: 'C# HttpClient', description: '.NET HttpClient usage' },
  { id: 'swift', label: 'Swift URLSession', description: 'URLSession data task' },
  { id: 'dart', label: 'Dart http', description: 'dart:http client' }
];

type SnippetId = (typeof snippetOptions)[number]['id'];

function buildSnippet(id: SnippetId, request: ApiRequest, resolvedUrl: string) {
  switch (id) {
    case 'curl':
      return generateCurl(request, resolvedUrl);
    case 'fetch':
      return generateFetch(request, resolvedUrl, 'js');
    case 'axios':
      return generateAxios(request, resolvedUrl);
    case 'node':
      return generateNodeHttp(request, resolvedUrl);
    case 'python':
      return generatePythonRequests(request, resolvedUrl);
    case 'go':
      return generateGoNetHttp(request, resolvedUrl);
    case 'php':
      return generatePhpCurl(request, resolvedUrl);
    case 'ruby':
      return generateRubyNetHttp(request, resolvedUrl);
    case 'java':
      return generateJavaOkHttp(request, resolvedUrl);
    case 'csharp':
      return generateCsharpHttpClient(request, resolvedUrl);
    case 'swift':
      return generateSwiftUrlSession(request, resolvedUrl);
    case 'dart':
      return generateDartHttp(request, resolvedUrl);
    default:
      return '';
  }
}

export default function ResponseViewer() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('body');
  const [snippetOpen, setSnippetOpen] = useState(false);
  const [activeSnippet, setActiveSnippet] = useState<SnippetId>('curl');
  const {
    response,
    responseError,
    testOutcome,
    preRequestOutcome,
    lastSentRequest,
    responseStream,
    responseProgress,
    responseHistory
  } = useAppStore((state) => ({
    response: state.response,
    responseError: state.responseError,
    testOutcome: state.testOutcome,
    preRequestOutcome: state.preRequestOutcome,
    lastSentRequest: state.lastSentRequest ?? state.workingRequest,
    responseStream: state.responseStream,
    responseProgress: state.responseProgress,
    responseHistory: state.responseHistory,
  }));

  const resolvedUrl = response?.url ?? lastSentRequest?.url ?? '';
  const snippet = useMemo(() => {
    if (!lastSentRequest || !resolvedUrl) return '';
    return buildSnippet(activeSnippet, lastSentRequest, resolvedUrl);
  }, [activeSnippet, lastSentRequest, resolvedUrl]);

  const latest = responseHistory[0];
  const previous = responseHistory[1];

  const copyBody = () => {
    if (response?.body) {
      navigator.clipboard.writeText(response.body);
    } else if (responseStream) {
      navigator.clipboard.writeText(responseStream);
    }
  };

  const downloadBody = () => {
    if (!response) return;
    const blob = new Blob([response.body], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'response.txt';
    link.click();
  };

  const copyCurl = () => {
    if (!lastSentRequest || !resolvedUrl) return;
    navigator.clipboard.writeText(generateCurl(lastSentRequest, resolvedUrl));
  };

  const hasBodyContent = Boolean(response?.body || responseStream);

  return (
    <Card className="flex h-full flex-col gap-3 rounded-[16px] border border-border/60 bg-background/95 p-4 shadow-soft">
      <StatusBar response={response} onCopyCurl={copyCurl} onDownload={downloadBody} progress={responseProgress} />

      {responseError && (
        <div className="rounded-[14px] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {responseError}
        </div>
      )}

      {responseStream && !response && (
        <div className="rounded-[14px] border border-border/50 bg-background/85 p-4 text-sm text-muted">
          <p className="font-medium text-foreground">Streaming response…</p>
          <pre className="mt-3 max-h-48 overflow-auto rounded-xl border border-border/40 bg-background/70 p-3 text-xs text-foreground">
            {responseStream}
          </pre>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border/50 bg-background/90 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={activeTab === tab.id ? 'primary' : 'ghost'}
              disabled={tab.id === 'diff' && responseHistory.length < 2}
              className="h-9 rounded-[10px] px-3 text-xs font-semibold"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="rounded-[10px] px-3" onClick={copyBody} disabled={!hasBodyContent}>
            <ClipboardCopy className="mr-2 h-4 w-4" aria-hidden /> Copy body
          </Button>
          <Button size="sm" variant="ghost" className="rounded-[10px] px-3" onClick={() => setSnippetOpen(true)} disabled={!lastSentRequest}>
            <Code2 className="mr-2 h-4 w-4" aria-hidden /> Generate code
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-[16px] border border-border/50 bg-background/90 p-4">
        {activeTab === 'body' && <BodyPanel response={response} streamingBody={responseStream} />}
        {activeTab === 'headers' && <HeadersPanel response={response} />}
        {activeTab === 'cookies' && <CookiesPanel response={response} />}
        {activeTab === 'timeline' && <TimelinePanel timeline={response?.timeline} />}
        {activeTab === 'diff' && previous && latest ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Badge variant={latest.status < 400 ? 'success' : 'destructive'}>{latest.status}</Badge>
                <span className="text-foreground">Latest</span>
              </span>
              <Badge variant="secondary">
                Δ status {latest.status - previous.status >= 0 ? '+' : ''}
                {latest.status - previous.status}
              </Badge>
              <Badge variant="secondary">
                Δ time {latest.duration - previous.duration >= 0 ? '+' : ''}
                {latest.duration - previous.duration}ms
              </Badge>
              <Badge variant="secondary">
                Δ size {formatBytes(latest.size - previous.size)}
              </Badge>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {[latest, previous].map((snap, idx) => (
                <div key={snap.id} className="rounded-2xl border border-border/60 bg-background/80 p-3">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span className="flex items-center gap-2">
                      <Badge variant={snap.status < 400 ? 'success' : 'destructive'}>{snap.status}</Badge>
                      <span className="font-mono uppercase tracking-[0.3em] text-muted">{snap.method}</span>
                    </span>
                    <span>{idx === 0 ? 'Latest' : 'Previous'}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
                    <Badge variant="secondary">{snap.duration} ms</Badge>
                    <Badge variant="secondary">{formatBytes(snap.size)}</Badge>
                  </div>
                  <div className="mt-3 max-h-[320px] overflow-auto rounded-xl border border-border/50 bg-background/90 p-3 text-xs">
                    <SyntaxHighlighter customStyle={{ background: 'transparent', margin: 0 }}>
                      {safePretty(snap.body)}
                    </SyntaxHighlighter>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {response && (
        <details className="rounded-[14px] border border-border/50 bg-background/85 p-4 text-sm">
          <summary className="cursor-pointer font-medium text-foreground">Raw response</summary>
          <pre className="mt-3 max-h-48 overflow-auto rounded-xl border border-border/40 bg-background/80 p-4 text-xs text-foreground">
            {response.body}
          </pre>
        </details>
      )}

      <div className="rounded-[14px] border border-border/50 bg-background/90 p-4">
        <div className="flex items-center gap-3 text-sm font-medium text-foreground">
          <Terminal className="h-4 w-4" aria-hidden /> Script console
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-[0.3em] text-muted">Pre-request</h3>
            <ul className="space-y-2 text-xs text-muted">
              {preRequestOutcome?.logs.map((log, index) => (
                <li key={index} className="rounded-xl border border-border/60 bg-background/95 px-3 py-2">
                  {log}
                </li>
              ))}
              {preRequestOutcome?.error && (
                <li className="rounded-xl border border-destructive/50 bg-destructive/10 px-3 py-2 text-destructive">
                  {preRequestOutcome.error}
                </li>
              )}
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-[0.3em] text-muted">Tests</h3>
            <ul className="space-y-2 text-xs">
              {testOutcome?.results.map((result, index) => (
                <li
                  key={index}
                  className={`rounded-xl border px-3 py-2 ${result.pass ? 'border-success/60 bg-success/10 text-success' : 'border-destructive/60 bg-destructive/10 text-destructive'}`}
                >
                  {result.assertion}
                </li>
              ))}
              {testOutcome?.error && (
                <li className="rounded-xl border border-destructive/60 bg-destructive/10 px-3 py-2 text-destructive">
                  {testOutcome.error}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <Dialog.Root open={snippetOpen} onOpenChange={setSnippetOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-background/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl rounded-3xl border border-border/40 bg-background/95 p-6 shadow-glass">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-lg font-semibold text-foreground">Generate code</Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-full border border-border/60 p-2 text-muted hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </Dialog.Close>
              </div>
              <div className="mt-6 flex flex-col gap-4 md:flex-row">
                <div className="w-full md:w-56">
                  <div className="space-y-2">
                    {snippetOptions.map((option) => (
                      <Button
                        key={option.id}
                        size="sm"
                        variant={activeSnippet === option.id ? 'primary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => setActiveSnippet(option.id)}
                      >
                        <div className="text-left">
                          <p className="font-medium">{option.label}</p>
                          <p className="text-xs text-muted">{option.description}</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted">{resolvedUrl || 'No request selected'}</p>
                    <Button size="sm" variant="ghost" onClick={() => snippet && navigator.clipboard.writeText(snippet)} disabled={!snippet}>
                      <ClipboardCopy className="mr-2 h-4 w-4" aria-hidden /> Copy
                    </Button>
                  </div>
                  <div className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-border/50 bg-background/80 p-4 text-sm">
                    <SyntaxHighlighter customStyle={{ background: 'transparent', margin: 0 }}>
                      {snippet || 'Send a request to generate code snippets.'}
                    </SyntaxHighlighter>
                  </div>
                </div>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Card>
  );
}

function formatBytes(bytes: number) {
  const abs = Math.abs(bytes);
  const sign = bytes < 0 ? '-' : '';
  if (abs < 1024) return `${sign}${abs} B`;
  if (abs < 1024 * 1024) return `${sign}${(abs / 1024).toFixed(1)} KB`;
  return `${sign}${(abs / 1024 / 1024).toFixed(1)} MB`;
}

function safePretty(body: string) {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
