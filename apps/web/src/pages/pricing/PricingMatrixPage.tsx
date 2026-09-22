import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  Search,
  Filter,
  Ship,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  DollarSign,
  Layers,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { exportToCsv } from '../../utils/exportUtils';
import { CreateQuotationModal } from '../quotations/CreateQuotationModal';
import { MaritimeCorridorHero } from '../../components/ui/LogisticsIllustrations';
import { PortOptions } from '../../components/ui/PortSelect';
import { getPortByCode } from '../../data/worldPorts';
import { pricingService, PricingTariffRecord } from '../../services/pricingService';

interface FreightRate {
  id: string;
  shippingLine: string;
  lineCode: string;
  originPort: string;
  originPortCode: string;
  destinationPort: string;
  destinationPortCode: string;
  rate20GP: number;
  rate40HQ: number;
  currency: string;
  transitTimeDays: number;
  freeDays: number;
  routing: 'Direct' | 'Transshipment';
  transshipmentPort?: string;
  validFrom: string;
  validUntil: string;
  notes?: string;
  isSpotRate: boolean;
}

export const PricingMatrixPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const carrierParam = searchParams.get('carrier');

  const [rates, setRates] = useState<FreightRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPol, setSelectedPol] = useState('ALL');
  const [selectedPod, setSelectedPod] = useState('ALL');
  const [selectedLine, setSelectedLine] = useState(carrierParam || 'ALL');

  const loadTariffs = async () => {
    setLoading(true);
    try {
      const data = await pricingService.fetchTariffs();
      if (Array.isArray(data)) {
        // Map backend tariffs to FreightRate
        const mapped: FreightRate[] = data.map((t: any) => ({
          id: t.id,
          shippingLine: t.carrierName || t.shippingLine || 'Shipping Line',
          lineCode: t.carrierCode || t.lineCode || 'GENERIC',
          originPort: t.originPortName || t.originPort || 'Origin Port',
          originPortCode: t.originPortCode || 'POL',
          destinationPort: t.destinationPortName || t.destinationPort || 'Destination Port',
          destinationPortCode: t.destinationPortCode || 'POD',
          rate20GP: t.containerType === '20GP' ? t.sellRate : (t.rate20GP || Math.round((t.sellRate || 2200) * 0.7)),
          rate40HQ: t.containerType === '40HQ' ? t.sellRate : (t.rate40HQ || (t.sellRate || 2400)),
          currency: t.currency || 'USD',
          transitTimeDays: t.transitDaysEstimated || t.transitTimeDays || 24,
          freeDays: t.freeDaysAllowed || t.freeDays || 14,
          routing: (t.routing as any) || 'Direct',
          transshipmentPort: t.transshipmentPort,
          validFrom: t.validFrom || new Date().toISOString().slice(0, 10),
          validUntil: t.validTo || t.validUntil || '2026-10-31',
          notes: t.remarks || t.notes || '',
          isSpotRate: t.isSpotRate ?? true,
        }));
        setRates(mapped);
        setIsLiveConnected(true);
      }
    } catch (err) {
      console.warn('Using local rate cache', err);
      setIsLiveConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTariffs();
  }, []);

  useEffect(() => {
    if (carrierParam) {
      setSelectedLine(carrierParam);
    }
  }, [carrierParam]);
  const [sortBy, setSortBy] = useState<'rate40HQ' | 'rate20GP' | 'transit' | 'validUntil'>('rate40HQ');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [selectedRateForQuote, setSelectedRateForQuote] = useState<FreightRate | null>(null);

  // New Rate Form state
  const [newRate, setNewRate] = useState({
    shippingLine: 'Maersk Line',
    lineCode: 'MAEU',
    originPort: 'Shanghai Port (ميناء شنغهاي)',
    originPortCode: 'CNSHA',
    destinationPort: 'Alexandria Port (ميناء الإسكندرية)',
    destinationPortCode: 'EGALY',
    rate20GP: 1600,
    rate40HQ: 2250,
    currency: 'USD',
    transitTimeDays: 22,
    freeDays: 14,
    routing: 'Direct' as 'Direct' | 'Transshipment',
    validUntil: '2026-10-15',
    notes: '',
  });

  const filteredRates = useMemo(() => {
    return rates
      .filter((r) => {
        const matchesSearch =
          r.shippingLine.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.originPort.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.destinationPort.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.originPortCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.destinationPortCode.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesPol = selectedPol === 'ALL' || r.originPortCode === selectedPol;
        const matchesPod = selectedPod === 'ALL' || r.destinationPortCode === selectedPod;
        const matchesLine = selectedLine === 'ALL' || r.lineCode === selectedLine;

        return matchesSearch && matchesPol && matchesPod && matchesLine;
      })
      .sort((a, b) => {
        if (sortBy === 'rate40HQ') return a.rate40HQ - b.rate40HQ;
        if (sortBy === 'rate20GP') return a.rate20GP - b.rate20GP;
        if (sortBy === 'transit') return a.transitTimeDays - b.transitTimeDays;
        if (sortBy === 'validUntil') return new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime();
        return 0;
      });
  }, [rates, searchTerm, selectedPol, selectedPod, selectedLine, sortBy]);

  // Identify Best Deals in current filter
  const lowest40Rate = useMemo(() => {
    if (filteredRates.length === 0) return null;
    return Math.min(...filteredRates.map((r) => r.rate40HQ));
  }, [filteredRates]);

  const fastestTransit = useMemo(() => {
    if (filteredRates.length === 0) return null;
    return Math.min(...filteredRates.map((r) => r.transitTimeDays));
  }, [filteredRates]);

  const handleExport = () => {
    exportToCsv(
      'redshipping_freight_rates_matrix',
      filteredRates,
      [
        { header: 'الخط الملاحي', accessor: (r) => r.shippingLine },
        { header: 'كود الخط', accessor: (r) => r.lineCode },
        { header: 'ميناء الشحن (POL)', accessor: (r) => `${r.originPort} (${r.originPortCode})` },
        { header: 'ميناء الوصول (POD)', accessor: (r) => `${r.destinationPort} (${r.destinationPortCode})` },
        { header: 'نولون 20GP ($)', accessor: (r) => r.rate20GP },
        { header: 'نولون 40HQ ($)', accessor: (r) => r.rate40HQ },
        { header: 'أيام الترانزيت', accessor: (r) => r.transitTimeDays },
        { header: 'فترة السماح (Free Days)', accessor: (r) => r.freeDays },
        { header: 'نوع الرحلة', accessor: (r) => r.routing === 'Direct' ? 'مباشر (Direct)' : `ترانزيت (${r.transshipmentPort})` },
        { header: 'ساري حتى', accessor: (r) => r.validUntil },
      ],
    );
  };

  const handleCreateQuotationFromRate = (rate: FreightRate) => {
    setSelectedRateForQuote(rate);
    setIsQuotationModalOpen(true);
  };

  const handleSaveNewRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const createdRate: FreightRate = {
      id: `rate-${Date.now()}`,
      shippingLine: newRate.shippingLine,
      lineCode: newRate.lineCode,
      originPort: newRate.originPort,
      originPortCode: newRate.originPortCode,
      destinationPort: newRate.destinationPort,
      destinationPortCode: newRate.destinationPortCode,
      rate20GP: Number(newRate.rate20GP),
      rate40HQ: Number(newRate.rate40HQ),
      currency: 'USD',
      transitTimeDays: Number(newRate.transitTimeDays),
      freeDays: Number(newRate.freeDays),
      routing: newRate.routing,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: newRate.validUntil,
      notes: newRate.notes,
      isSpotRate: true,
    };

    try {
      // Persist to backend API
      await pricingService.createTariff({
        category: 'ocean',
        carrierCode: newRate.lineCode,
        carrierName: newRate.shippingLine,
        originPortCode: newRate.originPortCode,
        originPortName: newRate.originPort,
        destinationPortCode: newRate.destinationPortCode,
        destinationPortName: newRate.destinationPort,
        containerType: '40HQ',
        currency: 'USD',
        buyRate: Math.round(Number(newRate.rate40HQ) * 0.85),
        sellRate: Number(newRate.rate40HQ),
        transitDaysEstimated: Number(newRate.transitTimeDays),
        freeDaysAllowed: Number(newRate.freeDays),
        validTo: newRate.validUntil,
        remarks: newRate.notes,
      });
      setIsLiveConnected(true);
    } catch (err) {
      console.warn('Saved rate locally', err);
    }

    setRates([createdRate, ...rates]);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">مكتب التسعير ومصفوفة النولون البحري</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              تحديث يومي للخطوط
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            مقارنة فورية لنوالين الشحن البحري للخطوط الملاحية العالمية، حساب فترات السماح (Free Days)، وإصدار عروض أسعار مباشرة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live Sync Status Pill */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
            isLiveConnected 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-xs' 
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{isLiveConnected ? '🟢 متصل بالـ API ومحدث لحظياً' : '🟡 وضع الذاكرة المحلية'}</span>
          </div>

          <button
            onClick={loadTariffs}
            disabled={loading}
            title="تحديث البيانات من السيرفر"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 dark:bg-[#181D2A] dark:hover:bg-[#1E2638] dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-[#1E2638] transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FF5E1E]' : 'text-slate-500'}`} />
            <span>تحديث</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 dark:bg-[#181D2A] dark:hover:bg-[#1E2638] dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-[#1E2638] transition shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            تصدير إكسيل
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF5E1E] hover:bg-[#FF7034] text-white text-xs font-semibold shadow-lg shadow-orange-500/25 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            إضافة نولون جديد
          </button>
        </div>
      </div>
 
      {/* ── Visual Maritime Corridor Hero Banner ── */}
      <MaritimeCorridorHero
        title="مصفوفة النوالين البحرية والخطوط الملاحية"
        subtitle="عروض أسعار فورية ومقارنة دقيقة لنوالين الحاويات (20GP / 40HQ) وفترات السماح (Free Days) مع كبرى خطوط الملاحة"
        badge="محدثة لحظياً • RED SHIPPING"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">إجمالي النوالين النشطة</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#FF5E1E]">
              <Ship className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{rates.length}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">أسعار خطوط معتمدة</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">أقل سعر نولون 40HQ</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${lowest40Rate || 0}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">الصين ➔ مصر</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">أسرع زمن إبحار (Transit)</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{fastestTransit || 0} يوم</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">رحلات مباشرة Direct</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">أقصى فترة سماح أرضيات</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">21 يوم</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Free Time بدون غرامات</span>
          </div>
        </div>
      </div>


      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] p-4 rounded-2xl shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search input */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالخط الملاحي، ميناء الشحن، أو ميناء الوصول..."
              className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 ps-9 pe-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E] transition"
            />
          </div>

          {/* POL Selector */}
          <div>
            <select
              value={selectedPol}
              onChange={(e) => setSelectedPol(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]"
            >
              <PortOptions includeAllOption allOptionLabel="جميع موانئ الشحن (POL)" allOptionValue="ALL" />
            </select>
          </div>

          {/* POD Selector */}
          <div>
            <select
              value={selectedPod}
              onChange={(e) => setSelectedPod(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]"
            >
              <PortOptions includeAllOption allOptionLabel="جميع موانئ الوصول (POD)" allOptionValue="ALL" />
            </select>
          </div>

          {/* Sort selector */}
          <div>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]"
            >
              <option value="rate40HQ">ترتيب حسب: الأرخص 40HQ</option>
              <option value="rate20GP">ترتيب حسب: الأرخص 20GP</option>
              <option value="transit">ترتيب حسب: الأسرع ترانزيت</option>
              <option value="validUntil">ترتيب حسب: أقرب تاريخ صلاحية</option>
            </select>
          </div>
        </div>
      </div>

      {/* Freight Rates Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-[#FF5E1E] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium text-slate-500">جاري تحميل مصفوفة أسعار النولون...</p>
        </div>
      ) : filteredRates.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-[#111622] rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
          <Ship className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">لا توجد أسعار نولون مسجلة</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
            لم يتم العثور على أي أسعار تطابق معايير البحث المحددة. يمكنك إضافة تعريفة نولون جديدة عبر الزر أعلاه.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 text-[#FF5E1E] hover:bg-orange-500/20 text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة نولون جديد</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-7">
        {filteredRates.map((rate) => {
          const isBestPrice = rate.rate40HQ === lowest40Rate;
          const isFastest = rate.transitTimeDays === fastestTransit;
          const carrier = (() => {
            switch (rate.lineCode) {
              case 'MSCU': return { bg: 'bg-[#183059] text-[#F5B800]', border: 'border-amber-400/40', bar: 'from-[#183059] via-[#F5B800] to-[#183059]', brand: 'MSC' };
              case 'MAEU': return { bg: 'bg-[#42B0D5] text-white', border: 'border-sky-300/50', bar: 'from-[#42B0D5] via-sky-300 to-[#42B0D5]', brand: 'MAERSK' };
              case 'CMDU': return { bg: 'bg-[#002D62] text-white', border: 'border-red-500/50', bar: 'from-[#002D62] via-red-500 to-[#002D62]', brand: 'CMA CGM' };
              case 'HLCU': return { bg: 'bg-[#FF6600] text-white', border: 'border-orange-400/50', bar: 'from-[#FF6600] via-amber-400 to-[#FF6600]', brand: 'HAPAG' };
              case 'ONEY': return { bg: 'bg-[#E5007D] text-white', border: 'border-pink-400/50', bar: 'from-[#E5007D] via-rose-300 to-[#E5007D]', brand: 'ONE' };
              case 'COSU': return { bg: 'bg-[#004889] text-white', border: 'border-blue-400/50', bar: 'from-[#004889] via-cyan-400 to-[#004889]', brand: 'COSCO' };
              default: return { bg: 'bg-slate-800 text-white', border: 'border-slate-700', bar: 'from-slate-700 to-slate-800', brand: rate.lineCode };
            }
          })();

          return (
            <div
              key={rate.id}
              className={`group relative rounded-3xl bg-white dark:bg-[#111622] border transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-2xl overflow-hidden ${
                isBestPrice
                  ? 'border-emerald-500/70 ring-2 ring-emerald-500/20'
                  : 'border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Carrier Brand Accent Ribbon */}
              <div className={`h-2 w-full bg-gradient-to-r ${carrier.bar}`} />

              <div className="p-5 sm:p-6 space-y-4">
                {/* 1. Top Carrier & Routing Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm border ${carrier.bg} ${carrier.border}`}
                    >
                      {carrier.brand}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                        {rate.shippingLine}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {rate.routing === 'Direct' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>مباشر (Direct Service)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>ترانزيت ({rate.transshipmentPort})</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Best price / Fastest badge */}
                  <div className="shrink-0">
                    {isBestPrice && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-xs">
                        <span>أرخص سعر 🌟</span>
                      </span>
                    )}
                    {!isBestPrice && isFastest && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 shadow-xs">
                        <span>أسرع رحلة ⚡</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Route Corridor Lane */}
                <div className="rounded-2xl bg-slate-50/90 dark:bg-[#0B0E14] border border-slate-200/90 dark:border-slate-800/90 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    {/* Origin (POL) */}
                    <div className="flex-1 text-start">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        ميناء الشحن (POL)
                      </span>
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-white block mt-0.5">
                        {rate.originPortCode}
                      </span>
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block truncate" title={rate.originPort}>
                        {rate.originPort}
                      </span>
                    </div>

                    {/* Transit Indicator */}
                    <div className="flex flex-col items-center px-2 shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-500/10 text-[#FF5E1E] border border-orange-500/20">
                        <Clock className="w-3 h-3" />
                        <span>{rate.transitTimeDays} يوم</span>
                      </span>
                      <div className="w-16 h-0.5 bg-slate-300 dark:bg-slate-700 relative my-2">
                        <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#FF5E1E]" />
                      </div>
                    </div>

                    {/* Destination (POD) */}
                    <div className="flex-1 text-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        ميناء الوصول (POD)
                      </span>
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-white block mt-0.5">
                        {rate.destinationPortCode}
                      </span>
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block truncate" title={rate.destinationPort}>
                        {rate.destinationPort}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Container Rates Dual Manifest */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl p-3.5 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      حاوية 20GP Standard
                    </span>
                    <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      ${rate.rate20GP.toLocaleString()}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mt-0.5">
                      شامل نولون + BAF
                    </span>
                  </div>

                  <div className="rounded-2xl p-3.5 bg-emerald-500/10 dark:bg-emerald-950/25 border border-emerald-500/30 dark:border-emerald-500/40 text-center">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                      حاوية 40HQ High Cube
                    </span>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      ${rate.rate40HQ.toLocaleString()}
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700/80 dark:text-emerald-400/80 block mt-0.5">
                      سعر نولون معتمد
                    </span>
                  </div>
                </div>

                {/* 4. Specifications: Free Days & Validity */}
                <div className="space-y-2 text-xs pt-1">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>فترة السماح المجانية للغرامات:</span>
                    </span>
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {rate.freeDays} يوم وصول (Free Days)
                    </strong>
                  </div>

                  <div className="flex items-center justify-between px-1 text-[11px]">
                    <span className="text-slate-400">صلاحية السعر حتى:</span>
                    <strong className="font-mono text-slate-700 dark:text-slate-300">
                      {rate.validUntil}
                    </strong>
                  </div>

                  {rate.notes && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-xl border border-amber-200/40 dark:border-amber-800/30">
                      {rate.notes}
                    </p>
                  )}
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

              {/* 6. Ticket Bottom Stub (Barcode, Carrier Seal & Quick Quote CTA) */}
              <div className="p-5 sm:p-6 bg-slate-50/60 dark:bg-[#0E121C]/60 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between gap-3">
                  {/* Freight Barcode */}
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
                      * TARIFF-{rate.lineCode}-{rate.originPortCode}-{rate.destinationPortCode} *
                    </span>
                  </div>

                  {/* Official Carrier Stamp */}
                  <div className="shrink-0">
                    <div
                      className={`inline-flex flex-col items-center justify-center p-1 rounded-full select-none pointer-events-none -rotate-12 transition-transform duration-300 group-hover:rotate-0 border-2 border-dashed text-[#FF5E1E] dark:text-[#FF7A45] border-[#FF5E1E]/50 dark:border-[#FF7A45]/50 bg-[#FF5E1E]/5`}
                    >
                      <div className="w-[72px] h-[72px] rounded-full border border-current flex flex-col items-center justify-center p-1 text-center leading-none">
                        <span className="text-[6.5px] font-black uppercase tracking-wider block opacity-90">
                          ★ OCEAN TARIFF ★
                        </span>
                        <span className="text-[9.5px] font-extrabold leading-tight my-0.5 block">
                          نولون معتمد
                        </span>
                        <span className="text-[6.5px] font-mono tracking-tighter block opacity-85">
                          {carrier.brand} VALIDATED
                        </span>
                        <span className="text-[5.5px] font-mono tracking-tighter opacity-70 block mt-0.5">
                          FREIGHT 2026
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action CTA Button */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <button
                    onClick={() => handleCreateQuotationFromRate(rate)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FF5E1E] to-[#EA580C] hover:from-[#FF7034] hover:to-[#FF5E1E] text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 transition-all cursor-pointer hover:scale-[1.01]"
                  >
                    <span>إصدار عرض سعر فوري للعميل</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Add New Rate Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#1E2638] bg-slate-50 dark:bg-[#0E121A]/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 text-[#FF5E1E] flex items-center justify-center">
                  <Ship className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">إضافة نولون بحري جديد لمصفوفة الأسعار</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewRate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الخط الملاحي</label>
                  <select
                    value={newRate.shippingLine}
                    onChange={(e) => {
                      const name = e.target.value;
                      const code = name.includes('Maersk') ? 'MAEU' : name.includes('MSC') ? 'MSCU' : name.includes('CMA') ? 'CMDU' : 'HLCU';
                      setNewRate({ ...newRate, shippingLine: name, lineCode: code });
                    }}
                    className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Maersk Line">Maersk Line</option>
                    <option value="MSC (Mediterranean Shipping Co)">MSC (Mediterranean Shipping Co)</option>
                    <option value="CMA CGM Group">CMA CGM Group</option>
                    <option value="Hapag-Lloyd">Hapag-Lloyd</option>
                    <option value="COSCO Shipping Lines">COSCO Shipping Lines</option>
                    <option value="ONE (Ocean Network Express)">ONE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">نوع الرحلة</label>
                  <select
                    value={newRate.routing}
                    onChange={(e: any) => setNewRate({ ...newRate, routing: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Direct">مباشر (Direct)</option>
                    <option value="Transshipment">ترانزيت (Transshipment)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ميناء الشحن (POL)</label>
                  <select
                    value={newRate.originPortCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const port = getPortByCode(code);
                      setNewRate({ ...newRate, originPortCode: code, originPort: port ? `${port.name} (${port.nameAr})` : code });
                    }}
                    className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                  >
                    <PortOptions />
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ميناء الوصول (POD)</label>
                  <select
                    value={newRate.destinationPortCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const port = getPortByCode(code);
                      setNewRate({ ...newRate, destinationPortCode: code, destinationPort: port ? `${port.name} (${port.nameAr})` : code });
                    }}
                    className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                  >
                    <PortOptions />
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">نولون حاوية 20GP ($)</label>
                  <input
                    type="number"
                    required
                    value={newRate.rate20GP}
                    onChange={(e) => setNewRate({ ...newRate, rate20GP: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">نولون حاوية 40HQ ($)</label>
                  <input
                    type="number"
                    required
                    value={newRate.rate40HQ}
                    onChange={(e) => setNewRate({ ...newRate, rate40HQ: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">فترة السماح (Free Days)</label>
                  <input
                    type="number"
                    required
                    value={newRate.freeDays}
                    onChange={(e) => setNewRate({ ...newRate, freeDays: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ساري حتى تاريخ</label>
                  <input
                    type="date"
                    required
                    value={newRate.validUntil}
                    onChange={(e) => setNewRate({ ...newRate, validUntil: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ملاحظات إضافية (اختياري)</label>
                <input
                  type="text"
                  value={newRate.notes}
                  onChange={(e) => setNewRate({ ...newRate, notes: e.target.value })}
                  placeholder="مثال: يشمل عوائد الوقود وشهادة الوزن المعتمد VGM"
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#1E2638]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#181D2A] dark:hover:bg-[#1E2638] dark:text-slate-300 text-xs font-semibold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#FF5E1E] hover:bg-[#FF7034] text-white text-xs font-semibold shadow-lg shadow-orange-500/25 transition"
                >
                  حفظ في مصفوفة الأسعار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instant Quotation Modal */}
      {isQuotationModalOpen && (
        <CreateQuotationModal
          isOpen={isQuotationModalOpen}
          onClose={() => {
            setIsQuotationModalOpen(false);
            setSelectedRateForQuote(null);
          }}
          onSuccess={() => {
            setIsQuotationModalOpen(false);
            navigate('/quotations');
          }}
        />
      )}
    </div>
  );
};
