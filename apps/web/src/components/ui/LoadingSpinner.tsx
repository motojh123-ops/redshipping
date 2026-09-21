import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  label?: string;
}

const SIZE_CLASSES = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  fullPage = false,
  label,
}) => {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${SIZE_CLASSES[size]} rounded-full border-slate-200 dark:border-slate-700 border-t-brand-600 dark:border-t-brand-400 animate-spin`}
      />
      {label && (
        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">{spinner}</div>
    );
  }

  return spinner;
};
