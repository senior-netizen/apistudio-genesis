export const parseNumber = (value: string | number | undefined, fallback: number) => {
  const num = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(num) ? (num as number) : fallback;
};
