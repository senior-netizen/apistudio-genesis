import { Injectable } from '@nestjs/common';
import { CacheService } from '../../infra/cache/cache.service';
import type { ScriptContext, ScriptExecutionResult } from './types';
import { ScriptContextBuilder } from './script-context.builder';

@Injectable()
export class ScriptExecutorService {
  constructor(private readonly cache: CacheService, private readonly contextBuilder: ScriptContextBuilder) {}

  async execute(script: string | undefined, request: any, response?: any): Promise<ScriptExecutionResult> {
    if (!script || !script.trim()) {
      return { success: true, tests: [], logs: [], updatedVariables: {} };
    }

    const context: ScriptContext = this.contextBuilder.build(request, response);
    const logs: string[] = [];
    const originalConsoleLog = console.log;
    console.log = (...args: any[]) => {
      logs.push(args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '));
      originalConsoleLog(...args);
    };

    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('pm', 'console', script);
      await Promise.resolve(fn(context.pm, context.console));
      return {
        success: true,
        tests: [],
        logs,
        updatedVariables: {}, // Variable mutation tracking can be added later
      };
    } catch (error) {
      return {
        success: false,
        tests: [],
        logs,
        updatedVariables: {},
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      console.log = originalConsoleLog;
    }
  }
}
