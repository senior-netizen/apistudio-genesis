export const JSON_SCHEMA_VERSION = '2026-02-14';

interface JsonErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

interface JsonEnvelope<T> {
  schemaVersion: string;
  ok: boolean;
  data?: T;
  error?: JsonErrorPayload;
}

export const printJson = (payload: unknown): void => {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}
`);
};

export const printJsonSuccess = <T>(data: T): void => {
  const envelope: JsonEnvelope<T> = {
    schemaVersion: JSON_SCHEMA_VERSION,
    ok: true,
    data,
  };
  printJson(envelope);
};

export const printJsonError = (code: string, message: string, details?: unknown): void => {
  const envelope: JsonEnvelope<never> = {
    schemaVersion: JSON_SCHEMA_VERSION,
    ok: false,
    error: { code, message, details },
  };
  printJson(envelope);
};

export const maybePrintJsonSuccess = <T>(enabled: boolean | undefined, data: T): boolean => {
  if (!enabled) {
    return false;
  }
  printJsonSuccess(data);
  return true;
};

export const maybePrintJsonError = (
  enabled: boolean | undefined,
  code: string,
  message: string,
  details?: unknown,
): boolean => {
  if (!enabled) {
    return false;
  }
  printJsonError(code, message, details);
export const maybePrintJson = (enabled: boolean | undefined, payload: unknown): boolean => {
  if (!enabled) {
    return false;
  }
  printJson(payload);
  return true;
};
