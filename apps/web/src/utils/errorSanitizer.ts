const SECRET_PATTERNS = [
  /bearer\s+[a-z0-9._-]+/gi,
  /token=\S+/gi,
  /authorization:\s*\S+/gi,
  /set-cookie:[^\n]+/gi,
  /cookie:[^\n]+/gi,
  /api[_-]?key\s*[:=]\s*\S+/gi,
];

function stripSecrets(value: string): string {
  let cleaned = value;
  SECRET_PATTERNS.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, '[redacted]');
  });
  return cleaned;
}

export function sanitizeErrorMessage(input: unknown, maxLength = 320): string {
  if (input === null || input === undefined) return '';
  if (typeof input === 'string') {
    const cleaned = stripSecrets(input).replace(/\s+/g, ' ').trim();
    return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned;
  }
  if (input instanceof Error) {
    return sanitizeErrorMessage(input.message, maxLength);
  }
  if (typeof input === 'object') {
    try {
      const json = JSON.stringify(input, (_key, value) => {
        if (typeof value === 'string') {
          return stripSecrets(value);
        }
        return value;
      });
      return sanitizeErrorMessage(json, maxLength);
    } catch (error) {
      return 'An unexpected error occurred.';
    }
  }
  return sanitizeErrorMessage(String(input), maxLength);
}
