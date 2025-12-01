import { request } from './client';

export interface QueueHealth {
  status: 'ok' | 'error';
  queueCount: number;
  jobCounts: {
    waiting: number;
    active: number;
    delayed: number;
    completed: number;
    failed: number;
  };
  failedJobs: number;
}

export const getQueueHealth = async (): Promise<QueueHealth> =>
  request<QueueHealth>({ url: '/queues/health', method: 'GET' });
