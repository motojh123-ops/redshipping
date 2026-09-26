import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2, Phone, Mail, MapPin, FileText, Users, Calendar,
  MessageSquare, PhoneCall, Globe, Clock, Plus, ArrowUpRight,
  CreditCard, Briefcase, Star, ChevronLeft, Shield, FileSpreadsheet, Ship,
  Bell, CheckCircle2, AlertCircle, Trash2, ArrowRight, UserCheck, Check
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const ClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: client, loading } = useApi<any>(`/clients/${id}`);
  const { user: authUser } = useAuthStore();
  const [c, setC] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'shipments' | 'financials' | 'contacts' | 'calls' | 'meetings' | 'reminders' | 'offers' | 'attachments'>('shipments');

  React.useEffect(() => {
    if (client) {
      // Map the real CRM activities persisted on the client into the tab views
      const acts: any[] = client.crmActivities || [];
      setC({
        ...client,
        contacts: client.contacts || [],
        shipments: client.shipments || [],
        invoices: client.invoices || [],
        offers: client.quotations || client.offers || [],
        calls: acts
          .filter((a) => a.activityType === 'call')
          .map((a) => ({
            id: a.id,
            date: String(a.completedAt || a.createdAt || '').replace('T', ' ').slice(0, 16),
            contact: a.subject || '—',
            duration: '—',
            user: a.user?.name || '—',
            summary: a.body || '',
          })),
        meetings: acts
          .filter((a) => a.activityType === 'meeting')
          .map((a) => ({
            id: a.id,
            date: String(a.completedAt || a.scheduledAt || a.createdAt || '').slice(0, 10),
            location: a.subject || '—',
            attendees: a.body || '—',
            user: a.user?.name || '—',
            notes: a.body || '',
          })),
        reminders: acts
          .filter((a) => a.activityType === 'note' && !a.completedAt)
          .map((a) => ({
            id: a.id,
            dueDate: String(a.scheduledAt || a.createdAt || '').slice(0, 10),
            title: a.subject || a.body || 'متابعة',
            priority: 'medium',
            completed: false,
            assignedTo: a.user?.name || '—',
          })),
        attachments: client.attachments || [],
      });
    }
  }, [client]);

  // Modal states
  const [showLogModal, setShowLogModal] = useState(false);
  const [logType, setLogType] = useState<'call' | 'meeting' | 'reminder'>('call');
  const [logForm, setLogForm] = useState({ title: '', notes: '', date: '', contact: '', priority: 'medium' });
  const [convertedToast, setConvertedToast] = useState(false);

  if (loading) return <LoadingSpinner fullPage label="جاري تحميل بيانات العميل من قاعدة البيانات..." />;

  if (!c) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] shadow-sm">
        <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">العميل غير موجود</h2>
        <p className="text-sm text-slate-400 mb-6">لم يتم العثور على سجل العميل في قاعدة البيانات الحالية.</p>
        <Link to="/clients" className="px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm transition">
          العودة لقائمة العملاء
        </Link>
      </div>
    );
  }

  const tabs = [
    { key: 'shipments', label: `الشحنات (${c.shipments?.length || 0})`, icon: Ship },
    { key: 'financials', label: 'الماليات والحد الائتماني', icon: CreditCard },
    { key: 'contacts', label: `جهات الاتصال (${c.contacts?.length || 0})`, icon: Users },
    { key: 'offers', label: `عروض الأسعار (${c.offers?.length || 0})`, icon: FileSpreadsheet },
    { key: 'calls', label: `المكالمات (${c.calls?.length || 0})`, icon: PhoneCall },
    { key: 'meetings', label: `الاجتماعات (${c.meetings?.length || 0})`, icon: Calendar },
    { key: 'reminders', label: `المتابعات (${c.reminders?.filter((r: any) => !r.completed).length || 0})`, icon: Bell },
    { key: 'attachments', label: `الوثائق والتراخيص (${c.attachments?.length || 0})`, icon: FileText },
  ];

  const [savingLog, setSavingLog] = useState(false);

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingLog) return;

    const when = logForm.date ? new Date(logForm.date) : new Date();
    const whenIso = when.toISOString();

    setSavingLog(true);
    try {
      // Persist the activity on the client through the real API (CrmActivity row)
      const created: any = await api.post(`/clients/${id}/activities`, {
        activityType: logType === 'reminder' ? 'note' : logType,
        subject:
          logType === 'reminder'
            ? logForm.title || logForm.notes || 'متابعة'
            : logForm.contact || logForm.title || '—',
        body: logForm.notes,
        scheduledAt: whenIso,
        completedAt: logType === 'reminder' ? null : whenIso,
      });

      const userName = created?.user?.name || authUser?.name || '—';
      if (logType === 'call') {
        setC((prev: any) => ({
          ...prev,
          calls: [
            {
              id: created.id,
              date: whenIso.replace('T', ' ').slice(0, 16),
              contact: logForm.contact || prev?.contacts?.[0]?.name || '—',
              duration: '—',
              user: userName,
              summary: logForm.notes,
            },
            ...(prev?.calls || []),
          ],
        }));
      } else if (logType === 'meeting') {
        setC((prev: any) => ({
          ...prev,
          meetings: [
            {
              id: created.id,
              date: whenIso.slice(0, 10),
              location: logForm.title || '—',
              attendees: logForm.contact || '—',
              user: userName,
              notes: logForm.notes,
            },
            ...(prev?.meetings || []),
          ],
        }));
      } else {
        setC((prev: any) => ({
          ...prev,
          reminders: [
            {
              id: created.id,
              dueDate: whenIso.slice(0, 10),
              title: logForm.title || logForm.notes || 'متابعة',
              priority: logForm.priority,
              completed: false,
              assignedTo: userName,
            },
            ...(prev?.reminders || []),
          ],
        }));
      }
      setShowLogModal(false);
      setLogForm({ title: '', notes: '', date: '', contact: '', priority: 'medium' });
    } catch (err: any) {
      alert(err?.message || 'تعذر حفظ النشاط على الخادم — حاول مجدداً');
    } finally {
      setSavingLog(false);
    }
  };

  const toggleReminder = (rId: string) => {
    setC({
      ...c,
      reminders: c.reminders.map((r: any) =>
        r.id === rId ? { ...r, completed: !r.completed } : r,
      ),
    });
  };

  const handleConvertToActual = () => {
    setC({ ...c, clientCategory: 'actual', status: 'active' });
    setConvertedToast(true);
    setTimeout(() => setConvertedToast(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {convertedToast && (
        <div className="p-4 rounded-xl bg-emerald-500 text-white flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold text-sm">تم تحويل العميل بنجاح إلى "عميل فعلي" وفتح كامل سجلاته في الحسابات والعمليات!</span>
          </div>
        </div>
      )}

      <PageHeader
        title={c.name}
        subtitle={c.nameAr}
        breadcrumbs={[
          { label: 'العملاء', to: '/clients' },
          { label: c.name },
        ]}
        actions={
          <div className="flex items-center gap-3">
            {c.clientCategory === 'lead' ? (
              <button
                onClick={handleConvertToActual}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition"
              >
                <UserCheck className="w-4 h-4" />
                تحويل إلى عميل فعلي (Convert)
              </button>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-700">
                عميل فعلي معتمد ✅
              </span>
            )}
            <StatusBadge status={c.type} />
            <StatusBadge status={c.status} />
          </div>
        }
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Content & Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* KPI Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard title="إجمالي الشحنات" value={c.totalShipments} icon={Briefcase} iconColor="text-brand-600" iconBg="bg-brand-50 dark:bg-brand-950/50" />
            <StatCard title="إجمالي الإيرادات" value={`${(c.totalRevenue / 1000).toFixed(0)}K EGP`} icon={CreditCard} iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-950/50" />
            <StatCard title="عروض نشطة" value={c.activeQuotations} icon={FileSpreadsheet} iconColor="text-amber-600" iconBg="bg-amber-50 dark:bg-amber-950/50" />
            <StatCard title="حد الائتمان" value={`${(c.creditLimit / 1000).toFixed(0)}K`} icon={Shield} iconColor="text-purple-600" iconBg="bg-purple-50 dark:bg-purple-950/50" />
          </div>

          {/* Tab Navigation */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                    activeTab === tab.key
                      ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-brand-50/20 dark:bg-brand-950/20'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* TAB: Live & Past Shipments */}
              {activeTab === 'shipments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-medium text-slate-500">كافة الشحنات الملاحية والبرية المرتبطة بالعميل</span>
                    <Link
                      to="/shipments"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5E1E] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      فتح ملف شحنة جديد
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {c.shipments?.map((shp: any) => (
                      <div key={shp.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-[#FF5E1E]">{shp.jobNo}</span>
                            <span className="text-xs text-slate-400 font-mono">• B/L: {shp.blNumber}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {shp.type}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {shp.pol} ➔ {shp.pod}
                          </p>
                          <div className="flex items-center gap-4 text-[11px] text-slate-400">
                            <span>الخط الملاحي: {shp.line}</span>
                            <span>رقم الحاوية: {shp.containerNo}</span>
                            <span>موعد الوصول ETA: {shp.eta}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={shp.status} />
                          <Link
                            to={`/shipments/${shp.id}`}
                            className="p-2 rounded-lg text-slate-400 hover:text-[#FF5E1E] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="عرض تفاصيل الشحنة"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: Financials & Statements */}
              {activeTab === 'financials' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">كشف الحساب والفواتير الصادرة</span>
                      <span className="text-[11px] text-slate-400">تسهيل ائتماني معتمد {c.paymentTerms} بحد أقصى {c.creditLimit.toLocaleString()} ج.م</span>
                    </div>
                    <Link
                      to="/statement-of-account"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      استخراج كشف حساب رسمي (SOA)
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/30">
                      <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 block">إجمالي الفواتير المصدرة</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono mt-1 block">505,000 ج.م</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block">إجمالي المسدد والمحصل</span>
                      <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">340,000 ج.م</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/30">
                      <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 block">المديونية المتبقية المستحقة</span>
                      <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-1 block">{c.outstandingBalance.toLocaleString()} ج.م</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {c.invoices?.map((inv: any) => (
                      <div key={inv.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</span>
                            <StatusBadge status={inv.status} />
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">تاريخ الاستحقاق: {inv.dueDate}</span>
                        </div>

                        <div className="text-end">
                          <span className="text-xs font-bold font-mono text-slate-900 dark:text-white block">
                            {inv.amount.toLocaleString()} ج.م
                          </span>
                          <span className="text-[10px] text-slate-400">
                            متبقي: {inv.remaining.toLocaleString()} ج.م
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 1: Contacts */}
              {activeTab === 'contacts' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-medium text-slate-500">مسؤولي التواصل وصناع القرار</span>
                    <button
                      onClick={() => {
                        setLogType('call');
                        setShowLogModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-semibold transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة جهة اتصال
                    </button>
                  </div>

                  {c.contacts?.map((contact: any) => (
                    <div key={contact.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {contact.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{contact.name}</h4>
                          {contact.isDecisionMaker && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                              <Star className="w-3 h-3" />صانع قرار
                            </span>
                          )}
                          {contact.isPrimary && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">رئيسي</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{contact.title}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" /><span dir="ltr">{contact.phone}</span></span>
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: Phone Calls Log */}
              {activeTab === 'calls' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-medium text-slate-500">سجل الاتصالات والمكالمات البيعية والتشغيلية</span>
                    <button
                      onClick={() => {
                        setLogType('call');
                        setShowLogModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      تسجيل مكالمة هاتفية
                    </button>
                  </div>

                  {c.calls?.map((call: any) => (
                    <div key={call.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
                            <PhoneCall className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{call.contact}</span>
                          <span className="text-[11px] text-slate-400">({call.duration})</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{call.date}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed ps-9">{call.summary}</p>
                      <span className="block text-[10px] text-slate-400 ps-9">مسؤول الاتصال: {call.user}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: Meetings & Visits */}
              {activeTab === 'meetings' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-medium text-slate-500">سجل المقابلات الميدانية وجلسات التفاوض</span>
                    <button
                      onClick={() => {
                        setLogType('meeting');
                        setShowLogModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      تسجيل اجتماع جديد
                    </button>
                  </div>

                  {c.meetings?.map((meeting: any) => (
                    <div key={meeting.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{meeting.location}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{meeting.date}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed ps-9">{meeting.notes}</p>
                      <div className="flex items-center gap-4 text-[10px] text-slate-400 ps-9">
                        <span>الحضور: {meeting.attendees}</span>
                        <span>ممثل بنا: {meeting.user}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: Reminders */}
              {activeTab === 'reminders' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-medium text-slate-500">مواعيد المتابعة وتذكيرات المهام</span>
                    <button
                      onClick={() => {
                        setLogType('reminder');
                        setShowLogModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm transition"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      إضافة تذكير
                    </button>
                  </div>

                  {c.reminders?.map((reminder: any) => (
                    <div
                      key={reminder.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                        reminder.completed
                          ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60'
                          : 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/50 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleReminder(reminder.id)}
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition ${
                            reminder.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500'
                          }`}
                        >
                          {reminder.completed && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <div>
                          <p className={`text-xs font-semibold ${reminder.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                            {reminder.title}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3" />
                              تاريخ الاستحقاق: {reminder.dueDate}
                            </span>
                            <span>المسؤول: {reminder.assignedTo}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          reminder.priority === 'high'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {reminder.priority === 'high' ? 'عالية الأهمية' : 'عادية'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 5: Offers & Quotations History */}
              {activeTab === 'offers' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-medium text-slate-500">عروض الأسعار التاريخية المقدمة للعميل</span>
                    <Link
                      to="/quotations"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إنشاء عرض سعر جديد
                    </Link>
                  </div>

                  <div className="space-y-2">
                    {c.offers?.map((offer: any) => (
                      <div key={offer.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-brand-600 dark:text-brand-400">{offer.quoteNumber}</span>
                            <span className="text-xs text-slate-700 dark:text-slate-200 font-medium">({offer.service})</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{offer.origin} ➔ {offer.destination}</p>
                          <span className="text-[10px] text-slate-400 block font-mono">صالح حتى: {offer.validUntil}</span>
                        </div>

                        <div className="text-end space-y-1">
                          <span className="text-xs font-bold font-mono text-slate-900 dark:text-white block">
                            {offer.totalAmount.toLocaleString()} {offer.currency}
                          </span>
                          <StatusBadge status={offer.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: Attachments & Document Expiry */}
              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-medium text-slate-500">المستندات الرسمية وتواريخ انتهاء الصلاحية</span>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 transition">
                      <Plus className="w-3.5 h-3.5" />
                      رفع وثيقة جديدة
                    </button>
                  </div>

                  <div className="space-y-3">
                    {c.attachments?.map((att: any) => {
                      const expDate = new Date(att.expiresAt);
                      const daysLeft = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const isExpired = daysLeft <= 0;
                      const isExpiringSoon = daysLeft > 0 && daysLeft <= 60;

                      return (
                        <div key={att.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900 dark:text-white text-xs">{att.name}</h4>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                                <span>{att.size}</span>
                                <span className={`flex items-center gap-1 font-mono ${
                                  isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-amber-600 font-bold' : 'text-slate-500'
                                }`}>
                                  <Calendar className="w-3 h-3" />
                                  تاريخ الانتهاء: {att.expiresAt}
                                  {isExpired && ' (منتهية الصلاحية ❌)'}
                                  {isExpiringSoon && ` (متبقي ${daysLeft} يوم ⚠️)`}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar — Company Details & Credit Gauge */}
        <div className="space-y-4">
          {/* Credit Limit & Financial Health Gauge */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" />
                <span>الحد الائتماني والمديونية</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                Net 30
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">المستهلك: 280,000 ج.م</span>
                <span className="font-bold text-slate-900 dark:text-white">500,000 ج.م</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-[#FF5E1E] rounded-full" style={{ width: '56%' }} />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>المتاح: 220,000 ج.م (44%)</span>
                <span>الاستهلاك: 56%</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">المديونية المستحقة حالياً:</span>
              <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono">165,000 ج.م</span>
            </div>

            <Link
              to="/statement-of-account"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-bold transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>استخراج كشف حساب رسمي (SOA)</span>
            </Link>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">بيانات الشركة والتصنيف</h3>
            <div className="space-y-3 text-xs">
              <InfoRow icon={Building2} label="الاسم التجاري" value={c.nameAr} />
              <InfoRow icon={CreditCard} label="البطاقة الضريبية" value={c.taxCardNumber} mono />
              <InfoRow icon={FileText} label="السجل التجاري" value={c.commercialRegister} mono />
              <InfoRow icon={Users} label="مسؤول المبيعات المباشر" value={c.salesPerson} />
              <InfoRow icon={Mail} label="البريد الإلكتروني" value={c.email} />
              <InfoRow icon={Phone} label="الهاتف" value={c.phone} dir="ltr" />
              <InfoRow icon={MapPin} label="العنوان الجغرافي" value={c.address} />
              <InfoRow icon={Globe} label="الموقع الإلكتروني" value={c.website} />
              <InfoRow icon={CreditCard} label="شروط السداد" value={c.paymentTerms} />
              <InfoRow icon={Calendar} label="تاريخ التسجيل بالمنظومة" value={c.createdAt} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">إجراءات سريعة</h3>
            <div className="space-y-2 text-xs">
              <Link to="/quotations" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-slate-700 dark:text-slate-200 font-medium">
                <FileSpreadsheet className="w-4 h-4 text-brand-500" />
                إنشاء عرض سعر مخصص
              </Link>
              <Link to="/shipments" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-slate-700 dark:text-slate-200 font-medium">
                <Ship className="w-4 h-4 text-emerald-500" />
                فتح ملف شحنة جديدة
              </Link>
              <button
                onClick={() => window.open(`https://wa.me/201001234567?text=${encodeURIComponent('مرحباً أستاذ أحمد، بخصوص شحنتكم القادمة عبر بنا اللوجستية...')}`)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-slate-700 dark:text-slate-200 font-medium"
              >
                <MessageSquare className="w-4 h-4 text-green-500" />
                مراسلة العميل عبر WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Log Activity / Meeting / Reminder Modal */}
      {showLogModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowLogModal(false)}
          title={
            logType === 'call'
              ? 'تسجيل مكالمة هاتفية مع العميل'
              : logType === 'meeting'
              ? 'تسجيل اجتماع أو زيارة ميدانية'
              : 'إضافة تذكير ومتابعة للعميل'
          }
        >
          <form onSubmit={handleSaveLog} className="space-y-4 text-xs">
            {logType === 'meeting' && (
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">مكان الاجتماع</label>
                <input
                  type="text"
                  placeholder="مثال: مقر مصنع العميل بمدينة بدر"
                  value={logForm.title}
                  onChange={(e) => setLogForm({ ...logForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            )}

            {logType === 'reminder' && (
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">موضوع التذكير *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: متابعة سداد الفاتورة أو تأكيد موافقة العرض"
                  value={logForm.title}
                  onChange={(e) => setLogForm({ ...logForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {logType === 'call' ? 'الشخص الذي تم الاتصال به' : logType === 'meeting' ? 'الحضور من طرف العميل' : 'جهة الاتصال المرتبطة'}
              </label>
              <select
                value={logForm.contact}
                onChange={(e) => setLogForm({ ...logForm, contact: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {c.contacts?.map((ct: any) => (
                  <option key={ct.id} value={ct.name}>{ct.name} — {ct.title}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">التاريخ والوقت</label>
                <input
                  type="datetime-local"
                  value={logForm.date}
                  onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              {logType === 'reminder' && (
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">درجة الأهمية</label>
                  <select
                    value={logForm.priority}
                    onChange={(e) => setLogForm({ ...logForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="high">عالية جداً (High)</option>
                    <option value="medium">متوسطة (Medium)</option>
                    <option value="low">منخفضة (Low)</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">الملخص والملاحظات</label>
              <textarea
                rows={3}
                required
                placeholder="أهم النقاط التي تمت مناقشتها والخطوات القادمة..."
                value={logForm.notes}
                onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-md shadow-brand-600/20 transition"
              >
                حفظ السجل
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

const InfoRow: React.FC<{ icon: React.FC<any>; label: string; value: string; mono?: boolean; dir?: string }> = ({
  icon: Icon, label, value, mono, dir,
}) => (
  <div className="flex items-start gap-3 py-1.5">
    <Icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
    <div className="min-w-0 flex-1">
      <span className="text-[11px] text-slate-400 block">{label}</span>
      <span className={`text-xs text-slate-700 dark:text-slate-200 ${mono ? 'font-mono' : ''}`} dir={dir}>{value}</span>
    </div>
  </div>
);
