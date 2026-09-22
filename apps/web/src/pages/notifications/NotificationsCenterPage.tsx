import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Ship,
  FileSpreadsheet,
  ShieldCheck,
  Receipt,
  AlertTriangle,
  Calendar,
  Users,
  Settings,
  MessageSquare,
  Clock,
  Filter,
  Trash2,
  Eye,
  Package,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

interface Notification {
  id: string;
  type: 'shipment' | 'quotation' | 'customs' | 'invoice' | 'reminder' | 'system' | 'assignment' | 'alert';
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  createdAt: string;
  timeAgo: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

const typeIcon = (type: string) => {
  switch (type) {
    case 'shipment': return <Ship className="w-4 h-4" />;
    case 'quotation': return <FileSpreadsheet className="w-4 h-4" />;
    case 'customs': return <ShieldCheck className="w-4 h-4" />;
    case 'invoice': return <Receipt className="w-4 h-4" />;
    case 'reminder': return <Calendar className="w-4 h-4" />;
    case 'assignment': return <Users className="w-4 h-4" />;
    case 'alert': return <AlertTriangle className="w-4 h-4" />;
    case 'system': return <Settings className="w-4 h-4" />;
    default: return <Bell className="w-4 h-4" />;
  }
};

const typeColor = (type: string) => {
  switch (type) {
    case 'shipment': return 'text-sky-600 bg-sky-100 dark:text-sky-300 dark:bg-sky-900/50';
    case 'quotation': return 'text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/50';
    case 'customs': return 'text-purple-600 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/50';
    case 'invoice': return 'text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/50';
    case 'reminder': return 'text-indigo-600 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/50';
    case 'assignment': return 'text-brand-600 bg-brand-100 dark:text-brand-300 dark:bg-brand-900/50';
    case 'alert': return 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/50';
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
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/notifications')
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.data && Array.isArray(res.data) ? res.data : [];
        setNotifications(list.map((n: any) => ({
          id: n.id,
          type: n.type || 'system',
          title: n.title || '',
          body: n.message || n.body || '',
          link: n.link || '/',
          isRead: !!n.isRead,
          createdAt: n.createdAt || '',
          timeAgo: n.timeAgo || '',
          priority: n.severity === 'critical' ? 'critical' : n.severity === 'warning' ? 'high' : 'normal',
        })));
        setIsLiveConnected(true);
      })
      .catch(() => {
        setIsLiveConnected(false);
        setNotifications([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = notifications.filter((n) => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (filterRead === 'unread' && n.isRead) return false;
    if (filterRead === 'read' && !n.isRead) return false;
    return true;
  });

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
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
              <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">{unreadCount}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">مركز الإشعارات</h1>
            <p className="text-sm text-slate-500">{unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'لا توجد إشعارات جديدة'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition">
              <CheckCheck className="w-4 h-4" /> قراءة الكل
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'shipment', label: '🚢 شحنات' },
            { key: 'customs', label: '🛃 جمارك' },
            { key: 'invoice', label: '💰 فواتير' },
            { key: 'quotation', label: '📋 عروض أسعار' },
            { key: 'reminder', label: '📅 تذكيرات' },
            { key: 'alert', label: '⚠️ تنبيهات' },
          ].map((ft) => (
            <button key={ft.key} onClick={() => setFilterType(ft.key)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition ${filterType === ft.key ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {ft.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={filterRead} onChange={(e) => setFilterRead(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
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
            {filtered.map((notif) => (
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
                    <h4 className={`text-xs font-semibold leading-snug ${!notif.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{notif.title}</h4>
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
                      onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-brand-600 transition"
                      title="تحديد كمقروء"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </button>
            ))}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BellOff className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-500">لا توجد إشعارات</p>
                <p className="text-xs text-slate-400 mt-1">سيتم عرض الإشعارات الجديدة هنا تلقائياً</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
