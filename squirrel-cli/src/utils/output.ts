export const printJson = (payload: unknown): void => {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}
`);
};

export const maybePrintJson = (enabled: boolean | undefined, payload: unknown): boolean => {
  if (!enabled) {
    return false;
  }
  printJson(payload);
  return true;
};
