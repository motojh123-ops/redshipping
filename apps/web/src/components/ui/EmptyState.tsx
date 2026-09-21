import React from 'react';
import { Inbox, LucideIcon, Sparkles } from 'lucide-react';
import { AnimatedCaptainRed } from './AnimatedCaptainRed';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  showMascot?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  showMascot = true,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center select-none animate-in fade-in duration-300">
      {showMascot ? (
        <div className="relative mb-3">
          <AnimatedCaptainRed
            size="md"
            isWaving={true}
            interactive={true}
            showSpeechBubble={false}
            className="drop-shadow-lg"
          />
        </div>
      ) : (
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 shadow-sm">
          <Icon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
      )}

      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">{title}</h3>
      {description && (
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">{description}</p>
      )}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs md:text-sm font-bold shadow-lg shadow-red-600/25 transition-all transform active:scale-95 cursor-pointer border border-red-400/30"
        >
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
