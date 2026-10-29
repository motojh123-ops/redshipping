import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Phone,
  Mail,
  MapPin,
  Building2,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  UserPlus,
  ShieldAlert,
  Calendar,
  ExternalLink,
  MessageSquare,
  LayoutGrid,
  Table as TableIcon,
  Briefcase,
  Layers,
  Pencil,
} from 'lucide-react';
import { api } from '../../services/api';
import { CreateClientModal } from './CreateClientModal';
import { ActiveClientProfileModal } from '../masters/ClientsMasterPage';
import { exportToCsv } from '../../utils/exportUtils';

export interface ClientItem {
  id: string;
  name: string;
  nameAr?: string | null;
  tradeName?: string | null;
  /** legacy UI flag — the real source of truth is `status` (جلسة 3) */
  type?: 'actual' | 'lead';
  category?: string | null;
  status: 'active' | 'inactive' | 'prospect' | 'blacklisted';
  commercialReg?: string | null;
  taxNumber?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  contactName?: string | null;
  contactTitle?: string | null;
  commodityInterest?: string | null;

  totalShipments?: number;
  totalRevenue?: number;
  notes?: string | null;
  /** from API include (الشكل الحقيقي القادم من الـ backend) */
  companyType?: { id: string; code: string; nameEn: string; nameAr?: string | null } | null;
  industrySector?: { id: string; code: string; nameEn: string; nameAr?: string | null } | null;
  contacts?: Array<{
    id: string;
    name: string;
    title?: string | null;
    phone?: string | null;
    mobile?: string | null;
    email?: string | null;
    isPrimary?: boolean;
  }>;
  /** الـ API بيرجع object مش string */
  salesRep?: { id: string; name: string; email?: string } | null;
  _count?: { quotations?: number; shipments?: number; branches?: number };
  createdAt: string;
}

export const ClientList: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'prospect' | 'active'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Conversion / Full Profile modal state (شجرة الفروع والمسؤولين + المرفقات وتواريخ الانتهاء)
  const [convertingLead, setConvertingLead] = useState<ClientItem | null>(null);
  const [editingActiveClient, setEditingActiveClient] = useState<ClientItem | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/clients');
      if (res && Array.isArray(res)) {
        setClients(res);
        setIsLiveConnected(true);
      } else {
        setClients([]);
      }
    } catch {
      setClients([]);
      setIsLiveConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (activeTab === 'prospect' && c.status !== 'prospect') return false;
      if (activeTab === 'active' && c.status !== 'active') return false;
      if (categoryFilter !== 'all' && !String(c.category || '').includes(categoryFilter)) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = c.name.toLowerCase().includes(term);
        const matchTrade = c.tradeName?.toLowerCase().includes(term);
        const matchTax = c.taxNumber?.toLowerCase().includes(term);
        const matchCR = c.commercialReg?.toLowerCase().includes(term);
        const matchCity = String(c.city || '').toLowerCase().includes(term);
        const matchPhone = c.phone?.toLowerCase().includes(term);
        const matchContact = c.contactName?.toLowerCase().includes(term);
        if (!matchName && !matchTrade && !matchTax && !matchCR && !matchCity && !matchPhone && !matchContact) {
          return false;
        }
      }
      return true;
    });
  }, [clients, activeTab, categoryFilter, searchTerm]);

  // Statistics
  const actualCount = clients.filter((c) => c.status === 'active').length;
  const leadCount = clients.filter((c) => c.status === 'prospect').length;
  const totalRevenue = clients.reduce((acc, c) => acc + (c.totalRevenue || 0), 0);

  // Conversion Handler
  const handleStartConversion = (lead: ClientItem) => {
    setConvertingLead(lead);
  };

  // Excel Export
  const handleExportClients = () => {
    exportToCsv('redshipping_clients_crm_directory', filteredClients, [
      { header: 'كود المنشأة', accessor: (c) => c.id },
      { header: 'اسم الشركة', accessor: (c) => c.name },
      { header: 'الاسم التجاري', accessor: (c) => c.tradeName || '—' },
      { header: 'النوع والوضعية', accessor: (c) => (c.status === 'active' ? 'عميل فعلي (Actual)' : c.status === 'prospect' ? 'عميل مستهدف (Prospect)' : c.status) },
      { header: 'التصنيف التجاري', accessor: (c) => c.category || '—' },
      { header: 'الحالة', accessor: (c) => c.status },
      { header: 'السجل التجاري', accessor: (c) => c.commercialReg || '—' },
      { header: 'الرقم الضريبي', accessor: (c) => c.taxNumber || '—' },
      { header: 'المحافظة / المدينة', accessor: (c) => c.city },
      { header: 'مسؤول التواصل', accessor: (c) => c.contactName || c.contacts?.[0]?.name || '—' },
      { header: 'رقم الهاتف', accessor: (c) => c.phone || '—' },
      { header: 'مسؤول المبيعات', accessor: (c) => (typeof c.salesRep === 'object' ? c.salesRep?.name : c.salesRep) || '—' },
      { header: 'إجمالي الشحنات', accessor: (c) => c.totalShipments || 0 },
      { header: 'إجمالي الإيرادات (EGP)', accessor: (c) => c.totalRevenue || 0 },
    ]);
  };

  return (
    <div className="space-y-7">
      {/* ── 1. Executive CRM Command Header ── */}
      <div className="relative rounded-3xl overflow-hidden bg-white/95 dark:bg-[#121620]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-white p-6 sm:p-8 shadow-sm transition-all duration-300">
        {/* Subtle Ambient Brand Glow */}
        <div className="absolute top-0 end-0 w-96 h-96 bg-gradient-to-bl from-[#FF5E1E]/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 start-0 w-80 h-80 bg-gradient-to-tr from-sky-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#FF5E1E] text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#FF5E1E] animate-pulse" />
              <span>منظومة إدارة العملاء والشركات • Enterprise CRM</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              إدارة حسابات المستوردين والشركات والمبيعات
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              قاعدة بيانات موحدة للمصانع، المستوردين، وشركات التجارة الخارجية مع توثيق الأرقام الضريبية والسجلات التجارية ومتابعة دورة تحويل الليدز إلى شركاء دائمين.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                توثيق قانوني وضريبي كامل
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                متابعة حركة النوالين والإيرادات
              </span>
            </div>
          </div>

          {/* Action Buttons & Sync Indicator */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold border transition ${
              isLiveConnected 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-xs' 
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{isLiveConnected ? '🟢 متصل بالـ API (Live Synced)' : '🟡 وضع الذاكرة المحلية'}</span>
            </div>

            <button
              onClick={fetchClients}
              disabled={loading}
              title="تحديث البيانات من السيرفر"
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <Clock className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FF5E1E]' : 'text-slate-500'}`} />
              <span>تحديث</span>
            </button>

            <button
              onClick={handleExportClients}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>تصدير Excel</span>
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FF5E1E] hover:bg-[#FF7034] text-white text-xs sm:text-sm font-bold shadow-lg shadow-orange-500/25 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عميل أو ليد جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Next-Gen KPI Metric Cards (rounded-3xl + glassmorphic) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Accounts */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي قاعدة الحسابات</span>
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#FF5E1E] group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{clients.length}</div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5E1E]" />
            <span>شركات مسجلة وليدز نشطة</span>
          </div>
        </div>

        {/* Card 2: Actual Corporate Clients */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">عملاء تجاريين معتمدين</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{actualCount}</div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ملفات ضريبية وسجلات مكتملة</span>
          </div>
        </div>

        {/* Card 3: Active Leads */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-b from-amber-500/5 to-transparent shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">ليدز وفرص مبيعات</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-700 dark:text-amber-300 tracking-tight">{leadCount}</div>
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>قيد المتابعة والتأهيل التجاري</span>
          </div>
        </div>

        {/* Card 4: Total Revenue Volume */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">حجم الأعمال التراكمي</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
            {(totalRevenue / 1_000_000).toFixed(2)}M
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <span>ج.م من عمليات الشحن المسددة</span>
          </div>
        </div>
      </div>

      {/* ── 3. Filters, Search Bar & View Mode Toggle ── */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Quick Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/70 p-1 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            جميع الحسابات ({clients.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'active'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>العملاء الفعليون ({actualCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('prospect')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'prospect'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>المستهدفون / Prospects ({leadCount})</span>
          </button>
        </div>

        {/* Search, Category & View Mode */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث بالاسم، السجل التجاري، البطاقة الضريبية..."
              className="w-full ps-10 pe-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/50 text-slate-900 dark:text-white"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">جميع القطاعات</option>
              <option value="مصنع">مصانع وإنتاج</option>
              <option value="استيراد">مستوردين وتوزيع</option>
              <option value="تجارة">تجارة وتوريدات</option>
              <option value="تصدير">حاصلات وتصدير</option>
            </select>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/70 p-1 rounded-2xl shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="عرض الكروت التنفيذية"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="عرض جدول البيانات"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Content Display ── */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm font-medium">جاري تحميل بيانات العملاء الحقيقية من قاعدة البيانات...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-8">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-1">لا يوجد عملاء مسجلين</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-4">
            لم يتم العثور على عملاء مطابقين. يمكنك إضافة عميل جديد الآن لحفظه في قاعدة بيانات PostgreSQL مباشرة.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة عميل جديد</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredClients.map((client) => {
            const isActual = client.status === 'active';

            return (
              <div
                key={client.id}
                className={`rounded-3xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                  isActual
                    ? 'bg-white dark:bg-[#121620] border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                    : 'bg-amber-50/30 dark:bg-amber-950/15 border-amber-200/60 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700'
                }`}
              >
                {/* Card Top */}
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 shadow-xs ${
                          isActual
                            ? 'bg-gradient-to-br from-brand-600 to-red-600 text-white'
                            : 'bg-gradient-to-br from-amber-500 to-orange-500 text-white'
                        }`}
                      >
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <Link
                          to={`/clients/${client.id}`}
                          className="font-black text-slate-900 dark:text-white text-base hover:text-brand-600 transition block leading-snug"
                        >
                          {client.name}
                        </Link>
                        {client.tradeName && client.tradeName !== client.name && (
                          <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                            {client.tradeName}
                          </span>
                        )}
                        <span className="text-xs text-brand-600 dark:text-brand-400 font-bold block mt-1">
                          {client.category || client.companyType?.nameAr || client.companyType?.nameEn || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0">
                      {isActual ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>عميل فعلي ✓</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>مستهدف (Prospect)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Commodity / Demand for Leads */}
                  {!isActual && (client.commodityInterest || client.notes) && (
                    <div className="p-3 rounded-2xl bg-amber-100/50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed border border-amber-200/60 dark:border-amber-800/40">
                      <span className="font-bold block mb-0.5">الاهتمام التشغيلي للشحنات:</span>
                      <span>{client.commodityInterest || client.notes}</span>
                    </div>
                  )}

                  {/* Legal & Meta Information */}
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    {isActual ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          س.ت: <strong className="font-mono text-slate-900 dark:text-slate-200">{client.commercialReg}</strong> • ضريبي:{' '}
                          <strong className="font-mono text-slate-900 dark:text-slate-200">{client.taxNumber}</strong>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>يتطلب استكمال السجل التجاري والبطاقة الضريبية للاعتماد</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{client.city || '—'}</span>
                    </div>

                    {client.contacts && client.contacts.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          {client.contacts[0].name} ({client.contacts[0].title || 'مسؤول الاتصال'})
                          {client.contacts.length > 1 && ` +${client.contacts.length - 1} مسؤول`}
                        </span>
                      </div>
                    )}
                    {(client._count?.branches || 0) > 0 && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          {client._count?.branches} فرع • {client.contacts?.length || 0} مسؤول اتصال
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-950/40 rounded-b-3xl border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {client.phone && (
                      <a
                        href={`tel:${client.phone}`}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 border border-slate-200/80 dark:border-slate-700 shadow-xs transition"
                        title="اتصال هاتفي"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {client.email && (
                      <a
                        href={`mailto:${client.email}`}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 border border-slate-200/80 dark:border-slate-700 shadow-xs transition"
                        title="إرسال بريد إلكتروني"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!isActual ? (
                      <button
                        onClick={() => handleStartConversion(client)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                        title="تحويل الليد إلى عميل رسمي معتمد مع الفروع والمسؤولين والمرفقات"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>اعتماد كعميل رسمي</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingActiveClient(client)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#FF5E1E]/10 text-slate-700 dark:text-slate-300 hover:text-[#FF5E1E] text-xs font-bold transition cursor-pointer"
                        title="تعديل الفروع والمسؤولين والمرفقات"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>الفروع والمرفقات</span>
                      </button>
                    )}

                    <Link
                      to={`/clients/${client.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/50 transition"
                    >
                      <span>الملف الكامل</span>
                      {isRTL ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Executive Table View */
        <div className="rounded-3xl bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 text-start">اسم المنشأة والشركة</th>
                  <th className="py-3.5 px-4 text-start">النوع</th>
                  <th className="py-3.5 px-4 text-start">القطاع التجاري</th>
                  <th className="py-3.5 px-4 text-start">السجل والبطاقة الضريبية</th>
                  <th className="py-3.5 px-4 text-start">المقر والمدينة</th>
                  <th className="py-3.5 px-4 text-start">مسؤول التواصل</th>
                  <th className="py-3.5 px-4 text-start">مسؤول المبيعات</th>
                  <th className="py-3.5 px-4 text-start">حجم الأعمال</th>
                  <th className="py-3.5 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredClients.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/clients/${c.id}`)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div>{c.name}</div>
                      {c.tradeName && <div className="text-[10px] text-slate-400 font-mono">{c.tradeName}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      {c.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          فعلي ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          مستهدف
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-brand-600 dark:text-brand-400 font-semibold">{c.category || '—'}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {c.commercialReg ? (
                        <div>
                          <div>س.ت: {c.commercialReg}</div>
                          <div className="text-[10px] text-slate-400">ض: {c.taxNumber}</div>
                        </div>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 text-[11px]">غير مستكمل</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{c.city || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                      <div>{c.contactName || '—'}</div>
                      {c.phone && <div className="text-[10px] text-slate-400 font-mono">{c.phone}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{(typeof c.salesRep === 'object' ? c.salesRep?.name : c.salesRep) || '—'}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {c.totalRevenue ? `${(c.totalRevenue / 1000).toLocaleString()}K EGP` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clients/${c.id}`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-[#FF5E1E] hover:text-white transition font-bold text-[11px]"
                      >
                        الملف الكامل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. Convert Lead to Actual Client / Edit Active Client Modal ── */}
      {convertingLead && (
        <ActiveClientProfileModal
          client={convertingLead as any}
          mode="convert"
          onClose={() => setConvertingLead(null)}
          onSaved={() => {
            setConvertingLead(null);
            fetchClients();
          }}
        />
      )}

      {editingActiveClient && (
        <ActiveClientProfileModal
          client={editingActiveClient as any}
          mode="edit"
          onClose={() => setEditingActiveClient(null)}
          onSaved={() => {
            setEditingActiveClient(null);
            fetchClients();
          }}
        />
      )}

      {/* ── 6. Create Client Modal ── */}
      <CreateClientModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchClients}
      />
    </div>
  );
};
