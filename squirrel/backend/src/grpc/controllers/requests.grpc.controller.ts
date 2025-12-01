import { Controller, UseGuards } from '@nestjs/common';
import { RequestsService } from '../../modules/requests/requests.service';
import {
  CreateHttpRequestRequest,
  GetHistoryRequest,
  GetRequest,
  HistoryResponse,
  RequestsServiceController,
  RequestsServiceControllerMethods,
  RunRequest,
  RunResponse,
  StreamRunEvent,
  StreamRunRequest,
  UpdateHttpRequestRequest,
} from '../generated/requests';
import { HttpRequest, HttpRun } from '../generated/common';
import { GrpcJwtGuard } from '../guards/grpc-jwt.guard';
import { getUserFromMetadata } from '../utils/grpc-user.util';
import { Metadata } from '@grpc/grpc-js';
import { Observable, Subscriber } from 'rxjs';
import { randomUUID } from 'crypto';
import { isIP } from 'net';

@Controller()
@UseGuards(GrpcJwtGuard)
@RequestsServiceControllerMethods()
export class RequestsGrpcController implements RequestsServiceController {
  private static readonly MAX_BYTES = parseInt(process.env.WORKER_MAX_RESPONSE_BYTES || '1048576', 10);
  private static readonly TIMEOUT_MS = parseInt(process.env.WORKER_FETCH_TIMEOUT_MS || '5000', 10);

  constructor(private readonly requests: RequestsService) {}

  async create(request: CreateHttpRequestRequest, metadata?: Metadata): Promise<HttpRequest> {
    const user = getUserFromMetadata(metadata);
    const created = await this.requests.create(request.collectionId ?? '', user?.id ?? '', {
      name: request.name ?? 'Untitled request',
      method: request.method ?? 'GET',
      url: request.url ?? '',
      headers: request.headers ?? {},
      body: this.parseJson(request.body),
    });
    return this.mapHttpRequest(created);
  }

  async update(request: UpdateHttpRequestRequest, metadata?: Metadata): Promise<HttpRequest> {
    const user = getUserFromMetadata(metadata);
    const updated = await this.requests.update(request.requestId ?? '', user?.id ?? '', {
      name: request.name,
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: this.parseJson(request.body),
      collectionId: request.collectionId,
    } as any);
    return this.mapHttpRequest(updated);
  }

  async get(request: GetRequest, metadata?: Metadata): Promise<HttpRequest> {
    const _user = getUserFromMetadata(metadata);
    const found = await this.requests.findById(request.requestId ?? '');
    return this.mapHttpRequest(found);
  }

  async run(request: RunRequest, metadata?: Metadata): Promise<RunResponse> {
    const user = getUserFromMetadata(metadata);
    const result = await this.requests.run(request.requestId ?? '', user?.id ?? '');
    return { runId: result.runId, status: 'QUEUED' };
  }

  async history(request: GetHistoryRequest, metadata?: Metadata): Promise<HistoryResponse> {
    const user = getUserFromMetadata(metadata);
    const result = await this.requests.history(
      request.requestId ?? '',
      user?.id ?? '',
      request.page ?? 1,
      request.pageSize ?? 20,
    );
    return {
      items: (result.items ?? []).map((item: any) => ({
        runId: item.id ?? item.runId,
        status: item.status,
        responseCode: item.responseCode,
        responseBody: item.responseBody,
        durationMs: item.durationMs,
        error: item.error,
      })) as HttpRun[],
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  streamRun(requestStream: Observable<StreamRunRequest>, metadata?: Metadata): Observable<StreamRunEvent> {
    const user = getUserFromMetadata(metadata);
    return new Observable<StreamRunEvent>((subscriber) => {
      let handled = false;
      const subscription = requestStream.subscribe({
        next: async (message) => {
          if (handled) return;
          if (message.cancel) {
            subscriber.next({
              runId: message.requestId ?? '',
              phase: 'CANCELLED',
              responseCode: 0,
              responseBody: '',
              durationMs: 0,
              error: '',
              terminal: true,
            });
            subscriber.complete();
            handled = true;
            return;
          }
          handled = true;
          if (message.requestId) {
            const run = await this.requests.run(message.requestId, user?.id ?? '');
            subscriber.next({
              runId: run.runId,
              phase: 'QUEUED',
              responseCode: 0,
              responseBody: '',
              durationMs: 0,
              error: '',
              terminal: true,
            });
            subscriber.complete();
            return;
          }
          const runId = randomUUID();
          subscriber.next({
            runId,
            phase: 'RUNNING',
            responseCode: 0,
            responseBody: '',
            durationMs: 0,
            error: '',
            terminal: false,
          });
          try {
            const response = await this.executeAdhoc(message);
            subscriber.next({
              runId,
              phase: 'COMPLETED',
              responseCode: response.status,
              responseBody: response.body,
              durationMs: response.duration,
              error: '',
              terminal: true,
            });
            subscriber.complete();
          } catch (error) {
            subscriber.next({
              runId,
              phase: 'FAILED',
              responseCode: 0,
              responseBody: '',
              durationMs: 0,
              error: error instanceof Error ? error.message : String(error),
              terminal: true,
            });
            subscriber.complete();
          }
        },
        error: (err) => {
          subscriber.error(err);
        },
      });
      return () => subscription.unsubscribe();
    });
  }

  private parseJson(body?: string) {
    if (!body) return undefined;
    try {
      return JSON.parse(body);
    } catch (_err) {
      return body;
    }
  }

  private mapHttpRequest(req: any): HttpRequest {
    return {
      id: req.id,
      name: req.name,
      method: req.method,
      url: req.url,
      headers: req.headers as Record<string, string>,
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? ''),
      collectionId: req.collectionId,
      createdAt: req.createdAt?.toISOString?.(),
      updatedAt: req.updatedAt?.toISOString?.(),
    };
  }

  private async executeAdhoc(message: StreamRunRequest) {
    const url = new URL(message.url ?? '');
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Unsupported protocol');
    }
    if (this.isBlockedHost(url.hostname)) {
      throw new Error('Blocked host');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RequestsGrpcController.TIMEOUT_MS);
    const started = Date.now();
    try {
      const response = await fetch(url, {
        method: message.method ?? 'GET',
        headers: message.headers ?? {},
        body: message.body,
        signal: controller.signal,
        redirect: 'manual',
      });
      const text = await response.text();
      if (text.length > RequestsGrpcController.MAX_BYTES) {
        throw new Error('Response too large');
      }
      return { status: response.status, body: text, duration: Date.now() - started };
    } finally {
      clearTimeout(timeout);
    }
  }

  private isBlockedHost(host: string): boolean {
    const lower = host.toLowerCase();
    if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local')) return true;
    const ipVersion = isIP(lower);
    if (ipVersion === 4) return this.isPrivateIpv4(lower);
    if (ipVersion === 6) {
      return lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd');
    }
    return false;
  }

  private isPrivateIpv4(ip: string): boolean {
    const parts = ip.split('.').map((x) => parseInt(x, 10));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
    return false;
  }
}
