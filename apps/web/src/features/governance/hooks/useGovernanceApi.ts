import axios, { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useGovernanceGet<T>(url: string, enabled = true): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<T>(url);
      setData(response.data);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? axiosError.message);
    } finally {
      setLoading(false);
    }
  }, [enabled, url]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({ data, loading, error, refresh }),
    [data, error, loading, refresh],
  );
}

export function useGovernanceMutation<TPayload, TResult>(
  request: (payload: TPayload) => Promise<TResult>,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (payload: TPayload) => {
      setLoading(true);
      setError(null);
      try {
        const result = await request(payload);
        return result;
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        setError(axiosError.response?.data?.message ?? axiosError.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [request],
  );

  return { mutate, loading, error };
}
