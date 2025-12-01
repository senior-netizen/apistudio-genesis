import type { ResponseSnapshot } from '../../types/api';

type Expectation = {
  actual: unknown;
  toBe: (expected: unknown) => void;
};

function createExpectation(actual: unknown, results: TestResult[]): Expectation {
  return {
    actual,
    toBe(expected: unknown) {
      const pass = Object.is(actual, expected);
      results.push({
        assertion: `expect(${JSON.stringify(actual)}).toBe(${JSON.stringify(expected)})`,
        pass,
        message: pass ? undefined : `Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`
      });
    }
  };
}

export interface TestResult {
  assertion: string;
  pass: boolean;
  message?: string;
}

export interface ScriptOutcome {
  logs: string[];
  results: TestResult[];
  error?: string;
}

interface ScriptContext {
  request: RequestInit & { url: string };
  response?: ResponseSnapshot;
}

export async function runSandboxedScript(
  code: string,
  context: ScriptContext,
  _stage: 'pre-request' | 'test'
): Promise<ScriptOutcome> {
  if (!code.trim()) {
    return { logs: [], results: [] };
  }

  const logs: string[] = [];
  const results: TestResult[] = [];

  const sandboxPm = {
    request: context.request,
    response: {
      json: () => {
        if (!context.response) return undefined;
        try {
          return JSON.parse(context.response.body);
        } catch (error) {
          logs.push(`Failed to parse JSON: ${(error as Error).message}`);
          return undefined;
        }
      },
      header: (name: string) => context.response?.headers[name.toLowerCase()],
      text: () => context.response?.body
    },
    expect: (actual: unknown) => createExpectation(actual, results)
  };

  const consoleLike = {
    log: (...args: unknown[]) => {
      logs.push(args.map((value) => (typeof value === 'string' ? value : JSON.stringify(value))).join(' '));
    }
  };

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('pm', 'console', `${code}`);
    await Promise.resolve(fn(sandboxPm, consoleLike));
    return { logs, results };
  } catch (error) {
    return { logs, results, error: (error as Error).message };
  }
}
