import React from 'react';
import { TrendingUp, LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  iconColor?: string;
  iconBg?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  trendDirection = 'up',
  subtitle,
  iconColor = 'text-[#FF5E1E]',
  iconBg = 'bg-orange-500/10',
}) => {
  const trendColors = {
    up: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    down: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
    neutral: 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#1E2536] border-slate-200 dark:border-slate-700',
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] shadow-sm hover:border-[#FF5E1E]/40 hover:shadow-md transition-all duration-200 flex items-center justify-between group">
      <div className="min-w-0 flex-1">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block truncate uppercase tracking-wider">
          {title}
        </span>
        <span className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 block tracking-tight">
          {value}
        </span>
        {trend && (
          <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-bold border ${trendColors[trendDirection]}`}>
            <TrendingUp className={`w-3 h-3 ${trendDirection === 'down' ? 'rotate-180' : ''}`} />
            {trend}
          </span>
        )}
        {subtitle && !trend && (
          <span className="text-xs text-slate-400 block mt-1">{subtitle}</span>
        )}
      </div>
      <div className={`w-12 h-12 rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};
