import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2, Phone, Mail, MapPin, FileText, Users, Calendar,
  MessageSquare, PhoneCall, Globe, Clock, Plus, ArrowUpRight,
  CreditCard, Briefcase, Star, ChevronLeft, Shield, FileSpreadsheet, Ship,
  Bell, CheckCircle2, AlertCircle, Trash2, ArrowRight, Check, Pencil
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { NewOfferModal } from './NewOfferModal';
import { DocsSection, ActiveClientProfileModal, computeClientCompliance } from '../masters/ClientsMasterPage';

export const ClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: client, loading, refetch } = useApi<any>(`/clients/${id}`);
  const { user: authUser } = useAuthStore();
  const [c, setC] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'shipments' | 'financials' | 'contacts' | 'branches' | 'calls' | 'meetings' | 'reminders' | 'offers' | 'attachments'>('shipments');
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Modal states (MUST be declared before any conditional early return!)
  const [showLogModal, setShowLogModal] = useState(false);
  const [logType, setLogType] = useState<'call' | 'meeting' | 'reminder'>('call');
  const [logForm, setLogForm] = useState({ title: '', notes: '', date: '', contact: '', priority: 'medium' });
  const [convertedToast] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);

  React.useEffect(() => {
    if (client) {
      // Map the real CRM activities persisted on the client into the tab views
      const acts: any[] = client.crmActivities || [];
      const rawShipments: any[] = client.shipments || [];
      const rawInvoices: any[] = client.invoices || [];
      const mappedInvoices = rawInvoices.map((inv: any) => {
        const rate =
          Number(inv.exchangeRate || 1) > 1
            ? Number(inv.exchangeRate)
            : inv.currency === 'USD'
            ? 50
            : 1;
        const rawTotal = Number(inv.total ?? inv.amount ?? 0);
        const amountEgp = Math.round(rawTotal * rate);
        const paidEgp =
          inv.status === 'paid'
            ? amountEgp
            : inv.status === 'partially_paid'
            ? Math.round(amountEgp * 0.5)
            : 0;
        const remainingEgp = inv.status === 'cancelled' ? 0 : Math.max(0, amountEgp - paidEgp);
        return {
          ...inv,
          amount: amountEgp,
          rawTotal,
          currency: inv.currency || 'EGP',
          paid: paidEgp,
          remaining: remainingEgp,
          dueDate: inv.dueDate ? String(inv.dueDate).slice(0, 10) : '—',
          issueDate: inv.issueDate ? String(inv.issueDate).slice(0, 10) : String(inv.createdAt || '').slice(0, 10),
          jobNo: inv.shipment?.jobFileNumber || null,
        };
      });
      const activeInvoices = mappedInvoices.filter((i) => i.status !== 'cancelled');
      const calcRevenue =
        client.totalRevenue !== undefined
          ? Number(client.totalRevenue)
          : activeInvoices.reduce((s, i) => s + i.amount, 0);
      const calcPaid =
        client.totalPaid !== undefined
          ? Number(client.totalPaid)
          : activeInvoices.reduce((s, i) => s + i.paid, 0);
      const calcOutstanding =
        client.outstandingBalance !== undefined
          ? Number(client.outstandingBalance)
          : Math.max(0, calcRevenue - calcPaid);

      setC({
        ...client,
        nameAr: client.nameAr || client.tradeName || '',
        salesPerson: client.salesRep?.name || client.salesPerson || '—',
        createdAt: client.createdAt ? String(client.createdAt).slice(0, 10) : '—',
        creditLimit: Number(client.creditLimit || 500000),
        paymentTerms: client.paymentTerms || 'Net 30',
        totalRevenue: calcRevenue,
        totalPaid: calcPaid,
        outstandingBalance: calcOutstanding,
        contacts: client.contacts || [],
        branches: client.branches || [],
        entityDocuments: client.entityDocuments || [],
        shipments: rawShipments.map((s: any) => ({
          ...s,
          jobNo: s.jobFileNumber || s.jobNo || '—',
          type: String(s.shipmentType || s.type || 'FCL').toUpperCase(),
          status: s.currentStage || s.status || 'in_transit',
          pol: s.originPort?.nameEn || s.pol || s.vesselName || '—',
          pod: s.destinationPort?.nameEn || s.pod || s.voyageNumber || '—',
          line: s.shippingLine?.nameEn || s.shippingLine?.name || s.vesselName || s.line || '—',
          containerNo: s.cargoDescription || s.containerNo || '—',
          eta: s.eta ? String(s.eta).slice(0, 10) : '—',
        })),
        invoices: mappedInvoices,
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

  if (loading || (client && !c)) {
    return <LoadingSpinner fullPage label="جاري تحميل بيانات العميل من قاعدة البيانات..." />;
  }

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
    { key: 'financials', label: `الماليات والحد الائتماني (${c.invoices?.length || 0})`, icon: CreditCard },
    { key: 'contacts', label: `جهات الاتصال (${c.contacts?.length || 0})`, icon: Users },
    { key: 'branches', label: `الفروع وعناوين التحميل (${c.branches?.length || 0})`, icon: MapPin },
    { key: 'offers', label: `عروض الأسعار (${c.offers?.length || 0})`, icon: FileSpreadsheet },
    { key: 'calls', label: `المكالمات (${c.calls?.length || 0})`, icon: PhoneCall },
    { key: 'meetings', label: `الاجتماعات (${c.meetings?.length || 0})`, icon: Calendar },
    { key: 'reminders', label: `المتابعات (${c.reminders?.filter((r: any) => !r.completed).length || 0})`, icon: Bell },
    { key: 'attachments', label: `الوثائق والتراخيص (${(c.entityDocuments || c.attachments || []).length})`, icon: FileText },
  ];

  const compliance = computeClientCompliance(c);
  const creditLimitVal = Number(c.creditLimit || 500000);
  const usedCreditVal = Number(c.outstandingBalance || 0);
  const availableCreditVal = Math.max(0, creditLimitVal - usedCreditVal);
  const creditUsedPct = creditLimitVal > 0 ? Math.min(100, Math.round((usedCreditVal / creditLimitVal) * 100)) : 0;
  const creditAvailPct = Math.max(0, 100 - creditUsedPct);

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

  // ── Clients & Ops (جلسة 3 §3): العرض يُنشأ من ملف العميل،
  // والترقية إلى «فعلي» تتم تلقائياً عند قبول أول عرض (quotations/:id/accept)
  const handleAcceptOffer = async (offerId: string) => {
    if (!window.confirm('قبول العرض وتحويله إلى ملف عملية (Job File)؟ سيُرقّى العميل تلقائياً إلى «فعلي».')) return;
    try {
      await api.post(`/quotations/${offerId}/accept`, {});
      window.location.reload();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'تعذر قبول العرض');
    }
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
          <div className="flex items-center gap-3 flex-wrap">
            {c.status === 'prospect' ? (
              <>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700">
                  عميل مستهدف — يُرقّى تلقائياً عند قبول أول عرض أو يدوياً
                </span>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  اعتماد وتحويل لعميل فعلي
                </button>
              </>
            ) : (
              <>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-700">
                  عميل فعلي معتمد ✅
                </span>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-brand-500" />
                  تعديل الفروع والمسؤولين والمرفقات
                </button>
              </>
            )}
            <button
              onClick={() => setShowOfferModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              عرض سعر جديد
            </button>
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
            <StatCard title="إجمالي الشحنات" value={c.totalShipments ?? (c.shipments?.length || 0)} icon={Briefcase} iconColor="text-brand-600" iconBg="bg-brand-50 dark:bg-brand-950/50" />
            <StatCard
              title="إجمالي الفواتير"
              value={c.totalRevenue ? `${Number(c.totalRevenue).toLocaleString()} ج.م` : '0 ج.م'}
              icon={CreditCard}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50 dark:bg-emerald-950/50"
            />
            <StatCard title="عروض نشطة" value={(c.offers || []).filter((o: any) => !['accepted', 'rejected', 'expired'].includes(o.status)).length} icon={FileSpreadsheet} iconColor="text-amber-600" iconBg="bg-amber-50 dark:bg-amber-950/50" />
            <StatCard title="حد الائتمان" value={`${(creditLimitVal / 1000).toFixed(0)}K ج.م`} icon={Shield} iconColor="text-purple-600" iconBg="bg-purple-50 dark:bg-purple-950/50" />
          </div>

          {/* ── Legal & Operational Profile Compliance Progress Bar (مؤشر اكتمال الملف القانوني §4) ── */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                    compliance.percent === 100
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : compliance.percent >= 60
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {compliance.percent}%
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      مؤشر اكتمال الملف القانوني والتشغيلي للعميل
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400">
                      ({compliance.doneCount} من {compliance.totalCount} مكتمل)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {compliance.percent === 100
                      ? 'ملف العميل مكتمل قانونياً وجاهز لكافة العمليات والتخليص الجمركي والفوترة.'
                      : `ينقص العميل (${compliance.missing.map((m) => m.label).join('، ')}) — اضغط على أي بند ناقص لاستكماله مباشرةً.`}
                  </p>
                </div>
              </div>

              {compliance.percent < 100 && (
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF5E1E] hover:bg-[#EA580C] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  استكمال النواقص الآن ({compliance.missing.length})
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  compliance.percent === 100
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : compliance.percent >= 60
                    ? 'bg-gradient-to-r from-amber-500 to-[#FF5E1E]'
                    : 'bg-gradient-to-r from-rose-500 to-amber-500'
                }`}
                style={{ width: `${compliance.percent}%` }}
              />
            </div>

            {/* 5 Check-items Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {compliance.items.map((item) =>
                item.done ? (
                  <span
                    key={item.key}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{item.label}</span>
                    {item.detail && <span className="text-[10px] opacity-75 font-mono">({item.detail})</span>}
                  </span>
                ) : (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setShowProfileModal(true)}
                    title="اضغط لاستكمال هذا البند"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300/70 dark:border-amber-800/60 transition cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{item.label} (ناقص — اضغط للإضافة)</span>
                  </button>
                ),
              )}
            </div>
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
                      <span className="text-[11px] text-slate-400">
                        تسهيل ائتماني معتمد {c.paymentTerms || 'Net 30'} بحد أقصى {creditLimitVal.toLocaleString()} ج.م
                      </span>
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
                      <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 block">
                        إجمالي الفواتير المصدرة ({(c.invoices || []).filter((i: any) => i.status !== 'cancelled').length})
                      </span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono mt-1 block">
                        {Number(c.totalRevenue || 0).toLocaleString()} ج.م
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block">إجمالي المسدد والمحصل</span>
                      <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                        {Number(c.totalPaid || 0).toLocaleString()} ج.م
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/30">
                      <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 block">المديونية المتبقية المستحقة</span>
                      <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-1 block">
                        {Number(c.outstandingBalance || 0).toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {c.invoices?.length ? (
                      c.invoices.map((inv: any) => (
                        <div key={inv.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                to={`/invoices/${inv.id}`}
                                className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400 hover:underline"
                              >
                                {inv.invoiceNumber}
                              </Link>
                              <StatusBadge status={inv.status} />
                              {inv.jobNo && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  شحنة: {inv.jobNo}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              تاريخ الإصدار: {inv.issueDate || '—'} • الاستحقاق: {inv.dueDate}
                            </span>
                          </div>

                          <div className="text-end shrink-0">
                            <span className="text-xs font-bold font-mono text-slate-900 dark:text-white block">
                              {Number(inv.amount || 0).toLocaleString()} ج.م
                              {inv.currency && inv.currency !== 'EGP' && (
                                <span className="text-[10px] text-slate-400 ms-1">
                                  ({Number(inv.rawTotal || 0).toLocaleString()} {inv.currency})
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              مسدد: {Number(inv.paid || 0).toLocaleString()} ج.م • متبقي: {Number(inv.remaining || 0).toLocaleString()} ج.م
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                        لا توجد فواتير صادرة لهذا العميل في قاعدة البيانات حتى الآن.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 1: Contacts */}
              {activeTab === 'contacts' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-medium text-slate-500">مسؤولي التواصل وصناع القرار (Person in Charge — يمكن إضافة أكثر من مسؤول)</span>
                    <button
                      onClick={() => setShowProfileModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-semibold transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة / تعديل جهات الاتصال
                    </button>
                  </div>

                  {c.contacts?.map((contact: any) => {
                    const linkedBranch = (c.branches || []).find((b: any) => b.id === contact.branchId);
                    return (
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
                            {linkedBranch && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <MapPin className="w-3 h-3" />{linkedBranch.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {contact.title}{contact.department ? ` • ${contact.department}` : ''}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                            {contact.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /><span dir="ltr">{contact.phone}</span></span>}
                            {contact.mobile && <span className="flex items-center gap-1"><PhoneCall className="w-3 h-3" /><span dir="ltr">{contact.mobile}</span></span>}
                            {contact.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: Phone Calls Log */}
              {/* TAB: Branches & Loading Addresses (الفروع وعناوين التحميل §5ب) */}
              {activeTab === 'branches' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 flex-wrap gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      المقر الرئيسي / المخازن / أماكن التحميل ومسؤولي الفروع — تُستدعى مباشرة في العروض وأوامر التحميل
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowProfileModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        إدارة الفروع ومسؤولي الفروع
                      </button>
                      <AddBranchButton clientId={c.id} onSaved={() => refetch()} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {c.branches?.length ? c.branches.map((b: any) => (
                      <div key={b.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{b.name}</span>
                              {b.isLoadingAddress && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  مكان تحميل
                                </span>
                              )}
                              {!b.isActive && <span className="text-[10px] text-slate-400">(غير مفعّل)</span>}
                            </div>
                            {b.address && <p className="text-[11px] text-slate-500 dark:text-slate-400">{b.address}</p>}
                            <p className="text-[10px] text-slate-400">
                              {b.city || b.cityRef?.nameEn || '—'}{b.countryCode ? ` (${b.countryCode})` : ''}{b.phone ? ` — ${b.phone}` : ''}
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`حذف الفرع «${b.name}»؟`)) return;
                              try {
                                await api.delete(`/clients/${c.id}/branches/${b.id}`);
                                refetch();
                              } catch (err: any) {
                                alert(err?.response?.data?.message || 'تعذر حذف الفرع');
                              }
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
                            title="حذف الفرع"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {(b.contacts || []).length > 0 && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                            <div className="text-[10px] font-bold text-slate-500">مسؤولو الفرع ({b.contacts.length}):</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {b.contacts.map((ct: any) => (
                                <div key={ct.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[11px] flex items-center justify-between gap-2">
                                  <div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{ct.name}</span>
                                    {ct.title && <span className="text-slate-400"> — {ct.title}</span>}
                                  </div>
                                  <span dir="ltr" className="text-slate-500 font-mono">{ct.mobile || ct.phone || ''}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )) : (
                      <p className="text-xs text-slate-400 py-6 text-center">
                        لا توجد فروع مسجلة — أضف المقر الرئيسي وأماكن التحميل ليستخدمها الـ Operations في أوامر التحميل.
                      </p>
                    )}
                  </div>
                </div>
              )}

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

              {/* TAB 5: Offers & Quotations History (دورة العرض §3) */}
              {activeTab === 'offers' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-medium text-slate-500">
                      دورة العرض: طلب ← تسعير (Completed) ← قبول ← فتح ملف العملية وترقية العميل
                    </span>
                    <button
                      onClick={() => setShowOfferModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      عرض سعر جديد (New Offer)
                    </button>
                  </div>

                  <div className="space-y-2">
                    {c.offers?.map((offer: any) => (
                      <div key={offer.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition flex items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link to={`/quotations/${offer.id}`} className="text-xs font-bold font-mono text-brand-600 dark:text-brand-400 hover:underline">
                              {offer.quotationNumber}
                            </Link>
                            <StatusBadge status={offer.status} />
                            {(offer.serviceTypes || []).length > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {(offer.serviceTypes || []).map((s: string) => ({ shipping: 'شحن', clearance: 'تخليص', transport: 'نقل' } as any)[s] || s).join(' + ')}
                              </span>
                            )}
                          </div>
                          {/* Line Summary (§5): Qty x Container | From: POL -> To: POD | Pickup */}
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {offer.containerQty ? `${Number(offer.containerQty)}x${offer.containerType || ''}` : ''}
                            {offer.originPort ? ` | من: ${offer.originPort.nameEn}` : ''}
                            {offer.destinationPort ? ` ← إلى: ${offer.destinationPort.nameEn}` : ''}
                            {offer.pickupBranch ? ` | تحميل: ${offer.pickupBranch.name}` : ''}
                          </p>
                          {offer.goodsDescription && (
                            <p className="text-[11px] text-slate-400">{offer.goodsDescription}</p>
                          )}
                        </div>

                        <div className="text-end space-y-1 shrink-0">
                          <span className="text-xs font-bold font-mono text-slate-900 dark:text-white block">
                            {Number(offer.totalSell || 0).toLocaleString()} {offer.currency}
                          </span>
                          <div className="flex items-center gap-2 justify-end">
                            {offer.pdfUrl && (
                              <a href={offer.pdfUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline">
                                View PDF
                              </a>
                            )}
                            {offer.status !== 'accepted' && (
                              <button
                                onClick={() => handleAcceptOffer(offer.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-sm transition cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                قبول العرض
                              </button>
                            )}
                          </div>
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
                    <span className="text-xs font-medium text-slate-500">
                      المستندات الرسمية (سجل تجاري / بطاقة ضريبية / سجل مستوردين / أخرى) — مع إمكانية تسمية وتعديل اسم الأتاتش وتحديد تاريخ انتهاء الصلاحية
                    </span>
                  </div>
                  <DocsSection
                    clientId={c.id}
                    docs={c.entityDocuments || []}
                    onRefresh={refetch}
                  />
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
                {c.paymentTerms || 'Net 30'}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium font-mono">
                  المستهلك: {usedCreditVal.toLocaleString()} ج.م
                </span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {creditLimitVal.toLocaleString()} ج.م
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-[#FF5E1E] rounded-full transition-all duration-500"
                  style={{ width: `${creditUsedPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>المتاح: {availableCreditVal.toLocaleString()} ج.م ({creditAvailPct}%)</span>
                <span>الاستهلاك: {creditUsedPct}%</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">المديونية المستحقة حالياً:</span>
              <span className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono">
                {usedCreditVal.toLocaleString()} ج.م
              </span>
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
              <InfoRow icon={CreditCard} label="البطاقة الضريبية" value={c.taxCardNumber || c.taxNumber} mono />
              <InfoRow icon={FileText} label="السجل التجاري" value={c.commercialReg || c.commercialRegister} mono />
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

      {/* New Offer Modal (دورة العرض §3/§4) */}
      <NewOfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        onSuccess={() => refetch()}
        clientId={c.id}
        clientName={c.name}
        branches={c.branches || []}
      />

      {showProfileModal && (
        <ActiveClientProfileModal
          client={c}
          mode={c.status === 'prospect' ? 'convert' : 'edit'}
          onClose={() => setShowProfileModal(false)}
          onSaved={() => {
            setShowProfileModal(false);
            refetch();
          }}
        />
      )}

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

/** إضافة فرع / عنوان تحميل (§5ب) — زر + نافذة إدخال سريعة */
const AddBranchButton: React.FC<{ clientId: string; onSaved: () => void }> = ({ clientId, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', city: '', phone: '', isLoadingAddress: false });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { alert('اسم الفرع مطلوب'); return; }
    setSaving(true);
    try {
      await api.post(`/clients/${clientId}/branches`, {
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        phone: form.phone.trim() || undefined,
        isLoadingAddress: form.isLoadingAddress,
      });
      setOpen(false);
      setForm({ name: '', address: '', city: '', phone: '', isLoadingAddress: false });
      onSaved();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'تعذر إضافة الفرع');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer">
        <Plus className="w-3.5 h-3.5" />
        إضافة فرع / عنوان تحميل
      </button>
    );
  }

  return (
    <Modal
      isOpen={true}
      onClose={() => setOpen(false)}
      title="إضافة فرع / عنوان تحميل جديد"
      subtitle="المقر الرئيسي أو المخازن أو أماكن التحميل — تظهر مباشرة في نافذة عرض السعر وأوامر التحميل"
    >
      <form onSubmit={submit} className="space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">اسم الفرع *</label>
            <input dir="rtl" required placeholder="مثال: المقر الرئيسي / مخزن أكتوبر" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">المدينة</label>
            <input dir="rtl" placeholder="مثال: مدينة 6 أكتوبر" value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">رقم الهاتف</label>
            <input dir="ltr" placeholder="+20 2 000 0000" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isLoadingAddress}
                onChange={(e) => setForm({ ...form, isLoadingAddress: e.target.checked })} />
              <span className="font-semibold text-slate-600 dark:text-slate-300">مكان تحميل (Loading Address)</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">العنوان التفصيلي</label>
          <textarea rows={2} dir="rtl" placeholder="المنطقة الصناعية، شارع ...، مبنى ..." value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={() => setOpen(false)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 transition cursor-pointer">
            إلغاء
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#FF5E1E] hover:bg-[#EA580C] disabled:opacity-60 text-white font-bold transition shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer">
            {saving ? 'جارٍ الحفظ...' : 'إضافة الفرع'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
