import { request } from './client';

export interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export const getRecentLogs = async (limit = 20): Promise<LogEntry[]> => {
  return request<LogEntry[]>({
    url: '/api/logs/recent',
    method: 'GET',
    params: { limit }
  });
};

export const getRequestLogs = async (requestId: string): Promise<LogEntry[]> => {
  return request<LogEntry[]>({
    url: `/api/logs/request/${requestId}`,
    method: 'GET'
  });
};
