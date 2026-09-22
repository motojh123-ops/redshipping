import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import {
  Target,
  Plus,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  ArrowRightCircle,
  ChevronDown,
  LayoutGrid,
  List,
  Filter,
  Download,
  StickyNote,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Ship,
  MapPin,
  DollarSign,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { exportToCsv } from '../../utils/exportUtils';

/* ─── Demo Data ─── */
const SERVICE_TYPES = [
  { key: 'sea_fcl', label: 'بحري — حاوية كاملة FCL', icon: '🚢' },
  { key: 'sea_lcl', label: 'بحري — تجميع LCL', icon: '📦' },
  { key: 'air', label: 'جوي', icon: '✈️' },
  { key: 'land', label: 'بري', icon: '🚛' },
  { key: 'clearance', label: 'تخليص جمركي', icon: '🛃' },
  { key: 'logistics', label: 'لوجستيات داخلية', icon: '🏭' },
];

const LEAD_STAGES = [
  { key: 'new', label: 'جديد', color: 'bg-sky-500', textColor: 'text-sky-700 dark:text-sky-300', bgCard: 'border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30' },
  { key: 'contacted', label: 'تم التواصل', color: 'bg-indigo-500', textColor: 'text-indigo-700 dark:text-indigo-300', bgCard: 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30' },
  { key: 'quoted', label: 'تم التسعير', color: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-300', bgCard: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30' },
  { key: 'negotiation', label: 'قيد التفاوض', color: 'bg-purple-500', textColor: 'text-purple-700 dark:text-purple-300', bgCard: 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30' },
  { key: 'won', label: 'تم الفوز ✅', color: 'bg-emerald-500', textColor: 'text-emerald-700 dark:text-emerald-300', bgCard: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30' },
  { key: 'lost', label: 'خسارة ❌', color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-300', bgCard: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30' },
];

interface Lead {
  id: string;
  title: string;
  client: string;
  clientType: string;
  serviceType: string;
  origin: string;
  destination: string;
  estimatedValue: number;
  currency: string;
  salesPerson: string;
  stage: string;
  expectedCloseDate: string;
  createdAt: string;
  priority: 'high' | 'medium' | 'low';
  activities: Activity[];
  notes: string;
}

interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'whatsapp' | 'note';
  description: string;
  date: string;
  user: string;
}

const activityIcon = (type: string) => {
  switch (type) {
    case 'call': return <Phone className="w-3.5 h-3.5" />;
    case 'email': return <Mail className="w-3.5 h-3.5" />;
    case 'meeting': return <Calendar className="w-3.5 h-3.5" />;
    case 'whatsapp': return <MessageSquare className="w-3.5 h-3.5" />;
    case 'note': return <StickyNote className="w-3.5 h-3.5" />;
    default: return <StickyNote className="w-3.5 h-3.5" />;
  }
};

const activityColor = (type: string) => {
  switch (type) {
    case 'call': return 'text-sky-600 bg-sky-100 dark:text-sky-300 dark:bg-sky-900/50';
    case 'email': return 'text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/50';
    case 'meeting': return 'text-purple-600 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/50';
    case 'whatsapp': return 'text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/50';
    case 'note': return 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800';
    default: return 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800';
  }
};

const priorityBadge = (p: string) => {
  switch (p) {
    case 'high': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800">عالية</span>;
    case 'medium': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800">متوسطة</span>;
    case 'low': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">منخفضة</span>;
    default: return null;
  }
};

export const LeadsPipelinePage: React.FC = () => {
  const { t } = useTranslation();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    api.get('/clients')
      .then((res: any) => {
        if (res) {
          const list = Array.isArray(res) ? res : (Array.isArray(res.items) ? res.items : []);
          setIsLiveConnected(true);
          if (list.length > 0) {
            const mappedLeads: Lead[] = list.map((c: any, idx: number) => {
              const stages = ['new', 'contacted', 'quoted', 'negotiation', 'won'];
              const assignedStage = c.status === 'lead' ? 'new' : (c.creditLimit > 0 ? 'won' : stages[idx % stages.length]);
              return {
                id: `LD-LIVE-${String(c.id).slice(0, 8)}`,
                title: `${c.businessType || 'شحن بضائع وخدمات'} — ${c.name}`,
                client: c.nameAr || c.name,
                clientType: c.businessType || 'trader',
                serviceType: 'sea_fcl',
                origin: 'شنغهاي — CNSHA',
                destination: 'الإسكندرية — EGALY',
                estimatedValue: c.creditLimit || (15000 + (idx + 1) * 7500),
                currency: 'USD',
                salesPerson: c.assignedTo || 'فريق المبيعات',
                stage: assignedStage,
                expectedCloseDate: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
                createdAt: c.createdAt ? String(c.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
                priority: (idx % 3 === 0 ? 'high' : idx % 3 === 1 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
                notes: c.notes || `عميل مسجل في قاعدة البيانات المركزية (${c.taxNumber || 'سجل ضريبي معتمد'})`,
                activities: [],
              };
            });
            setLeads(mappedLeads);
          } else {
            setLeads([]);
          }
        }
      })
      .catch(() => setIsLiveConnected(false));
  }, []);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterSales, setFilterSales] = useState<string>('all');

  // KPI calculations
  const totalValue = leads.reduce((s, l) => s + l.estimatedValue, 0);
  const wonLeads = leads.filter((l) => l.stage === 'won');
  const wonValue = wonLeads.reduce((s, l) => s + l.estimatedValue, 0);
  const conversionRate = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0;
  const highPriority = leads.filter((l) => l.priority === 'high' && l.stage !== 'won' && l.stage !== 'lost').length;

  const filteredLeads = leads.filter((l) => {
    if (filterStage !== 'all' && l.stage !== filterStage) return false;
    if (filterSales !== 'all' && l.salesPerson !== filterSales) return false;
    return true;
  });

  const salesPersons = [...new Set(leads.map((l) => l.salesPerson))];

  const handleExport = () => {
    exportToCsv('crm_leads', filteredLeads, [
      { header: 'رقم الفرصة', accessor: (l) => l.id },
      { header: 'العنوان', accessor: (l) => l.title },
      { header: 'العميل', accessor: (l) => l.client },
      { header: 'نوع الخدمة', accessor: (l) => SERVICE_TYPES.find((s) => s.key === l.serviceType)?.label || l.serviceType },
      { header: 'من', accessor: (l) => l.origin },
      { header: 'إلى', accessor: (l) => l.destination },
      { header: 'القيمة المتوقعة', accessor: (l) => l.estimatedValue },
      { header: 'العملة', accessor: (l) => l.currency },
      { header: 'المسؤول', accessor: (l) => l.salesPerson },
      { header: 'المرحلة', accessor: (l) => LEAD_STAGES.find((s) => s.key === l.stage)?.label || l.stage },
      { header: 'الأولوية', accessor: (l) => l.priority === 'high' ? 'عالية' : l.priority === 'medium' ? 'متوسطة' : 'منخفضة' },
      { header: 'تاريخ الإغلاق المتوقع', accessor: (l) => l.expectedCloseDate },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إدارة الفرص والعملاء المحتملين (CRM)</h1>
            {isLiveConnected && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync: /clients
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">خط أنابيب المبيعات — متابعة الفرص من الاتصال الأول حتى التحويل لملف شحنة</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 transition">
            <Download className="w-4 h-4" /> تصدير Excel
          </button>
          <button onClick={() => setShowNewLeadModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-md shadow-brand-600/20 transition">
            <Plus className="w-4 h-4" /> فرصة جديدة
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي الفرص" value={leads.length} icon={Target} trend={`${highPriority} عالية الأولوية`} trendDirection="up" iconColor="text-sky-600" iconBg="bg-sky-50 dark:bg-sky-950/50" />
        <StatCard title="إجمالي القيمة المتوقعة" value={`$${(totalValue / 1000).toFixed(0)}K`} icon={DollarSign} subtitle="USD المعادل" iconColor="text-amber-600" iconBg="bg-amber-50 dark:bg-amber-950/50" />
        <StatCard title="قيمة المكسوب" value={`$${(wonValue / 1000).toFixed(0)}K`} icon={CheckCircle2} trend={`${wonLeads.length} صفقة ناجحة`} trendDirection="up" iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-950/50" />
        <StatCard title="معدل التحويل" value={`${conversionRate}%`} icon={TrendingUp} subtitle="من إجمالي الفرص" iconColor="text-purple-600" iconBg="bg-purple-50 dark:bg-purple-950/50" />
      </div>

      {/* Toolbar: View Toggle + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('board')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'board' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <LayoutGrid className="w-3.5 h-3.5" /> لوحة كانبان
          </button>
          <button onClick={() => setViewMode('list')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === 'list' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <List className="w-3.5 h-3.5" /> قائمة
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
            <option value="all">كل المراحل</option>
            {LEAD_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select value={filterSales} onChange={(e) => setFilterSales(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
            <option value="all">كل المبيعات</option>
            {salesPersons.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {LEAD_STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.stage === stage.key);
            const stageValue = stageLeads.reduce((s, l) => s + l.estimatedValue, 0);
            return (
              <div key={stage.key} className="min-w-[280px] max-w-[320px] flex-shrink-0">
                {/* Column Header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl border-t-4 ${stage.color} bg-white dark:bg-slate-900 border-x border-slate-200/80 dark:border-slate-800`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${stage.textColor}`}>{stage.label}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">{stageLeads.length}</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">${(stageValue / 1000).toFixed(0)}K</span>
                </div>

                {/* Cards */}
                <div className="space-y-2 p-2 border border-t-0 border-slate-200/80 dark:border-slate-800 rounded-b-xl bg-slate-50/50 dark:bg-slate-950/30 min-h-[200px]">
                  {stageLeads.map((lead) => (
                    <button key={lead.id} onClick={() => setSelectedLead(lead)} className={`w-full text-start p-3 rounded-xl border ${stage.bgCard} hover:shadow-md transition-all group`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-400">{lead.id}</span>
                        {priorityBadge(lead.priority)}
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-white leading-snug mb-1">{lead.title}</p>
                      <p className="text-[10px] text-slate-500 mb-2">{lead.client}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1.5">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{lead.origin.split('—')[0]} → {lead.destination.split('—')[0]}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{lead.estimatedValue.toLocaleString()} {lead.currency}</span>
                        <span className="text-[10px] text-slate-400">{lead.salesPerson}</span>
                      </div>
                      {lead.activities.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px] text-slate-400 truncate">{lead.activities[lead.activities.length - 1].description}</span>
                        </div>
                      )}
                    </button>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="flex items-center justify-center h-24 text-xs text-slate-400">لا توجد فرص</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="text-start px-4 py-3 font-semibold text-slate-500">رقم</th>
                  <th className="text-start px-4 py-3 font-semibold text-slate-500">الفرصة</th>
                  <th className="text-start px-4 py-3 font-semibold text-slate-500">العميل</th>
                  <th className="text-start px-4 py-3 font-semibold text-slate-500">الخدمة</th>
                  <th className="text-start px-4 py-3 font-semibold text-slate-500">المسار</th>
                  <th className="text-end px-4 py-3 font-semibold text-slate-500">القيمة</th>
                  <th className="text-start px-4 py-3 font-semibold text-slate-500">المرحلة</th>
                  <th className="text-start px-4 py-3 font-semibold text-slate-500">الأولوية</th>
                  <th className="text-start px-4 py-3 font-semibold text-slate-500">المسؤول</th>
                  <th className="text-start px-4 py-3 font-semibold text-slate-500">إغلاق متوقع</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      لا توجد فرص بيعية مسجلة حالياً
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                  const stageConfig = LEAD_STAGES.find((s) => s.key === lead.stage);
                  const svcType = SERVICE_TYPES.find((s) => s.key === lead.serviceType);
                  return (
                    <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-400">{lead.id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white max-w-[200px] truncate">{lead.title}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{lead.client}</td>
                      <td className="px-4 py-3"><span className="whitespace-nowrap">{svcType?.icon} {svcType?.label?.split('—')[0]}</span></td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{lead.origin.split('—')[0]} → {lead.destination.split('—')[0]}</td>
                      <td className="px-4 py-3 text-end font-bold text-slate-800 dark:text-white whitespace-nowrap">{lead.estimatedValue.toLocaleString()} {lead.currency}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${stageConfig?.textColor} ring-1 ring-inset ring-current/20`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stageConfig?.color}`} />
                          {stageConfig?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">{priorityBadge(lead.priority)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{lead.salesPerson}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{lead.expectedCloseDate}</td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lead Detail Drawer Modal */}
      <Modal isOpen={!!selectedLead} onClose={() => setSelectedLead(null)} title={selectedLead?.title || ''} subtitle={`${selectedLead?.id} — ${selectedLead?.client}`} maxWidth="4xl">
        {selectedLead && (
          <div className="space-y-6">
            {/* Lead Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-medium text-slate-400 block">نوع الخدمة</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">{SERVICE_TYPES.find((s) => s.key === selectedLead.serviceType)?.icon} {SERVICE_TYPES.find((s) => s.key === selectedLead.serviceType)?.label}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-medium text-slate-400 block">من</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">{selectedLead.origin}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-medium text-slate-400 block">إلى</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">{selectedLead.destination}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-medium text-slate-400 block">القيمة المتوقعة</span>
                <span className="text-sm font-bold text-emerald-600">{selectedLead.estimatedValue.toLocaleString()} {selectedLead.currency}</span>
              </div>
            </div>

            {/* Notes */}
            {selectedLead.notes && (
              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <StickyNote className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">ملاحظات</span>
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-200">{selectedLead.notes}</p>
              </div>
            )}

            {/* Activities Timeline */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">سجل الأنشطة والمتابعات</h4>
                <button onClick={() => setShowActivityModal(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition">
                  <Plus className="w-3 h-3" /> إضافة نشاط
                </button>
              </div>
              {selectedLead.activities.length > 0 ? (
                <div className="space-y-2">
                  {[...selectedLead.activities].reverse().map((act) => (
                    <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${activityColor(act.type)}`}>
                        {activityIcon(act.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-white">{act.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400">{act.date}</span>
                          <span className="text-[10px] text-slate-400">•</span>
                          <span className="text-[10px] text-slate-500 font-medium">{act.user}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-20 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl">لا توجد أنشطة مسجلة بعد</div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-sm">
                <ArrowRightCircle className="w-4 h-4" /> تحويل لعرض أسعار
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition shadow-sm">
                <Ship className="w-4 h-4" /> تحويل لملف شحنة
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* New Lead Modal */}
      <Modal isOpen={showNewLeadModal} onClose={() => setShowNewLeadModal(false)} title="فرصة جديدة" subtitle="إضافة فرصة بيع جديدة لخط الأنابيب" maxWidth="2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">عنوان الفرصة *</label>
              <input type="text" placeholder="مثال: شحن 5 حاويات FCL من الصين" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">العميل *</label>
              <select className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                <option>اختر العميل...</option>
                <option>المصرية للإنشاءات</option>
                <option>النيل للصناعات الثقيلة</option>
                <option>تك سوليوشنز</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">نوع الخدمة *</label>
              <select className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                {SERVICE_TYPES.map((s) => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">الأولوية</label>
              <select className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                <option value="high">🔴 عالية</option>
                <option value="medium">🟡 متوسطة</option>
                <option value="low">⚪ منخفضة</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">ميناء الشحن</label>
              <input type="text" placeholder="مثال: شنغهاي — CNSHA" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">ميناء الوصول</label>
              <input type="text" placeholder="مثال: الإسكندرية — EGALY" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">القيمة المتوقعة</label>
              <input type="number" placeholder="45,000" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">العملة</label>
              <select className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                <option>USD</option><option>EUR</option><option>EGP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">تاريخ الإغلاق المتوقع</label>
              <input type="date" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">ملاحظات</label>
            <textarea rows={3} placeholder="تفاصيل إضافية عن الفرصة..." className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowNewLeadModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition">إلغاء</button>
            <button onClick={() => setShowNewLeadModal(false)} className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-sm transition">حفظ الفرصة</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
