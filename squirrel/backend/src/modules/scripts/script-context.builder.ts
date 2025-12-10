import { Injectable } from '@nestjs/common';
import type { ScriptContext, RequestData, ResponseData } from './types';

@Injectable()
export class ScriptContextBuilder {
  build(request: RequestData, response?: ResponseData): ScriptContext {
    const variables = new Map<string, any>();

    const variableApi = {
      get: (key: string) => variables.get(key),
      set: (key: string, value: any) => void variables.set(key, value),
      unset: (key: string) => void variables.delete(key),
      has: (key: string) => variables.has(key),
      clear: () => void variables.clear(),
    };

    const environmentApi = {
      ...variableApi,
    };

    const tests: Array<{ name: string; passed: boolean; error?: string }> = [];

    const test = (name: string, fn: () => void) => {
      try {
        fn();
        tests.push({ name, passed: true });
      } catch (error) {
        tests.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) });
      }
    };

    return {
      pm: {
        environment: environmentApi,
        variables: variableApi,
        request,
        response,
        test,
        expect: (value: any) => value as unknown as any,
      },
      console,
    };
  }
}
