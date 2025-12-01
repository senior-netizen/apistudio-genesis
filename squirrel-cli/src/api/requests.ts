import { request } from './client';

export interface RunnerRequest {
  id?: string;
  workspaceId?: string;
  name?: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface RunnerResponse {
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  body: unknown;
}

export const runSavedRequest = async (requestId: string): Promise<RunnerResponse> => {
  return request<RunnerResponse>({
    url: `/api/request/${requestId}/run`,
    method: 'POST'
  });
};

export const runAdhocRequest = async (payload: RunnerRequest): Promise<RunnerResponse> => {
  return request<RunnerResponse>({
    url: '/api/request/run',
    method: 'POST',
    data: payload
  });
};
