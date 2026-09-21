import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';
import { SearchInput } from './SearchInput';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  pageSize?: number;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  toolbarActions?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  searchable = true,
  searchPlaceholder = 'بحث...',
  searchFilter,
  emptyTitle = 'لا توجد بيانات',
  emptyDescription = 'لم يتم العثور على أي نتائج لعرضها.',
  onRowClick,
  pageSize = 10,
  selectable = false,
  selectedIds = [],
  onSelectRow,
  onSelectAll,
  toolbarActions,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    if (searchFilter) {
      return data.filter((item) => searchFilter(item, searchQuery));
    }
    // Default search across string and number fields
    return data.filter((item: any) =>
      Object.values(item).some((val) =>
        String(val ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [data, searchQuery, searchFilter]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredData, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortKey(null);
        setSortDir('asc');
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const isAllSelected =
    paginatedData.length > 0 &&
    paginatedData.every((item) => selectedIds.includes(keyExtractor(item)));

  const handleToggleSelectAll = () => {
    if (!onSelectAll) return;
    if (isAllSelected) {
      onSelectAll(selectedIds.filter((id) => !paginatedData.some((item) => keyExtractor(item) === id)));
    } else {
      const newIds = Array.from(
        new Set([...selectedIds, ...paginatedData.map((item) => keyExtractor(item))])
      );
      onSelectAll(newIds);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {(searchable || toolbarActions) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {searchable ? (
            <div className="w-full sm:w-80">
              <SearchInput
                value={searchQuery}
                onChange={(val) => {
                  setSearchQuery(val);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
              />
            </div>
          ) : (
            <div />
          )}
          {toolbarActions && <div className="flex items-center gap-2">{toolbarActions}</div>}
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white dark:bg-[#181D2A] rounded-2xl border border-slate-200 dark:border-[#262E40] shadow-sm overflow-hidden transition-colors duration-200">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <LoadingSpinner size="lg" label="جاري تحميل البيانات..." />
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="py-16">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-slate-50/80 dark:bg-[#121620] text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-[#262E40]">
                <tr>
                  {selectable && (
                    <th className="py-3.5 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 dark:border-slate-700 text-[#FF5E1E] focus:ring-[#FF5E1E]"
                      />
                    </th>
                  )}
                  {columns.map((col) => {
                    const isSorted = sortKey === col.key;
                    const alignClass =
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'end'
                        ? 'text-end'
                        : 'text-start';

                    return (
                      <th
                        key={col.key}
                        className={`py-3.5 px-4 ${alignClass} ${col.className || ''} ${
                          col.sortable ? 'cursor-pointer select-none hover:text-slate-900 dark:hover:text-white' : ''
                        }`}
                        onClick={() => col.sortable && handleSort(col.key)}
                      >
                        <div className={`inline-flex items-center gap-1.5 ${col.align === 'end' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                          <span>{col.header}</span>
                          {col.sortable && (
                            <span className="text-slate-400">
                              {isSorted ? (
                                sortDir === 'asc' ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-[#FF5E1E]" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-[#FF5E1E]" />
                                )
                              ) : (
                                <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#262E40]/60">
                {paginatedData.map((item) => {
                  const id = keyExtractor(item);
                  const isSelected = selectedIds.includes(id);

                  return (
                    <tr
                      key={id}
                      onClick={() => onRowClick && onRowClick(item)}
                      className={`transition-colors ${
                        onRowClick ? 'cursor-pointer' : ''
                      } ${
                        isSelected
                          ? 'bg-orange-500/10 dark:bg-orange-500/15'
                          : 'hover:bg-slate-50/80 dark:hover:bg-[#1E2536]/50'
                      }`}
                    >
                      {selectable && (
                        <td
                          className="py-3.5 px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onSelectRow && onSelectRow(id)}
                            className="rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500"
                          />
                        </td>
                      )}
                      {columns.map((col) => {
                        const alignClass =
                          col.align === 'center'
                            ? 'text-center'
                            : col.align === 'end'
                            ? 'text-end'
                            : 'text-start';

                        return (
                          <td key={col.key} className={`py-3.5 px-4 ${alignClass} ${col.className || ''}`}>
                            {col.render ? col.render(item) : (item as any)[col.key] ?? '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && sortedData.length > pageSize && (
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-[#262E40] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-[#121620]/60">
            <div>
              عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, sortedData.length)} من إجمالي {sortedData.length} سجل
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-[#262E40] bg-white dark:bg-[#181D2A] disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-[#22293A] hover:text-[#FF5E1E] transition"
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
              </button>
              <div className="px-3 font-semibold text-slate-700 dark:text-slate-200">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-[#262E40] bg-white dark:bg-[#181D2A] disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-[#22293A] hover:text-[#FF5E1E] transition"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
