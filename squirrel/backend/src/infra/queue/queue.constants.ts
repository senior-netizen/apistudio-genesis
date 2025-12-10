export const QUEUES = {
  AI_GENERATE: 'ai.generate',
  SEARCH_INDEX: 'search.index',
  ANALYTICS_ROLLUP: 'analytics.rollup',
  WEBHOOK_DELIVER: 'webhook.deliver',
  MONITOR_EXECUTE: 'monitor.execute',
  RUN_EXECUTE: 'run.execute',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
