import { useState, useCallback, useMemo } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  offset: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  canNext: boolean;
  canPrev: boolean;
  totalPages: number;
  setTotal: (total: number) => void;
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const { initialPage = 1, initialPageSize = 20 } = options;
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize]);
  const canNext = page < totalPages;
  const canPrev = page > 1;

  const nextPage = useCallback(() => {
    if (canNext) setPage((p) => p + 1);
  }, [canNext]);

  const prevPage = useCallback(() => {
    if (canPrev) setPage((p) => p - 1);
  }, [canPrev]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1); // Reset to first page on size change
  }, []);

  return {
    page,
    pageSize,
    offset,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    canNext,
    canPrev,
    totalPages,
    setTotal,
  };
}
