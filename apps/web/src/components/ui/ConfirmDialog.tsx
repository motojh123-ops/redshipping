import React, { useState } from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Trash2, Info, LucideIcon } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: LucideIcon;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'danger',
  icon: Icon,
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Error handled by caller
    } finally {
      setLoading(false);
    }
  };

  const DefaultIcon = variant === 'danger' ? Trash2 : variant === 'warning' ? AlertTriangle : Info;
  const ActiveIcon = Icon || DefaultIcon;

  const variantClasses = {
    danger: {
      iconBg: 'bg-red-100 dark:bg-red-950/50',
      iconColor: 'text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-500 shadow-red-600/20',
    },
    warning: {
      iconBg: 'bg-amber-100 dark:bg-amber-950/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20',
    },
    info: {
      iconBg: 'bg-blue-100 dark:bg-blue-950/50',
      iconColor: 'text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20',
    },
  };

  const v = variantClasses[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="flex flex-col items-center text-center py-4">
        <div className={`w-14 h-14 rounded-2xl ${v.iconBg} flex items-center justify-center mb-4`}>
          <ActiveIcon className={`w-7 h-7 ${v.iconColor}`} />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 max-w-xs">{message}</p>
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl ${v.button} text-white text-sm font-semibold shadow-md transition disabled:opacity-50`}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
