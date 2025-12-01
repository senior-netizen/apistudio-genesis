export interface Expectation {
  field: string;
  operator: string;
  value: string;
}

export function parseExpectation(expectation: string): Expectation | undefined {
  const match = expectation.match(/^(\w+)(=|!=|>=|<=|>|<)(.+)$/);
  if (!match) return undefined;
  return { field: match[1], operator: match[2], value: match[3] };
}

export function evaluateStatusExpectation(status: number, expectation: Expectation): boolean {
  if (expectation.field !== 'status') return true;
  const expected = Number(expectation.value);
  switch (expectation.operator) {
    case '=':
      return status === expected;
    case '!=':
      return status !== expected;
    case '>':
      return status > expected;
    case '<':
      return status < expected;
    case '>=':
      return status >= expected;
    case '<=':
      return status <= expected;
    default:
      return true;
  }
}
