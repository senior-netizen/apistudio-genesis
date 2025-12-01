import { Observable } from 'rxjs';

export type AiTaskType =
  | 'advisor'
  | 'composer'
  | 'tests'
  | 'env-helper'
  | 'optimizer';

export interface AiCompletionPayload {
  task: AiTaskType;
  input: string;
  context?: Record<string, unknown>;
}

export interface AiCompletionResult {
  provider: string;
  model?: string;
  output: string;
  metadata?: Record<string, unknown>;
}

export interface AiProvider {
  readonly name: string;
  readonly supportsStreaming?: boolean;
  generateCompletion(
    payload: AiCompletionPayload,
  ): Promise<AiCompletionResult> | Observable<AiCompletionResult>;
}
