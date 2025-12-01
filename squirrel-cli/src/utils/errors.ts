export class CliError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'CliError';
  }
}

export class UnauthorizedError extends CliError {
  constructor(message = 'Not logged in. Run `squirrel login`.') {
    super(message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends CliError {
  constructor(message = 'Your plan does not allow this action.') {
    super(message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}
