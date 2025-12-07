import { useMemo } from 'react';

export function useI18n() {
  return useMemo(() => ({
    t: (key: string) => key,
  }), []);
}
