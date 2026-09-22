import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Download,
  FileCheck2,
  FileText,
  Calendar,
  Building2,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { exportToCsv } from '../../utils/exportUtils';
import { customsService, buildNafezaValidateUrl, CustomsDossierRecord } from '../../services/customsService';

export interface CustomsDossierItem {
  id: string;
  acidNumber: string;
  daysLeft: number;
  certNumber: string;
  shipmentFile: string;
  blNumber: string;
  client: string;
  status: 'acid_issued' | 'inspected' | 'release_issued';
  duties: string;
  vat: string;
  inspectionDate: string;
  port: string;
}

export const CustomsList: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const [dossiers, setDossiers] = useState<CustomsDossierItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const loadCustoms = async () => {
    setLoading(true);
    try {
      const data = await customsService.fetchCustoms();
      if (Array.isArray(data)) {
        setDossiers(data as any);
        setIsLiveConnected(true);
      }
    } catch (err) {
      console.warn('Using local customs cache', err);
      setIsLiveConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustoms();
  }, []);

  const filteredDossiers = useMemo(() => {
    return dossiers.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        d.acidNumber.includes(q) ||
        d.shipmentFile.toLowerCase().includes(q) ||
        d.client.toLowerCase().includes(q) ||
        d.certNumber.includes(q) ||
        d.blNumber.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [dossiers, searchQuery, statusFilter]);

  // Metrics
  const totalDossiers = dossiers.length;
  const activeAcidCount = dossiers.filter((d) => d.daysLeft > 0).length;
  const expiringSoonCount = dossiers.filter((d) => d.daysLeft <= 20).length;
  const releasedCount = dossiers.filter((d) => d.status === 'release_issued').length;

  const handleExportCustoms = () => {
    exportToCsv('redshipping_customs_nafeza_report', filteredDossiers, [
      { header: 'رقم القيد المسبق ACID', accessor: (d) => d.acidNumber },
      { header: 'الأيام المتبقية', accessor: (d) => d.daysLeft },
      { header: 'رقم الشهادة 46', accessor: (d) => d.certNumber },
      { header: 'رقم ملف الشحنة', accessor: (d) => d.shipmentFile },
      { header: 'رقم البوليصة', accessor: (d) => d.blNumber },
      { header: 'اسم العميل', accessor: (d) => d.client },
      { header: 'الميناء الجمركي', accessor: (d) => d.port },
      { header: 'الرسوم الجمركية', accessor: (d) => d.duties },
      { header: 'ضريبة القيمة المضافة', accessor: (d) => d.vat },
      { header: 'تاريخ الكشف', accessor: (d) => d.inspectionDate },
      { header: 'الحالة الجمركية', accessor: (d) => d.status },
    ]);
  };

  const getStatusBadge = (status: CustomsDossierItem['status']) => {
    switch (status) {
      case 'release_issued':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>إفراج نهائي (نموذج 46)</span>
          </span>
        );
      case 'inspected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>تم الكشف والمعاينة</span>
          </span>
        );
      case 'acid_issued':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            <span>صدور رقم ACID</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-7">
      {/* ── 1. Executive Customs & NAFEZA Command Header ── */}
      <div className="relative rounded-3xl overflow-hidden bg-white/95 dark:bg-[#121620]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-white p-6 sm:p-8 shadow-sm transition-all duration-300">
        {/* Subtle Ambient Light Accents */}
        <div className="absolute top-0 end-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 start-0 w-80 h-80 bg-gradient-to-tr from-[#FF5E1E]/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-start">
            {/* Integrated Verification Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>منظومة التخليص المعتمدة • نافذة NAFEZA ACI</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              إدارة التخليص الجمركي وشهادات الإفراج نموذج 46
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              متابعة مباشرة لصلاحية أرقام القيد المسبق (ACID الـ 90 يوماً)، تنسيق لجان الكشف والتثمين مع مصلحة الجمارك المصرية، وسداد الرسوم والضرائب لاستخراج أوامر التسليم.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                تسجيل إلكتروني مركزي
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                ربط موانئ الإسكندرية، الدخيلة، السخنة ودمياط
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
              <span>{isLiveConnected ? '🟢 متصل بالـ API السحابي (Live Synced)' : '🟡 وضع الذاكرة المحلية'}</span>
            </div>

            <button
              onClick={loadCustoms}
              disabled={loading}
              title="تحديث البيانات من السيرفر"
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FF5E1E]' : 'text-slate-500'}`} />
              <span>تحديث</span>
            </button>

            <button
              onClick={handleExportCustoms}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>تصدير كشف Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Next-Gen KPI Metric Cards (rounded-3xl + glassmorphism) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Active Dossiers */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الملفات الجمركية النشطة</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{totalDossiers}</div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>شحنات قيد الإجراءات الجمركية</span>
          </div>
        </div>

        {/* Card 2: Valid ACID */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">أرقام ACID سارية</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{activeAcidCount}</div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>صلاحية نافذة 90 يوماً</span>
          </div>
        </div>

        {/* Card 3: Expiring Soon Alert */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-b from-amber-500/5 to-transparent shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">أوشكت على الانتهاء</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-700 dark:text-amber-300 tracking-tight">{expiringSoonCount}</div>
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            <span>متبقي أقل من 20 يوماً</span>
          </div>
        </div>

        {/* Card 4: Form 46 Released */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">شهادات إفراج نموذج 46</span>
            <div className="w-10 h-10 rounded-2xl bg-[#FF5E1E]/10 border border-[#FF5E1E]/20 flex items-center justify-center text-[#FF5E1E] group-hover:scale-110 transition-transform">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{releasedCount}</div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>إفراج نهائي وخروج الحاويات</span>
          </div>
        </div>
      </div>

      {/* ── 3. Filters, Search Bar & View Mode Toggle ── */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Quick Filter Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/70 p-1 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            جميع الملفات ({dossiers.length})
          </button>
          <button
            onClick={() => setStatusFilter('acid_issued')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'acid_issued'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            أرقام ACID سارية
          </button>
          <button
            onClick={() => setStatusFilter('inspected')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'inspected'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            لجان المعاينة والكشف
          </button>
          <button
            onClick={() => setStatusFilter('release_issued')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'release_issued'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            إفراج نهائي (نموذج 46)
          </button>
        </div>

        {/* Search & Mode Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم ACID، العميل، الشهادة 46، البوليصة..."
              className="w-full ps-10 pe-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/50 text-slate-900 dark:text-white"
            />
          </div>

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

      {/* ── 4. Content Area: Grid View or Table View ── */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {filteredDossiers.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 bg-white dark:bg-[#121620] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-8">
              <FileCheck2 className="w-12 h-12 mx-auto mb-3 opacity-40 text-emerald-500" />
              <p className="font-bold text-slate-800 dark:text-slate-200 text-base">لا توجد ملفات تخليص جمركي مسجلة</p>
              <p className="text-xs text-slate-400 mt-1">يتم ربط ملفات التخليص الجمركي تلقائياً بالشحنات المسجلة وأرقام القيد المسبق ACID</p>
            </div>
          ) : (
            filteredDossiers.map((d) => {
            const isCertNumeric = d.certNumber.includes('/') || !isNaN(Number(d.certNumber));
            const isCritical = d.daysLeft <= 20;

            return (
              <div
                key={d.id}
                onClick={() => navigate(`/customs/${d.id}`)}
                className="group relative rounded-3xl bg-white dark:bg-[#111622] border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-2xl hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
              >
                {/* Top Security Gradient Stripe */}
                <div
                  className={`h-2 w-full ${
                    d.status === 'release_issued'
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-600'
                      : d.status === 'inspected'
                      ? 'bg-gradient-to-r from-sky-600 via-cyan-400 to-sky-600'
                      : 'bg-gradient-to-r from-amber-600 via-orange-400 to-amber-600'
                  }`}
                />

                {/* Ticket Main Content */}
                <div className="p-5 sm:p-6 space-y-4">
                  {/* 1. Ticket Header: Authority Emblem + Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-black">
                        ACI
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-none">
                          نافذة الجمارك المصرية
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          بيان جمركي وارد
                        </span>
                      </div>
                    </div>
                    <div>{getStatusBadge(d.status)}</div>
                  </div>

                  {/* 2. ACID Manifest Box */}
                  <div className="relative rounded-2xl bg-slate-50/90 dark:bg-[#0B0E14] border border-slate-200/90 dark:border-slate-800/90 p-3.5 overflow-hidden">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        رقم القيد الجمركي المسبق ACID
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">NAFEZA</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg sm:text-xl font-black font-mono tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {d.acidNumber}
                      </span>
                      {d.acidNumber && (
                        <a
                          href={buildNafezaValidateUrl(d.acidNumber)}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard?.writeText(d.acidNumber).catch(() => {});
                          }}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold transition"
                          title={`الاستعلام والتحقق من صلاحية رقم ACID على منصة نافذة الرسمية (تم نسخ الرقم للحفظ)`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>تحقق على نافذة</span>
                        </a>
                      )}
                    </div>

                    {/* 90-Day Validity Countdown Bar */}
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60">
                      <div className="flex justify-between items-center text-[10px] mb-1.5">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">صلاحية شحن البضائع (90 يوماً):</span>
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                            isCritical
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {d.daysLeft} يوم متبقي
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCritical ? 'bg-rose-500 animate-pulse' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(8, (d.daysLeft / 90) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Client & Maritime Routing */}
                  <div className="space-y-2.5 text-xs">
                    {/* Client Name */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500 mt-0.5">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-400 block">المستورد / العميل:</span>
                        <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm block truncate" title={d.client}>
                          {d.client}
                        </span>
                      </div>
                    </div>

                    {/* Port & BL Route Pill */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block">الميناء الجمركي:</span>
                        <strong className="text-slate-800 dark:text-slate-200 text-xs block truncate mt-0.5">
                          {d.port}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block">بوليصة الشحن (B/L):</span>
                        <strong className="font-mono text-slate-800 dark:text-slate-200 text-xs block truncate mt-0.5">
                          {d.blNumber}
                        </strong>
                      </div>
                    </div>

                    {/* Shipment File & Declaration 46 */}
                    <div className="flex items-center justify-between px-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <span>ملف الشحنة: <strong className="font-mono text-slate-900 dark:text-white">{d.shipmentFile}</strong></span>
                      <span>شهادة 46: <strong className={isCertNumeric ? 'font-mono text-slate-900 dark:text-white' : 'font-sans text-slate-900 dark:text-white'}>{d.certNumber}</strong></span>
                    </div>
                  </div>

                  {/* 4. Financial Mini-Ledger */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-gradient-to-r from-emerald-50/70 to-teal-50/50 dark:from-emerald-950/25 dark:to-teal-950/15 border border-emerald-200/60 dark:border-emerald-800/40">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">الرسوم الجمركية:</span>
                      <span className="font-black text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm font-mono block">
                        {d.duties}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">ضريبة القيمة المضافة:</span>
                      <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm font-mono block">
                        {d.vat}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Perforated Ticket Notch Divider */}
                <div className="relative w-full">
                  {/* Dashed Tear Line */}
                  <div className="border-b-2 border-dashed border-slate-200 dark:border-slate-800 w-full" />
                  {/* Left Cutout Notch */}
                  <div className="absolute top-1/2 -start-3.5 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 dark:bg-[#0B0E14] border border-slate-200/90 dark:border-slate-800 shadow-inner z-10" />
                  {/* Right Cutout Notch */}
                  <div className="absolute top-1/2 -end-3.5 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 dark:bg-[#0B0E14] border border-slate-200/90 dark:border-slate-800 shadow-inner z-10" />
                </div>

                {/* 6. Ticket Bottom Stub (Tear-off Section with Barcode & Official Rubber Stamp) */}
                <div className="p-5 sm:p-6 bg-slate-50/60 dark:bg-[#0E121C]/60 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-3">
                    {/* Realistic Barcode */}
                    <div className="flex-1 flex flex-col items-center select-none">
                      <div className="flex items-center gap-[2.5px] h-7 w-full max-w-[200px] justify-center opacity-85 dark:opacity-90">
                        {[3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 2, 3, 1, 4, 1, 2, 3, 2, 1].map((w, idx) => (
                          <span
                            key={idx}
                            className="h-full bg-slate-800 dark:bg-slate-200 rounded-[0.5px]"
                            style={{ width: `${w * 1.5}px` }}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] font-mono tracking-widest text-slate-500 dark:text-slate-400 font-bold mt-1">
                        * ACID-{d.acidNumber.slice(0, 9)} *
                      </span>
                    </div>

                    {/* Official Rotated Stamp */}
                    <div className="shrink-0">
                      <div
                        className={`inline-flex flex-col items-center justify-center p-1 rounded-full select-none pointer-events-none -rotate-12 transition-transform duration-300 group-hover:rotate-0 border-2 border-dashed ${
                          d.status === 'release_issued'
                            ? 'text-emerald-600 dark:text-emerald-400 border-emerald-600/50 dark:border-emerald-400/50 bg-emerald-500/5'
                            : d.status === 'inspected'
                            ? 'text-sky-600 dark:text-sky-400 border-sky-600/50 dark:border-sky-400/50 bg-sky-500/5'
                            : 'text-amber-600 dark:text-amber-400 border-amber-600/50 dark:border-amber-400/50 bg-amber-500/5'
                        }`}
                      >
                        <div className="w-[72px] h-[72px] rounded-full border border-current flex flex-col items-center justify-center p-1 text-center leading-none">
                          <span className="text-[6.5px] font-black uppercase tracking-wider block opacity-90">
                            ★ الجمارك المصرية ★
                          </span>
                          <span className="text-[10px] font-extrabold leading-tight my-0.5 block">
                            {d.status === 'release_issued'
                              ? 'معتمد جمركياً'
                              : d.status === 'inspected'
                              ? 'لجنة المعاينة'
                              : 'قيد مسبق ACI'}
                          </span>
                          <span className="text-[6.5px] font-mono tracking-tighter block opacity-85">
                            {d.status === 'release_issued'
                              ? 'CUSTOMS CLEARED'
                              : d.status === 'inspected'
                              ? 'INSPECTED'
                              : 'PRE-REGISTERED'}
                          </span>
                          <span className="text-[5.5px] font-mono tracking-tighter opacity-70 block mt-0.5">
                            NAFEZA ACI
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tear-Off Action CTA */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-slate-400 font-mono">
                      REF#{d.id.padStart(4, '0')}
                    </span>
                    <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 group-hover:translate-x-[-3px] transition-transform">
                      <span>فتح ملف التخليص والشهادة 46</span>
                      {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
          )}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-3xl bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 text-start">رقم القيد (ACID)</th>
                  <th className="py-3.5 px-4 text-start">الأيام المتبقية</th>
                  <th className="py-3.5 px-4 text-start">ملف الشحنة</th>
                  <th className="py-3.5 px-4 text-start">العميل</th>
                  <th className="py-3.5 px-4 text-start">الميناء</th>
                  <th className="py-3.5 px-4 text-start">شهادة 46</th>
                  <th className="py-3.5 px-4 text-start">الرسوم والضرائب</th>
                  <th className="py-3.5 px-4 text-start">الحالة</th>
                  <th className="py-3.5 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredDossiers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <FileCheck2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                      <p className="font-semibold text-slate-700 dark:text-slate-200">لا توجد ملفات جمركية مطابقة</p>
                    </td>
                  </tr>
                ) : (
                  filteredDossiers.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => navigate(`/customs/${d.id}`)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{d.acidNumber}</span>
                        {d.acidNumber && (
                          <a
                            href={buildNafezaValidateUrl(d.acidNumber)}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard?.writeText(d.acidNumber).catch(() => {});
                            }}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                            title={`الاستعلام والتحقق من صلاحية رقم ACID على منصة نافذة الرسمية (تم نسخ الرقم للحفظ)`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          d.daysLeft <= 20 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {d.daysLeft} يوم
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {d.shipmentFile}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white max-w-[200px] truncate">
                      {d.client}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{d.port}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {d.certNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-emerald-600 dark:text-emerald-400 font-bold">{d.duties}</div>
                      <div className="text-[10px] text-slate-400">ض.ق.م: {d.vat}</div>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(d.status)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customs/${d.id}`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-600 hover:text-white transition font-bold text-[11px]"
                      >
                        فتح الملف
                      </button>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
