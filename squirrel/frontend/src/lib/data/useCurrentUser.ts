import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '../../services/data';
import type { CurrentUserProfile } from '../../types/auth';

interface UseCurrentUserResult {
  user: CurrentUserProfile | null;
  isOwner: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useCurrentUser(): UseCurrentUserResult {
  const query = useQuery({
    queryKey: ['current-user'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const user = useMemo(() => query.data ?? null, [query.data]);
  const isOwner = (user?.role ?? '').toLowerCase() === 'owner';

  return {
    user,
    isOwner,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
