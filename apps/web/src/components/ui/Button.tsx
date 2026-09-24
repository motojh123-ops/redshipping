import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const base =
  'inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-200 outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-[#FF5E1E]/60 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0B0E14] ' +
  'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none';

const variants = {
  primary:
    'bg-gradient-to-r from-[#FF5E1E] to-[#EA580C] text-white shadow-md shadow-orange-500/25 hover:from-[#FF7034] hover:to-[#F97316] hover:shadow-lg hover:shadow-orange-500/30',
  secondary:
    'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100',
  outline:
    'border border-slate-200 dark:border-[#262E40] bg-white dark:bg-[#181D2A] text-slate-700 dark:text-slate-200 hover:border-[#FF5E1E]/50 hover:text-[#FF5E1E] shadow-sm',
  ghost:
    'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E2638] hover:text-slate-900 dark:hover:text-white',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/25 focus-visible:ring-rose-500/60',
} as const;

const sizes = {
  xs: 'text-[11px] px-2.5 py-1.5',
  sm: 'text-xs px-3.5 py-2',
  md: 'text-xs px-5 py-2.5',
  lg: 'text-sm px-6 py-3',
  icon: 'w-9 h-9 p-0',
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  /** Icon shown before the label (start side in RTL/LTR) */
  startIcon?: React.ReactNode;
  /** Icon shown after the label (end side in RTL/LTR) */
  endIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  startIcon,
  endIcon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        startIcon
      )}
      {children}
      {!loading && endIcon}
    </button>
  );
};
