import React from 'react';

/* ─── Base Skeleton Block ─── */
export const Skeleton: React.FC<{
  className?: string;
  style?: React.CSSProperties;
}> = ({ className = '', style }) => (
  <div
    aria-hidden="true"
    className={`animate-shimmer rounded-lg bg-slate-200/80 dark:bg-[#1E2638] ${className}`}
    style={style}
  />
);

/* ─── Stat/KPI Card Skeleton ─── */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`rounded-2xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] p-5 shadow-sm ${className}`}
  >
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="w-10 h-10 rounded-2xl" />
    </div>
    <Skeleton className="h-8 w-20 mb-2" />
    <Skeleton className="h-2.5 w-32" />
  </div>
);

/* ─── Text Lines Skeleton ─── */
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-2 ${className}`} aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);

/* ─── List Item Skeleton (avatar + two lines) ─── */
export const SkeletonListItem: React.FC = () => (
  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#121620] border border-slate-200/80 dark:border-[#262E40]">
    <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-2.5 w-3/4" />
    </div>
  </div>
);

/* ─── Table Skeleton (header row + body rows) ─── */
export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 5,
}) => (
  <div className="space-y-3" aria-hidden="true">
    <div className="flex gap-4 pb-2 border-b border-slate-200/80 dark:border-[#262E40]">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4 items-center">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton
            key={c}
            className={`h-3.5 flex-1 ${c === 0 ? 'max-w-[120px]' : ''}`}
            style={{ animationDelay: `${(r * cols + c) % 5 * 100}ms` }}
          />
        ))}
      </div>
    ))}
  </div>
);
