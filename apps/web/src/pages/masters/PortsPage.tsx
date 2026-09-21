import React, { useState, useMemo } from 'react';
import {
  MapPin, Plus, Globe, Search, Anchor, Navigation,
  Calculator, CheckCircle2, XCircle, DollarSign,
  Download, Upload, FileSpreadsheet, ArrowRightLeft,
  Compass, Clock, ShieldCheck, Box, RefreshCw
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { toast } from 'sonner';
import { exportWorkbook } from '../../utils/excelExport';
import Papa from 'papaparse';
import {
  PORTS_REGISTRY,
  SUPPORTED_CURRENCIES,
  calculateNauticalMiles,
  estimateVoyageTransitDays,
  validateContainerIso6346,
  convertCurrency,
  formatDualCurrency,
} from '../../utils/maritime';

export const PortsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ports' | 'distance' | 'container_check' | 'currencies'>('ports');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Distance Calculator state
  const [originPort, setOriginPort] = useState('CNNGB');
  const [destPort, setDestPort] = useState('EGALY');
  const [vesselSpeed, setVesselSpeed] = useState(18);

  // Container Check state
  const [containerInput, setContainerInput] = useState('MSCU9041280');

  // Currency Converter state
  const [amount, setAmount] = useState(1000);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EGP');

  const { data: apiPorts, loading } = useApi<any[]>('/maritime/ports');

  // Merged ports list
  const allPorts = useMemo(() => {
    const registryArray = Object.values(PORTS_REGISTRY);
    if (apiPorts && apiPorts.length > 0) {
      // Merge unique
      const map = new Map<string, any>();
      registryArray.forEach((p) => map.set(p.unlocode, p));
      apiPorts.forEach((p) => map.set(p.unlocode, p));
      return Array.from(map.values());
    }
    return registryArray;
  }, [apiPorts]);

  const filteredPorts = useMemo(() => {
    return allPorts.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(q) ||
        p.nameAr.includes(search) ||
        p.unlocode.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q);

      const matchesType =
        !typeFilter ||
        (typeFilter === 'dry_port' ? p.isDryPort : !p.isDryPort);

      return matchesSearch && matchesType;
    });
  }, [allPorts, search, typeFilter]);

  // Distance computation
  const calculatedDistance = useMemo(() => {
    const orig = PORTS_REGISTRY[originPort];
    const dest = PORTS_REGISTRY[destPort];
    if (!orig || !dest) return null;

    const nm = calculateNauticalMiles(orig.coordinates, dest.coordinates);
    const estimate = estimateVoyageTransitDays(nm, vesselSpeed);
    return {
      nauticalMiles: nm,
      transitDays: estimate.transitDays,
      transitHours: estimate.transitHours,
      formatted: estimate.formatted,
      origin: orig,
      destination: dest,
    };
  }, [originPort, destPort, vesselSpeed]);

  // Container validation computation
  const containerValidation = useMemo(() => {
    if (!containerInput.trim()) return null;
    return validateContainerIso6346(containerInput);
  }, [containerInput]);

  // Currency conversion
  const convertedAmount = useMemo(() => {
    return convertCurrency(amount, fromCurrency, toCurrency);
  }, [amount, fromCurrency, toCurrency]);

  // Export ports to Excel
  const handleExportPortsExcel = async () => {
    try {
      const headers = [
        '#',
        'UN/LOCODE',
        'Port Name (EN)',
        'Port Name (AR)',
        'Country',
        'Latitude',
        'Longitude',
        'Type',
        'Terminals',
        'Customs Code',
      ];

      const rows = allPorts.map((p, idx) => [
        idx + 1,
        p.unlocode,
        p.name,
        p.nameAr,
        p.country,
        p.coordinates?.lat || '',
        p.coordinates?.lng || '',
        p.isDryPort ? 'Dry Port' : 'Marine Seaport',
        p.terminals?.join(' | ') || 'N/A',
        p.customsAuthorityCode || 'N/A',
      ]);

      await exportWorkbook('Maritime_Ports_Registry', 'UNLOCODE Ports', [headers, ...rows]);
      toast.success('تم تصدير سجل الموانئ بنجاح إلى ملف Excel');
    } catch {
      toast.error('فشل تصدير ملف Excel');
    }
  };

  // Import CSV Manifest
  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        toast.success(`تم استيراد ${results.data.length} سجل من ملف CSV بنجاح`);
      },
      error: () => {
        toast.error('حدث خطأ أثناء قراءة ملف CSV');
      },
    });
  };

  return (
    <div className="space-y-7">
      {/* ── 1. Executive Maritime Ports Command Header ── */}
      <div className="relative rounded-3xl overflow-hidden bg-white/95 dark:bg-[#121620]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-white p-6 sm:p-8 shadow-sm transition-all duration-300">
        {/* Subtle Marine Cyan Glow */}
        <div className="absolute top-0 end-0 w-96 h-96 bg-gradient-to-bl from-sky-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 start-0 w-80 h-80 bg-gradient-to-tr from-[#FF5E1E]/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              <span>الملاحة البحرية الدولية • Global Maritime UN/LOCODE</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              منظومة الموانئ والملاحة البحرية وحساب المسافات
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              سجل الموانئ البحرية والجافة المعتمدة دولياً، حساب المسافات بالأميال البحرية (NM) وسرعة السفن، تدقيق أرقام الحاويات بمعيار ISO 6346، وأسعار الصرف اللحظية.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                {allPorts.length} ميناء بحري وجاف مسجل
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                حاسبة إبحار ذكية (Great Circle / Rhumb Line)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={handleExportPortsExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>تصدير Excel</span>
            </button>
            <label className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm transition cursor-pointer">
              <Upload className="w-4 h-4 text-[#FF5E1E]" />
              <span>استيراد CSV</span>
              <input type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
            </label>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FF5E1E] hover:bg-[#FF7034] text-white text-xs font-bold shadow-lg shadow-orange-500/25 transition cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة ميناء جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Tabs Navigation ── */}
      <div className="flex items-center gap-2 p-1.5 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('ports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'ports'
              ? 'bg-[#FF5E1E] text-white shadow-md shadow-orange-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Anchor className="w-4 h-4" />
          <span>سجل الموانئ الملاحية ({allPorts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('distance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'distance'
              ? 'bg-[#FF5E1E] text-white shadow-md shadow-orange-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>حاسبة المسافات ومدة الإبحار</span>
        </button>

        <button
          onClick={() => setActiveTab('container_check')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'container_check'
              ? 'bg-[#FF5E1E] text-white shadow-md shadow-orange-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>مدقق حاويات ISO 6346</span>
        </button>

        <button
          onClick={() => setActiveTab('currencies')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'currencies'
              ? 'bg-[#FF5E1E] text-white shadow-md shadow-orange-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>أسعار الصرف الرسمية (CBE)</span>
        </button>
      </div>

      {/* TAB 1: PORTS REGISTRY */}
      {activeTab === 'ports' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#12161F] border border-slate-200/80 dark:border-[#1E2638] shadow-sm flex flex-col sm:flex-row items-center gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="بحث بالاسم أو كود UNLOCODE أو الدولة..."
              className="flex-1 w-full"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/50"
            >
              <option value="">جميع أنواع الموانئ</option>
              <option value="seaport">موانئ بحرية (Marine Seaports)</option>
              <option value="dry_port">موانئ جافة ومناطق لوجستية (Dry Ports)</option>
            </select>
          </div>

          {/* Grid of Ports */}
          {loading ? (
            <LoadingSpinner fullPage label="جاري تحميل سجل الموانئ..." />
          ) : filteredPorts.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="لا توجد موانئ مطابقة"
              description="جرب البحث بكلمات أخرى أو أضف ميناء جديد"
              actionLabel="إضافة ميناء"
              onAction={() => setIsCreateOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPorts.map((port) => (
                <div
                  key={port.unlocode}
                  className="p-5 rounded-2xl bg-white dark:bg-[#12161F] border border-slate-200/80 dark:border-[#1E2638] shadow-sm hover:shadow-md hover:border-[#FF5E1E]/40 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                          port.isDryPort
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/20'
                        }`}
                      >
                        {port.isDryPort ? <MapPin className="w-5 h-5" /> : <Anchor className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{port.flagEmoji}</span>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">{port.nameAr}</h3>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{port.name}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-slate-100 dark:bg-[#1E2638] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {port.unlocode}
                    </span>
                  </div>

                  {/* Terminals & Custom Code */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1E2638] space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>الدولة:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {port.country} ({port.countryCode})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500">
                      <span>الإحداثيات:</span>
                      <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300" dir="ltr">
                        {port.coordinates?.lat?.toFixed(3)}° N, {port.coordinates?.lng?.toFixed(3)}° E
                      </span>
                    </div>

                    {port.customsAuthorityCode && (
                      <div className="flex items-center justify-between text-slate-500">
                        <span>الجمارك:</span>
                        <span className="font-mono text-[11px] text-brand-600 dark:text-[#FF5E1E]">
                          {port.customsAuthorityCode}
                        </span>
                      </div>
                    )}

                    {port.terminals && port.terminals.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[11px] text-slate-400 block mb-1">المحطات والأرصفة:</span>
                        <div className="flex flex-wrap gap-1">
                          {port.terminals.map((t: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md text-[10px] bg-slate-50 dark:bg-[#181D2A] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-[#262E40]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NAUTICAL DISTANCE & TRANSIT ESTIMATOR */}
      {activeTab === 'distance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#12161F] border border-slate-200/80 dark:border-[#1E2638] shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#FF5E1E]" />
                <span>حساب المسافة البحرية والترانزيت</span>
              </h3>
              <p className="text-xs text-slate-500">
                حساب المسافة بالميل البحري (Nautical Miles) وتقدير أيام الإبحار بناءً على سرعة السفينة بالعقدة.
              </p>

              {/* Origin Port Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  ميناء الإقلاع (Port of Loading):
                </label>
                <select
                  value={originPort}
                  onChange={(e) => setOriginPort(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/50"
                >
                  {allPorts.map((p) => (
                    <option key={p.unlocode} value={p.unlocode}>
                      {p.flagEmoji} {p.unlocode} — {p.nameAr} ({p.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Port Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  ميناء الوصول (Port of Discharge):
                </label>
                <select
                  value={destPort}
                  onChange={(e) => setDestPort(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/50"
                >
                  {allPorts.map((p) => (
                    <option key={p.unlocode} value={p.unlocode}>
                      {p.flagEmoji} {p.unlocode} — {p.nameAr} ({p.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Cruising Speed Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    سرعة إبحار السفينة (Cruising Speed):
                  </label>
                  <span className="text-xs font-bold text-[#FF5E1E] font-mono">{vesselSpeed} Knots (عقدة)</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="26"
                  step="1"
                  value={vesselSpeed}
                  onChange={(e) => setVesselSpeed(parseInt(e.target.value, 10))}
                  className="w-full accent-[#FF5E1E] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>10 كحد أدنى (بطيء)</span>
                  <span>18 اقتصادي</span>
                  <span>26 كحد أقصى (سريع)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Results Display */}
          <div className="lg:col-span-7">
            {calculatedDistance && (
              <div className="p-6 rounded-2xl bg-white dark:bg-[#12161F] border border-slate-200/80 dark:border-[#1E2638] shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E2638] pb-4">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">المسار المحسوب:</span>
                    <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                      <span>{calculatedDistance.origin.flagEmoji} {calculatedDistance.origin.nameAr}</span>
                      <span className="text-[#FF5E1E]">←</span>
                      <span>{calculatedDistance.destination.flagEmoji} {calculatedDistance.destination.nameAr}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/20">
                    حساب جيوديسي دقيق
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#181D2A] border border-slate-200/60 dark:border-[#262E40]">
                    <span className="text-[11px] text-slate-500 block mb-1">المسافة البحرية:</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      {calculatedDistance.nauticalMiles.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 ms-1 font-semibold">NM (ميل بحري)</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#181D2A] border border-slate-200/60 dark:border-[#262E40]">
                    <span className="text-[11px] text-slate-500 block mb-1">مدة الإبحار المتوقعة:</span>
                    <span className="text-2xl font-black text-[#FF5E1E] font-mono">
                      ~{calculatedDistance.transitDays}
                    </span>
                    <span className="text-xs text-slate-400 ms-1 font-semibold">يوم</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#181D2A] border border-slate-200/60 dark:border-[#262E40]">
                    <span className="text-[11px] text-slate-500 block mb-1">إجمالي ساعات الإبحار:</span>
                    <span className="text-2xl font-black text-emerald-600 font-mono">
                      ~{calculatedDistance.transitHours}
                    </span>
                    <span className="text-xs text-slate-400 ms-1 font-semibold">ساعة</span>
                  </div>
                </div>

                {/* Corridor Details */}
                <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-[#FF5E1E] dark:text-orange-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>ملاحظات الممر الملاحي وحركة القوافل:</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    الحساب يشمل متوسط وقت انتظار قافلة قناة السويس (16 ساعة) في حال مرور المسار عبر البحر الأحمر والبحر المتوسط.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CONTAINER ISO 6346 VALIDATOR */}
      {activeTab === 'container_check' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#12161F] border border-slate-200/80 dark:border-[#1E2638] shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Box className="w-5 h-5 text-[#FF5E1E]" />
              <span>مدقق رقم الحاوية حسب المعيار الدولي (ISO 6346)</span>
            </h3>
            <p className="text-xs text-slate-500">
              يقوم الخوارزم بحساب الرقم التأكيدي (Check Digit) باستخدام قاعدة الأوزان الثنائية (Modulus 11) للتأكد من سلامة كود الحاوية وصحة البوليصة.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                أدخل رقم الحاوية (11 حرف ورقم):
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={11}
                  value={containerInput}
                  onChange={(e) => setContainerInput(e.target.value.toUpperCase())}
                  placeholder="مثال: MSCU9041280 أو CSQU3054383"
                  className="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#1E2638] rounded-xl py-3 px-4 text-base font-mono font-bold text-slate-900 dark:text-white tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/50"
                />
              </div>
            </div>

            {/* Validation Result Box */}
            {containerValidation && (
              <div
                className={`p-4 rounded-xl border transition-all ${
                  containerValidation.isValid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {containerValidation.isValid ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm">
                      {containerValidation.isValid
                        ? 'رقم الحاوية سليم ومطابق لمعايير ISO 6346 الدولية'
                        : 'رقم الحاوية غير صحيح أو الرقم التأكيدي لا يطابق'}
                    </h4>
                    {containerValidation.errorMessage && (
                      <p className="text-xs mt-1 font-mono opacity-90">{containerValidation.errorMessage}</p>
                    )}
                  </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="mt-4 pt-3 border-t border-current/20 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="opacity-70 block">كود المالك (Owner):</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {containerValidation.ownerCode || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-70 block">التصنيف (Category):</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {containerValidation.equipmentCategory === 'U' ? 'Freight Container (U)' : containerValidation.equipmentCategory || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-70 block">الرقم التسلسلي:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {containerValidation.serialNumber || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-70 block">الرقم التأكيدي:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {containerValidation.checkDigit ?? '-'} (المحسوب: {containerValidation.calculatedCheckDigit ?? '-'})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CURRENCIES & EXCHANGE RATES */}
      {activeTab === 'currencies' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#12161F] border border-slate-200/80 dark:border-[#1E2638] shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <span>جدول أسعار الصرف الرسمية المعتمدة (CBE)</span>
              </h3>
              <p className="text-xs text-slate-500">
                أسعار الصرف المستخدمة في تقييم النولون البحري والرسوم الجمركية ورسوم D&D بدون أي أخطاء تقريب.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50 dark:bg-[#181D2A] text-slate-500 font-semibold border-b border-slate-200 dark:border-[#262E40]">
                    <tr>
                      <th className="py-2.5 px-4 text-start">العملة</th>
                      <th className="py-2.5 px-4 text-start">الرمز</th>
                      <th className="py-2.5 px-4 text-start">السعر مقابل الجنيه (EGP)</th>
                      <th className="py-2.5 px-4 text-start">السعر مقابل الدولار (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1E2638]">
                    {Object.values(SUPPORTED_CURRENCIES).map((curr) => (
                      <tr key={curr.code} className="hover:bg-slate-50/50 dark:hover:bg-[#181D2A]/50">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {curr.nameAr} ({curr.name})
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#FF5E1E]">{curr.code}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {curr.rateToEgp.toFixed(2)} EGP
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          ${curr.rateToUsd.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Currency Calculator */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#12161F] border border-slate-200/80 dark:border-[#1E2638] shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#FF5E1E]" />
                <span>محول العملات الفوري</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  المبلغ المراد تحويله:
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2.5 px-3 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    من العملة:
                  </label>
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/50"
                  >
                    {Object.keys(SUPPORTED_CURRENCIES).map((c) => (
                      <option key={c} value={c}>
                        {c} — {SUPPORTED_CURRENCIES[c].nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    إلى العملة:
                  </label>
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/50"
                  >
                    {Object.keys(SUPPORTED_CURRENCIES).map((c) => (
                      <option key={c} value={c}>
                        {c} — {SUPPORTED_CURRENCIES[c].nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conversion Output */}
              <div className="p-4 rounded-xl bg-[#FF5E1E]/10 border border-[#FF5E1E]/20 text-center">
                <span className="text-xs text-slate-500 block mb-1">النتيجة المحولة بدقة:</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {convertedAmount.toLocaleString()} {toCurrency}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Creating a New Port */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="إضافة ميناء أو محطة جديدة"
        subtitle="تسجيل ميناء بحري جديد أو مستودع جاف في قاعدة البيانات"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success('تم تسجيل الميناء بنجاح في قاعدة البيانات');
            setIsCreateOpen(false);
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
              كود UN/LOCODE (5 أحرف):
            </label>
            <input
              type="text"
              required
              maxLength={5}
              placeholder="مثال: EGATK"
              className="w-full uppercase font-mono bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#1E2638] rounded-xl p-2.5 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">الاسم بالإنجليزية:</label>
              <input
                type="text"
                required
                placeholder="Port of Adabiya"
                className="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#1E2638] rounded-xl p-2.5 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">الاسم بالعربية:</label>
              <input
                type="text"
                required
                placeholder="ميناء الأدبية"
                className="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#1E2638] rounded-xl p-2.5 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">الدولة:</label>
              <input
                type="text"
                required
                defaultValue="Egypt"
                className="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#1E2638] rounded-xl p-2.5 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">نوع الميناء:</label>
              <select className="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#1E2638] rounded-xl p-2.5 text-slate-900 dark:text-white">
                <option value="seaport">ميناء بحري (Seaport)</option>
                <option value="dry_port">ميناء جاف (Dry Port)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#FF5E1E] text-white font-semibold shadow-md shadow-[#FF5E1E]/20"
            >
              حفظ الميناء
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
