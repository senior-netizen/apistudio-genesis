import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAnnouncements } from '../../services/data';
import type { ProductAnnouncement } from '../../types/announcements';

export function useProductAnnouncements() {
  const query = useQuery({
    queryKey: ['product-announcements'],
    queryFn: fetchAnnouncements,
    staleTime: 1000 * 60 * 10,
  });

  const primaryAnnouncement = useMemo<ProductAnnouncement | null>(() => {
    if (Array.isArray(query.data) && query.data.length > 0) {
      return query.data[0];
    }
    return null;
  }, [query.data]);

  return {
    announcement: primaryAnnouncement,
    announcements: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
