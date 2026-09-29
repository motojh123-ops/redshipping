import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Ship,
  ShieldCheck,
  Receipt,
  Settings,
  Clock,
  AlertTriangle,
  AlertOctagon,
  FileText,
  Truck,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

interface Notification {
  id: string;
  type: 'shipment' | 'customs' | 'invoice' | 'demurrage' | 'system' | 'alarm';
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  createdAt: string;
  timeAgo: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface ExpiryAlert {
  type: 'vendor_commercial_reg' | 'vendor_tax_card' | 'driver_license';
  entityType: 'vendor' | 'driver';
  entityId: string;
  entityName: string;
  labelAr: string;
  labelEn: string;
  reference?: string | null;
  expiryDate: string;
  daysRemaining: number;
  level: 'expired' | 'critical' | 'warning' | 'notice' | 'ok';
  extra?: string;
}

/* Relative time in Arabic, computed client-side (API sends ISO createdAt only) */
const formatTimeAgo = (iso: string): string => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(iso).toLocaleDateString('ar-EG');
};

const typeIcon = (type: string) => {
  switch (type) {
    case 'shipment': return <Ship className="w-4 h-4" />;
    case 'customs': return <ShieldCheck className="w-4 h-4" />;
    case 'invoice': return <Receipt className="w-4 h-4" />;
    case 'demurrage': return <Clock className="w-4 h-4" />;
    case 'alarm': return <AlertTriangle className="w-4 h-4" />;
    case 'system': return <Settings className="w-4 h-4" />;
    default: return <Bell className="w-4 h-4" />;
  }
};

const typeColor = (type: string) => {
  switch (type) {
    case 'shipment': return 'text-sky-600 bg-sky-100 dark:text-sky-300 dark:bg-sky-900/50';
    case 'customs': return 'text-purple-600 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/50';
    case 'invoice': return 'text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/50';
    case 'demurrage': return 'text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/50';
    case 'alarm': return 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/50';
    case 'system': return 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800';
    default: return 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800';
  }
};

const priorityDot = (p: string) => {
  switch (p) {
    case 'critical': return 'bg-red-500 animate-pulse';
    case 'high': return 'bg-amber-500';
    case 'normal': return 'bg-sky-500';
    case 'low': return 'bg-slate-400';
    default: return 'bg-slate-400';
  }
};

export const NotificationsCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [alarmFilter, setAlarmFilter] = useState<'all' | 'expired' | 'critical' | 'warning'>('all');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/notifications').catch(() => []),
      api.get('/masters/expiry-alerts').catch(() => []),
    ])
      .then(([notifRes, alertsRes]: any[]) => {
        const notifList = Array.isArray(notifRes)
          ? notifRes
          : notifRes?.data && Array.isArray(notifRes.data)
          ? notifRes.data
          : [];
        setNotifications(
          notifList.map((n: any) => ({
            id: n.id,
            type: n.type || 'system',
            title: n.title || '',
            body: n.message || n.body || '',
            link: n.link || '/',
            isRead: !!n.isRead,
            createdAt: n.createdAt || '',
            timeAgo: formatTimeAgo(n.createdAt || ''),
            priority: n.severity === 'critical' ? 'critical' : n.severity === 'warning' ? 'high' : 'normal',
          }))
        );

        const alertsList = Array.isArray(alertsRes) ? alertsRes : [];
        setExpiryAlerts(alertsList);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const expiredCount = expiryAlerts.filter((a) => a.level === 'expired').length;
  const criticalCount = expiryAlerts.filter((a) => a.level === 'critical').length;
  const warningCount = expiryAlerts.filter((a) => a.level === 'warning').length;

  const filteredAlerts = expiryAlerts.filter((a) => {
    if (alarmFilter === 'all') return true;
    return a.level === alarmFilter;
  });

  const filteredNotifications = notifications.filter((n) => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (filterRead === 'unread' && n.isRead) return false;
    if (filterRead === 'read' && !n.isRead) return false;
    return true;
  });

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    api.patch(`/notifications/${id}/read`).catch(() => {});
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    api.patch('/notifications/read-all').catch(() => {});
  };

  const handleClick = (notif: Notification) => {
    markAsRead(notif.id);
    navigate(notif.link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-600/20">
              <Bell className="w-6 h-6" />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">مركز الإشعارات والإنذارات المبكرة</h1>
            <p className="text-sm text-slate-500">
              متابعة حركة الشحنات، الفواتير، وإنذارات انتهاء التراخيص والسجلات التجارية
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition"
            >
              <CheckCheck className="w-4 h-4" /> قراءة الكل
            </button>
          )}
        </div>
      </div>

      {/* ── EXPIRY ALERTS FEED (محرك إنذارات المرجعيات والتراخيص) ── */}
      {expiryAlerts.length > 0 && (
        <div className="rounded-3xl border border-red-200/80 dark:border-red-950/60 bg-gradient-to-br from-red-50/70 via-orange-50/40 to-white dark:from-red-950/20 dark:via-orange-950/10 dark:to-[#12161F] p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-100 dark:border-red-950/50 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/30 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>إنذارات التراخيص والوثائق الرسمية (Alarms Engine)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300">
                    {expiryAlerts.length} إنذار
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  مراقبة آلية لسريان السجلات التجارية والبطاقات الضريبية للموردين ورخص قيادة السائقين
                </p>
              </div>
            </div>

            {/* Alarm Counters & Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setAlarmFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                  alarmFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                الكل ({expiryAlerts.length})
              </button>
              {expiredCount > 0 && (
                <button
                  onClick={() => setAlarmFilter('expired')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                    alarmFilter === 'expired'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                  }`}
                >
                  <AlertOctagon className="w-3 h-3" />
                  منتهية ({expiredCount})
                </button>
              )}
              {criticalCount > 0 && (
                <button
                  onClick={() => setAlarmFilter('critical')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                    alarmFilter === 'critical'
                      ? 'bg-orange-600 text-white'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  حرج &lt; 15 يوم ({criticalCount})
                </button>
              )}
              {warningCount > 0 && (
                <button
                  onClick={() => setAlarmFilter('warning')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                    alarmFilter === 'warning'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  تحذير &lt; 30 يوم ({warningCount})
                </button>
              )}
            </div>
          </div>

          {/* Alarm Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredAlerts.map((al, idx) => {
              const isExpired = al.level === 'expired';
              const isCritical = al.level === 'critical';
              const targetRoute = al.entityType === 'driver' ? '/masters/drivers' : '/masters/vendors';

              return (
                <div
                  key={`${al.type}-${al.entityId}-${idx}`}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isExpired
                      ? 'bg-red-50/90 dark:bg-red-950/30 border-red-300 dark:border-red-900/60 shadow-sm'
                      : isCritical
                      ? 'bg-orange-50/80 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/40'
                      : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/90 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 shadow-2xs">
                        {al.entityType === 'driver' ? (
                          <>
                            <Truck className="w-3 h-3 text-brand-600" /> سائق
                          </>
                        ) : (
                          <>
                            <FileText className="w-3 h-3 text-sky-600" /> مورد
                          </>
                        )}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isExpired
                            ? 'bg-red-600 text-white animate-pulse'
                            : isCritical
                            ? 'bg-orange-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {isExpired
                          ? `منتهي منذ ${Math.abs(al.daysRemaining)} يوم`
                          : `متبقي ${al.daysRemaining} يوم`}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                      {al.entityName}
                    </h4>

                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {al.labelAr}
                      {al.reference && (
                        <span className="text-slate-400 font-mono ms-1 text-[10px]">
                          (رقم: {al.reference})
                        </span>
                      )}
                    </p>

                    {al.extra && (
                      <p className="text-[10px] text-slate-400 font-mono">
                        لوحة الشاحنة: {al.extra}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[10px]">
                    <span className="text-slate-500 font-mono">
                      تاريخ الانتهاء: {String(al.expiryDate).slice(0, 10)}
                    </span>
                    <button
                      onClick={() => navigate(targetRoute)}
                      className="inline-flex items-center gap-1 font-bold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      <span>تحديث البيانات</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'shipment', label: '🚢 شحنات' },
            { key: 'customs', label: '🛃 جمارك' },
            { key: 'invoice', label: '💰 فواتير' },
            { key: 'demurrage', label: '⏰ غرامات التأخير' },
            { key: 'system', label: '⚙️ النظام' },
          ].map((ft) => (
            <button
              key={ft.key}
              onClick={() => setFilterType(ft.key)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition ${
                filterType === ft.key
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {ft.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterRead}
            onChange={(e) => setFilterRead(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
          >
            <option value="all">الكل</option>
            <option value="unread">غير مقروء فقط</option>
            <option value="read">مقروء فقط</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-semibold text-slate-500">جاري تحميل الإشعارات...</p>
          </div>
        ) : (
          <>
            {filteredNotifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`w-full text-start flex items-start gap-3 p-4 rounded-2xl border transition-all group hover:shadow-md ${
                  !notif.isRead
                    ? 'bg-brand-50/30 dark:bg-brand-950/10 border-brand-200/60 dark:border-brand-800/40 hover:bg-brand-50/50 dark:hover:bg-brand-950/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${typeColor(notif.type)}`}>
                  {typeIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {!notif.isRead && <span className={`w-2 h-2 rounded-full shrink-0 ${priorityDot(notif.priority)}`} />}
                    <h4
                      className={`text-xs font-semibold leading-snug ${
                        !notif.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {notif.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{notif.body}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] text-slate-400">{notif.timeAgo}</span>
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-[10px] text-slate-400">{notif.createdAt}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  {!notif.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notif.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-brand-600 transition"
                      title="تحديد كمقروء"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </button>
            ))}

            {filteredNotifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BellOff className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-500">لا توجد إشعارات حالياً</p>
                <p className="text-xs text-slate-400 mt-1">سيتم عرض الإشعارات الجديدة هنا تلقائياً</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

