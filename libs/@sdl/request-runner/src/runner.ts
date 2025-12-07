import {
  RequestRunnerOptions,
  RequestRunnerEvents,
  RunnerExecutionOptions,
  RunnerHistoryEntry,
  RunnerHistoryStorage,
  RunnerProgressEvent,
  RunnerRequest,
  RunnerRequestBody,
  RunnerResolvedRequest,
  RunnerResponseSnapshot,
  RunnerSuccessEvent,
  RunnerTimelineEntry,
  RunnerVariable,
  RunnerVariableContext
} from './types';

const DEFAULT_TIMEOUT = 30000;

const DecoderCtor: typeof TextDecoder | undefined =
  typeof TextDecoder !== 'undefined' ? TextDecoder : (globalThis as unknown as { TextDecoder?: typeof TextDecoder })?.TextDecoder;

function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function mergeVariables(context: RunnerVariableContext | undefined): RunnerVariable[] {
  const globals = context?.globals ?? [];
  const env = context?.environment?.variables ?? [];
  const locals = context?.locals ?? [];
  return [...globals, ...env, ...locals].filter((variable) => variable.enabled !== false);
}

function resolveTemplate(template: string, context: RunnerVariableContext | undefined): string {
  if (!template.includes('{{')) {
    return template;
  }
  const variables = mergeVariables(context);
  return template.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (match, key) => {
    const variable = variables.find((entry) => entry.key === key);
    return variable ? variable.value : match;
  });
}

function applyAuthHeaders(
  auth: RunnerRequest['auth'] | undefined,
  headers: Map<string, string>,
  context: RunnerVariableContext | undefined
) {
  if (!auth || auth.type === 'none') {
    return;
  }
  if (auth.type === 'bearer' && auth.bearerToken) {
    const token = resolveTemplate(auth.bearerToken, context);
    headers.set('authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
  } else if (auth.type === 'basic' && auth.basic) {
    const username = resolveTemplate(auth.basic.username, context);
    const password = resolveTemplate(auth.basic.password, context);
    const token = typeof btoa === 'function' ? btoa(`${username}:${password}`) : Buffer.from(`${username}:${password}`).toString('base64');
    headers.set('authorization', `Basic ${token}`);
  } else if (auth.type === 'apiKey' && auth.apiKey) {
    const value = resolveTemplate(auth.apiKey.value, context);
    if (auth.apiKey.in === 'header') {
      headers.set(auth.apiKey.key.toLowerCase(), value);
    }
  } else if (auth.type === 'oauth2' && auth.oauth2?.accessToken) {
    const tokenType = auth.oauth2.tokenType ?? 'Bearer';
    const token = resolveTemplate(auth.oauth2.accessToken, context);
    headers.set('authorization', `${tokenType} ${token}`.trim());
  }
}

function buildHeaders(
  request: RunnerRequest,
  context: RunnerVariableContext | undefined
): Map<string, string> {
  const headers = new Map<string, string>();
  request.headers?.forEach((header) => {
    if (header.enabled === false || !header.key) return;
    const key = header.key.toLowerCase();
    const value = resolveTemplate(header.value ?? '', context);
    headers.set(key, value);
  });
  applyAuthHeaders(request.auth, headers, context);
  return headers;
}

function applyQueryParams(url: URL, params: RunnerRequest['params'], context: RunnerVariableContext | undefined) {
  params?.forEach((param) => {
    if (param.enabled === false || !param.key) return;
    url.searchParams.set(param.key, resolveTemplate(param.value ?? '', context));
  });
}

function appendApiKeyToQuery(url: URL, request: RunnerRequest, context: RunnerVariableContext | undefined) {
  if (request.auth?.type === 'apiKey' && request.auth.apiKey?.in === 'query') {
    url.searchParams.set(request.auth.apiKey.key, resolveTemplate(request.auth.apiKey.value ?? '', context));
  }
}

function hasExplicitPath(url: string) {
  const schemeMatch = url.match(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//);
  if (!schemeMatch) {
    return url.includes('/');
  }
  const rest = url.slice(schemeMatch[0].length);
  const slashIndex = rest.indexOf('/');
  return slashIndex !== -1;
}

function formatUrl(url: URL, originalHadPath: boolean) {
  const pathname = url.pathname === '/' && !originalHadPath ? '' : url.pathname;
  return `${url.protocol}//${url.host}${pathname}${url.search}${url.hash}`;
}

function buildBody(body: RunnerRequestBody | undefined, context: RunnerVariableContext | undefined): BodyInit | ArrayBuffer | null | undefined {
  if (!body || body.mode === 'none') return undefined;

  const fields = (items: RunnerRequestBody['formData']) =>
    (items ?? []).filter((item) => item.enabled !== false);

  switch (body.mode) {
    case 'json': {
      const source = body.json ?? '';
      const resolved = resolveTemplate(source, context);
      return resolved.trim();
    }
    case 'xml': {
      const source = body.xml ?? '';
      return resolveTemplate(source, context);
    }
    case 'raw': {
      const source = body.raw ?? '';
      return resolveTemplate(source, context);
    }
    case 'form-data':
    case 'multipart': {
      const form = new FormData();
      fields(body.formData ?? body.multipart).forEach((item) => {
        const key = resolveTemplate(item.key, context);
        const value = resolveTemplate(item.value ?? '', context);
        form.append(key, value);
      });
      return form;
    }
    case 'x-www-form-urlencoded': {
      const params = new URLSearchParams();
      fields(body.urlEncoded).forEach((item) => {
        const key = resolveTemplate(item.key, context);
        const value = resolveTemplate(item.value ?? '', context);
        params.append(key, value);
      });
      return params;
    }
    case 'binary': {
      if (body.raw) {
        const mime = body.mimeType ?? 'application/octet-stream';
        if (typeof Blob !== 'undefined') {
          return new Blob([body.raw], { type: mime });
        }
        if (typeof Buffer !== 'undefined') {
          return Buffer.from(body.raw);
        }
        return body.raw as unknown as BodyInit;
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

function cookiesFromHeaders(headers: Record<string, string>) {
  const headerValue = headers['set-cookie'];
  if (!headerValue) return [] as RunnerResponseSnapshot['cookies'];
  const cookieEntries = headerValue.split(/,(?=[^;]+?=)/g);
  return cookieEntries.map((entry) => {
    const [cookie, ...rest] = entry.split(';').map((part) => part.trim());
    const [key, value] = cookie.split('=');
    const attributes: Record<string, string> = {};
    rest.forEach((chunk) => {
      const [attrKey, attrValue] = chunk.split('=');
      attributes[attrKey.toLowerCase()] = attrValue ?? 'true';
    });
    return { key, value, attributes };
  });
}

function synthesiseTimeline(total: number, ttfb: number, download: number): RunnerTimelineEntry[] {
  const handshake = Math.max(total - (ttfb + download), 0);
  const dns = Math.max(handshake * 0.2, 1);
  const tcp = Math.max(handshake * 0.35, 1);
  const tls = Math.max(handshake - dns - tcp, 1);
  return [
    { phase: 'dns', duration: Math.round(dns) },
    { phase: 'tcp', duration: Math.round(tcp) },
    { phase: 'tls', duration: Math.round(tls) },
    { phase: 'ttfb', duration: Math.round(ttfb) },
    { phase: 'download', duration: Math.round(download) }
  ];
}

class TypedEmitter<Events extends Record<string, unknown>> {
  private listeners = new Map<keyof Events, Set<(payload: Events[keyof Events]) => void>>();

  on<EventName extends keyof Events>(event: EventName, listener: (payload: Events[EventName]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as (payload: Events[keyof Events]) => void);
    return () => this.off(event, listener);
  }

  off<EventName extends keyof Events>(event: EventName, listener: (payload: Events[EventName]) => void) {
    const listeners = this.listeners.get(event);
    listeners?.delete(listener as (payload: Events[keyof Events]) => void);
  }

  emit<EventName extends keyof Events>(event: EventName, payload: Events[EventName]) {
    const listeners = this.listeners.get(event);
    listeners?.forEach((listener) => {
      try {
        (listener as (payload: Events[EventName]) => void)(payload);
      } catch (error) {
        console.error('RequestRunner listener error', error);
      }
    });
  }
}

interface AbortBundle {
  signal: AbortSignal | undefined;
  dispose: () => void;
}

function withTimeout(timeoutMs: number | undefined, parent?: AbortSignal): AbortBundle {
  if (!timeoutMs && !parent) {
    return { signal: parent, dispose: () => {} };
  }
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  if (timeoutMs) {
    timeout = setTimeout(() => controller.abort(new Error('Request timed out')), timeoutMs);
  }
  const dispose = () => {
    if (timeout) clearTimeout(timeout);
    if (parent) {
      parent.removeEventListener('abort', abortListener);
    }
  };
  const abortListener = () => {
    controller.abort(parent?.reason);
  };
  if (parent) {
    parent.addEventListener('abort', abortListener, { once: true });
  }
  return { signal: controller.signal, dispose };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RequestRunner {
  private readonly platform: RequestRunnerOptions['platform'];
  private readonly historyLimit: number;
  private readonly storage?: RunnerHistoryStorage;
  private readonly fetchImpl: typeof fetch;
  private readonly emitter = new TypedEmitter<RequestRunnerEvents>();
  private history: RunnerHistoryEntry[] = [];
  private historyReady: Promise<void>;

  constructor(options: RequestRunnerOptions = {}) {
    this.platform = options.platform ?? 'web';
    this.historyLimit = options.historyLimit ?? 200;
    this.storage = options.historyStorage;
    this.fetchImpl = options.fetchImplementation ?? globalThis.fetch?.bind(globalThis) ?? fetch;
    this.historyReady = this.loadHistory();
  }

  private async loadHistory() {
    if (!this.storage) return;
    const snapshot = await this.storage.load();
    if (snapshot) {
      this.history = snapshot.slice(-this.historyLimit);
    }
  }

  async getHistory() {
    await this.historyReady;
    return this.history.slice();
  }

  prepare(request: RunnerRequest, context?: RunnerVariableContext): RunnerResolvedRequest {
    return this.buildResolvedRequest(request, context);
  }

  on<EventName extends keyof RequestRunnerEvents>(event: EventName, listener: (payload: RequestRunnerEvents[EventName]) => void) {
    return this.emitter.on(event, listener);
  }

  off<EventName extends keyof RequestRunnerEvents>(event: EventName, listener: (payload: RequestRunnerEvents[EventName]) => void) {
    this.emitter.off(event, listener);
  }

  private buildUrl(request: RunnerRequest, context: RunnerVariableContext | undefined): string {
    const resolvedUrl = resolveTemplate(request.url, context);
    const hadPath = hasExplicitPath(resolvedUrl);
    try {
      const url = new URL(resolvedUrl);
      applyQueryParams(url, request.params, context);
      appendApiKeyToQuery(url, request, context);
      return formatUrl(url, hadPath);
    } catch (error) {
      return resolvedUrl;
    }
  }

  private buildResolvedRequest(
    request: RunnerRequest,
    context: RunnerVariableContext | undefined
  ): RunnerResolvedRequest {
    const id = request.id ?? generateId();
    const headers = buildHeaders(request, context);
    const url = this.buildUrl(request, context);
    const body = buildBody(request.body, context);

    if (request.auth?.type === 'apiKey' && request.auth.apiKey?.in === 'query') {
      try {
        const urlObject = new URL(url);
        appendApiKeyToQuery(urlObject, request, context);
        return {
          id,
          method: request.method,
          url: formatUrl(urlObject, hasExplicitPath(url)),
          headers: Object.fromEntries(headers),
          body,
          rawBody: request.body
        };
      } catch (error) {
        // fallthrough to unresolved url
      }
    }

    return {
      id,
      method: request.method,
      url,
      headers: Object.fromEntries(headers),
      body,
      rawBody: request.body
    };
  }

  private recordHistory(entry: RunnerHistoryEntry) {
    this.history.push(entry);
    if (this.history.length > this.historyLimit) {
      this.history = this.history.slice(-this.historyLimit);
    }
    void this.storage?.save(this.history.slice());
    return entry;
  }

  private async runOnce(
    requestId: string,
    resolved: RunnerResolvedRequest,
    options: RunnerExecutionOptions
  ): Promise<RunnerResponseSnapshot> {
    const { signal, dispose } = withTimeout(options.timeoutMs ?? DEFAULT_TIMEOUT, options.signal);

    const init: RequestInit = {
      method: resolved.method,
      headers: resolved.headers
    };
    if (resolved.body !== undefined) {
      init.body = resolved.body as BodyInit;
    }

    try {
      const start = now();
      let firstByte = start;
      const response = await this.fetchImpl(resolved.url, { ...init, signal });
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      let receivedText = '';
      let receivedBytes = 0;

      if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        const Decoder = DecoderCtor ?? TextDecoder;
        const decoder = new Decoder();
        let done = false;
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) {
            firstByte = firstByte === start ? now() : firstByte;
            const chunk = decoder.decode(value, { stream: !done });
            receivedBytes += value.byteLength;
            receivedText += chunk;
            const progress: RunnerProgressEvent = {
              requestId,
              receivedBytes,
              chunk
            };
            if (headers['content-length']) {
              progress.totalBytes = Number.parseInt(headers['content-length'], 10);
            }
            this.emitter.emit('request:progress', progress);
          }
        }
        receivedText += decoder.decode();
      } else {
        const Decoder = DecoderCtor ?? TextDecoder;
        const buffer = await response.arrayBuffer();
        receivedBytes = buffer.byteLength;
        const decoder = new Decoder();
        receivedText = decoder.decode(buffer);
      }

      const end = now();
      const duration = end - start;
      const ttfb = Math.max(firstByte - start, 0);
      const download = Math.max(end - Math.max(firstByte, start), 0);
      const timeline = synthesiseTimeline(duration, ttfb, download);

      const snapshot: RunnerResponseSnapshot = {
        id: generateId(),
        status: response.status,
        statusText: response.statusText,
        method: resolved.method,
        url: resolved.url,
        duration: Math.round(duration),
        size: receivedBytes,
        headers,
        body: receivedText,
        cookies: cookiesFromHeaders(headers),
        timeline,
        completedAt: new Date().toISOString()
      };
      return snapshot;
    } finally {
      dispose();
    }
  }

  async run(request: RunnerRequest, options: RunnerExecutionOptions = {}) {
    await this.historyReady;
    const resolved = this.buildResolvedRequest(request, options.variableContext);
    const requestId = resolved.id;
    this.emitter.emit('request:start', { requestId, request: resolved });

    const retries = options.retries ?? 0;
    let attempt = 0;
    let lastError: Error | undefined;
    while (attempt <= retries) {
      try {
        const response = await this.runOnce(requestId, resolved, options);
        const historyEntry: RunnerHistoryEntry = {
          id: generateId(),
          requestId,
          method: resolved.method,
          url: resolved.url,
          status: response.status,
          duration: response.duration,
          executedAt: new Date().toISOString()
        };
        const recorded = this.recordHistory(historyEntry);
        const success: RunnerSuccessEvent = {
          requestId,
          request: resolved,
          response,
          history: recorded
        };
        this.emitter.emit('request:success', success);
        return success;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;
        const isAbort = err.name === 'AbortError';
        this.emitter.emit('request:error', { requestId, error: err });
        if (isAbort || attempt >= retries) {
          throw err;
        }
        attempt += 1;
        const delay = Math.min(1000 * 2 ** attempt, 5000);
        await sleep(delay);
      }
    }
    throw lastError ?? new Error('Request failed');
  }
}
