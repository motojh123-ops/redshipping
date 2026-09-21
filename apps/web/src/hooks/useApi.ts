import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

interface UseApiOptions<T> {
  /** Initial data before fetch completes */
  initialData?: T;
  /** Set false to prevent auto-fetching on mount */
  immediate?: boolean;
}

interface UseApiReturn<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
}

/**
 * SWR-like data fetching hook with loading, error, and refetch.
 * 
 * @example
 * const { data, loading, error, refetch } = useApi<Shipment[]>('/shipments');
 * const { data, loading } = useApi<Shipment>(`/shipments/${id}`);
 */
export function useApi<T = any>(
  url: string | null,
  params?: Record<string, any>,
  options: UseApiOptions<T> = {},
): UseApiReturn<T> {
  const { initialData, immediate = true } = options;
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(!!immediate && !!url);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const cleanParams = params
        ? Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null),
          )
        : undefined;
      const response: any = await api.get(url, { params: cleanParams });
      if (mountedRef.current) {
        setData(response);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err?.message || 'حدث خطأ أثناء تحميل البيانات');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [url, JSON.stringify(params)]);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate && url) {
      fetchData();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData, immediate, url]);

  return { data, loading, error, refetch: fetchData, setData };
}
