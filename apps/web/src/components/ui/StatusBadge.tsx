import React from 'react';

type BadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'brand';

interface StatusBadgeProps {
  status: string;
  className?: string;
  showDot?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  // Shipment stages
  booking_confirmed: { label: 'تأكيد الحجز', variant: 'info' },
  cargo_received: { label: 'استلام البضاعة', variant: 'brand' },
  customs_submitted: { label: 'إيداع المستندات جمركياً', variant: 'warning' },
  acid_issued: { label: 'صدور نافذة (ACID)', variant: 'warning' },
  in_transit: { label: 'في البحر (In Transit)', variant: 'brand' },
  arrived_destination: { label: 'وصول الميناء', variant: 'info' },
  clearance_in_progress: { label: 'قيد التخليص الجمركي', variant: 'warning' },
  release_issued: { label: 'إفراج جمركي صادر', variant: 'success' },
  out_for_delivery: { label: 'خارج للتسليم', variant: 'brand' },
  delivered: { label: 'تم التسليم', variant: 'success' },
  closed: { label: 'مغلق ومسوى', variant: 'neutral' },

  // Customs stages
  document_review: { label: 'مراجعة المستندات', variant: 'info' },
  inspection: { label: 'الكشف والتثمين', variant: 'warning' },
  assessment: { label: 'التقييم الجمركي', variant: 'brand' },
  duty_payment: { label: 'سداد الرسوم', variant: 'warning' },
  released_cert46: { label: 'الإفراج - شهادة 46', variant: 'success' },

  // Quotation statuses
  draft: { label: 'مسودة', variant: 'neutral' },
  sent: { label: 'مُرسل للعميل', variant: 'info' },
  negotiation: { label: 'قيد التفاوض', variant: 'warning' },
  won: { label: 'مقبول (Won)', variant: 'success' },
  lost: { label: 'مرفوض', variant: 'danger' },
  expired: { label: 'منتهي الصلاحية', variant: 'neutral' },

  // Invoice statuses
  pending: { label: 'قيد المراجعة', variant: 'warning' },
  issued: { label: 'صادرة', variant: 'info' },
  partially_paid: { label: 'مدفوع جزئياً', variant: 'warning' },
  paid: { label: 'مدفوعة بالكامل', variant: 'success' },
  overdue: { label: 'متأخرة السداد', variant: 'danger' },
  cancelled: { label: 'ملغاة', variant: 'danger' },

  // Client types
  manufacturer: { label: 'مصنع منتج', variant: 'brand' },
  distributor: { label: 'موزع معتمد', variant: 'info' },
  trader: { label: 'شركة تجارية', variant: 'warning' },
  customs_broker: { label: 'مخلص جمركي', variant: 'success' },
  overseas_agent: { label: 'وكيل خارجي', variant: 'neutral' },

  // Generic
  active: { label: 'نشط', variant: 'success' },
  inactive: { label: 'غير نشط', variant: 'neutral' },
};

const VARIANT_CONFIG: Record<BadgeVariant, { pill: string; dot: string }> = {
  info: {
    pill: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
    dot: 'bg-sky-500',
  },
  success: {
    pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  warning: {
    pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    dot: 'bg-amber-500',
  },
  danger: {
    pill: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    dot: 'bg-rose-500',
  },
  neutral: {
    pill: 'bg-slate-100 dark:bg-[#1E2536] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
  brand: {
    pill: 'bg-orange-500/10 text-[#FF5E1E] dark:text-[#FF7A3D] border border-orange-500/25',
    dot: 'bg-[#FF5E1E]',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', showDot = true }) => {
  const config = STATUS_CONFIG[status] || { label: status, variant: 'neutral' as BadgeVariant };
  const styling = VARIANT_CONFIG[config.variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-tight transition-colors ${styling.pill} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${styling.dot}`} />}
      {config.label}
    </span>
  );
};
