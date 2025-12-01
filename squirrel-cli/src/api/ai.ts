import { request } from './client';

export interface AiAdviceRequest {
  requestId?: string;
  fromFile?: string;
  payload?: unknown;
}

export interface AiAdviceResponse {
  summary: string;
  suggestions: string[];
  warnings?: string[];
}

export interface AiComposeResponse {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  description?: string;
}

export const requestAdvice = async (payload: AiAdviceRequest): Promise<AiAdviceResponse> => {
  return request<AiAdviceResponse>({
    url: '/api/ai/advisor',
    method: 'POST',
    data: payload
  });
};

export const composeRequest = async (prompt: string): Promise<AiComposeResponse> => {
  return request<AiComposeResponse>({
    url: '/api/ai/composer',
    method: 'POST',
    data: { prompt }
  });
};
