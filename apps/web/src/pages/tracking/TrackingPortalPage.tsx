import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { buildNafezaValidateUrl } from '../../services/customsService';
import {
  Search,
  Ship,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Download,
  Share2,
  Anchor,
  Box,
  Truck,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Phone,
  Copy,
  Check,
  Radio,
  Satellite,
  Globe,
  Compass,
  User,
} from 'lucide-react';

export const getCarrierTrackingUrl = (carrier: string, trackingNumber: string): string => {
  const c = (carrier || '').toUpperCase();
  const q = encodeURIComponent((trackingNumber || '').trim());
  if (c.includes('MSC') || q.startsWith('MEDU') || q.startsWith('MSCU')) {
    return `https://www.msc.com/en/track-a-shipment?trackingNumber=${q}`;
  }
  if (c.includes('MAERSK') || q.startsWith('MSKU') || q.startsWith('MAEU')) {
    return `https://www.maersk.com/tracking/${q}`;
  }
  if (c.includes('CMA') || c.includes('CGM') || q.startsWith('CMAU')) {
    return `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&SearchValue=${q}`;
  }
  if (c.includes('COSCO') || q.startsWith('COSU') || q.startsWith('CBHU')) {
    return `https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=CONTAINER&number=${q}`;
  }
  if (c.includes('HAPAG') || q.startsWith('HLXU') || q.startsWith('HLCU')) {
    return `https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container=${q}`;
  }
  if (c.includes('EVERGREEN') || q.startsWith('EGLV') || q.startsWith('EMCU')) {
    return `https://www.shipmentlink.com/servlet/TTrk_Tracking?quick_type=CONTAINER&quick_no=${q}`;
  }
  if (c.includes('ONE') || q.startsWith('ONEU')) {
    return `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?ctracType=cntr&ctracNo=${q}`;
  }
  return `https://www.track-trace.com/container`;
};

// ── Shipment stage metadata (matches @banna/shared-types ShipmentStage) ──────
const STAGE_META: { stage: string; label: string; progress: number }[] = [
  { stage: 'booking_confirmed', label: 'تأكيد الحجز', progress: 8 },
  { stage: 'cargo_received', label: 'استلام البضاعة', progress: 18 },
  { stage: 'customs_submitted', label: 'إيداع المستندات جمركياً', progress: 26 },
  { stage: 'acid_issued', label: 'صدور نافذة (ACID)', progress: 34 },
  { stage: 'in_transit', label: 'في البحر (In Transit)', progress: 55 },
  { stage: 'arrived_destination', label: 'وصول الميناء', progress: 70 },
  { stage: 'clearance_in_progress', label: 'قيد التخليص الجمركي', progress: 82 },
  { stage: 'release_issued', label: 'إفراج جمركي صادر', progress: 90 },
  { stage: 'out_for_delivery', label: 'خارج للتسليم', progress: 96 },
  { stage: 'delivered', label: 'تم التسليم', progress: 100 },
  { stage: 'closed', label: 'مغلق ومسوى', progress: 100 },
];

const stageIndex = (stage?: string) =>
  STAGE_META.findIndex((s) => s.stage === (stage || '').toLowerCase());

const stageLabel = (stage?: string) => {
  const i = stageIndex(stage);
  return i >= 0 ? STAGE_META[i].label : (stage || '—');
};

const stageProgress = (stage?: string) => {
  const i = stageIndex(stage);
  return i >= 0 ? STAGE_META[i].progress : 10;
};

const CONTAINER_STATUS_LABEL: Record<string, string> = {
  booked: 'محجوزة',
  loaded: 'محمّلة',
  on_board: 'على متن السفينة',
  discharged: 'تم التفريغ بالميناء',
  gated_out: 'خرجت من الميناء',
  delivered: 'تم تسليمها',
  returned_empty: 'أعيدت فارغة',
};

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : date.toISOString().slice(0, 10);
};

const fmtDaysRemaining = (eta?: string | null, freeDays?: number | null) => {
  if (!eta || !freeDays) return null;
  const etaDate = new Date(eta);
  if (isNaN(etaDate.getTime())) return null;
  const deadline = new Date(etaDate.getTime() + freeDays * 86400000);
  return Math.ceil((deadline.getTime() - Date.now()) / 86400000);
};

interface TrackingData {
  id: string;
  jobFileNumber: string;
  blNumber: string;
  acidNumber: string;
  acidExpiryDate: string | null;
  carrier: string;
  vesselName: string;
  vesselImo?: string;
  voyageNumber: string;
  originPort: string;
  originPortCode: string;
  destinationPort: string;
  destinationPortCode: string;
  currentStage: string;
  currentStageLabel: string;
  progressPercent: number;
  etd: string;
  eta: string;
  ata: string | null;
  freeDays: number;
  daysRemainingFreeTime: number | null;
  clientName: string;
  commodity: string;
  grossWeightKg: number | null;
  volumeCbm: number | null;
  packageCount: number | null;
  containers: {
    id: string;
    number: string;
    type: string;
    seal: string;
    status: string;
    statusLabel: string;
    dischargedAt?: string | null;
  }[];
  milestones: {
    id: string;
    title: string;
    description: string;
    location: string;
    date: string;
    isCompleted: boolean;
    isCurrent: boolean;
  }[];
}

export const TrackingPortalPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeTracking, setActiveTracking] = useState<TrackingData | null>(null);
  const [copied, setCopied] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [radarMode, setRadarMode] = useState<'corridor' | 'satellite'>('corridor');
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    api.get('/shipments')
      .then((res: any) => {
        if (res) {
          setIsLiveConnected(true);
        }
      })
      .catch(() => setIsLiveConnected(false));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim().toUpperCase();
    if (!cleanQuery) return;

    setIsSearching(true);
    try {
      // Fetch tenant shipments + customs dossiers (for real ACID numbers) in parallel
      const shipmentsPromise: Promise<any> = api.get('/shipments');
      const dossiersPromise: Promise<any> = api.get('/customs').catch(() => []);
      const [shipmentsRes, dossiersRes] = await Promise.all([shipmentsPromise, dossiersPromise]);
      const list: any[] = Array.isArray(shipmentsRes) ? shipmentsRes : (Array.isArray(shipmentsRes?.items) ? shipmentsRes.items : []);
      const dossiers: any[] = Array.isArray(dossiersRes) ? dossiersRes : [];

      const found = list.find((s: any) =>
        (s.blNumber && s.blNumber.toUpperCase().includes(cleanQuery)) ||
        (s.jobFileNumber && s.jobFileNumber.toUpperCase().includes(cleanQuery)) ||
        (s.containers && s.containers.some((c: any) => c.containerNumber && c.containerNumber.toUpperCase().includes(cleanQuery)))
      );

      if (found) {
        // Match the customs dossier via shipmentId (dossiers include a nested shipment)
        const dossier = dossiers.find((d: any) => d.shipmentId === found.id || d.shipment?.id === found.id);
        const acidNumber = dossier?.acidNumber || null;

        const originPort = found.originPort as { code?: string; nameEn?: string; nameAr?: string } | null | undefined;
        const destinationPort = found.destinationPort as { code?: string; nameEn?: string; nameAr?: string } | null | undefined;
        const stage = (found.currentStage || '').toLowerCase();
        const freeDays = Number(found.freeDaysAllowed) || 14;
        const delivered = stage === 'delivered' || stage === 'closed';

        // Real event timeline (newest first from API) → chronological milestones
        const events: any[] = Array.isArray(found.events) ? [...found.events] : [];
        events.sort((a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime());

        const milestones = events.map((ev, idx) => ({
          id: ev.id,
          title: stageLabel(ev.toStage),
          description: ev.notes || '',
          location: ev.location || '',
          date: fmtDate(ev.eventAt),
          isCompleted: true,
          isCurrent: idx === events.length - 1 && !delivered,
        }));

        const liveData: TrackingData = {
          id: found.id,
          jobFileNumber: found.jobFileNumber || '—',
          blNumber: found.blNumber || cleanQuery,
          acidNumber: acidNumber || '—',
          acidExpiryDate: dossier?.acidExpiryDate ? String(dossier.acidExpiryDate) : null,
          carrier: found.shippingLine?.name || 'الخط الملاحي',
          vesselName: found.vesselName || '—',
          vesselImo: found.vesselImo || undefined,
          voyageNumber: found.voyageNumber || '—',
          originPort: originPort?.nameAr || originPort?.nameEn || 'غير محدد',
          originPortCode: originPort?.code || 'POL',
          destinationPort: destinationPort?.nameAr || destinationPort?.nameEn || 'غير محدد',
          destinationPortCode: destinationPort?.code || 'POD',
          currentStage: stage,
          currentStageLabel: stageLabel(stage),
          progressPercent: stageProgress(stage),
          etd: fmtDate(found.etd),
          eta: fmtDate(found.eta),
          ata: found.ata ? String(found.ata) : null,
          freeDays,
          daysRemainingFreeTime: fmtDaysRemaining(found.eta, freeDays),
          clientName: found.client?.name || 'عميل معتمد',
          commodity: found.cargoDescription || 'بضائع مشحونة',
          grossWeightKg: found.grossWeightKg != null ? Number(found.grossWeightKg) : null,
          volumeCbm: found.volumeCbm != null ? Number(found.volumeCbm) : null,
          packageCount: found.packageCount != null ? Number(found.packageCount) : null,
          containers: (found.containers || []).map((c: any) => {
            const statusKey = (c.status || 'booked').toLowerCase();
            return {
              id: c.id,
              number: c.containerNumber || '—',
              type: c.containerType || '—',
              seal: c.sealNumber || '—',
              status: statusKey,
              statusLabel: CONTAINER_STATUS_LABEL[statusKey] || statusKey,
              dischargedAt: c.dischargedAt ? fmtDate(c.dischargedAt) : null,
            };
          }),
          milestones,
        };
        setActiveTracking(liveData);
      } else {
        setActiveTracking(null);
      }
    } catch {
      setActiveTracking(null);
    } finally {
      setIsSearching(false);
      setSearched(true);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!activeTracking) return;
    const text = `تتبع شحنة RED SHIPPING للخدمات اللوجستية:\nرقم البوليصة: ${activeTracking.blNumber}\nرقم نافذة ACID: ${activeTracking.acidNumber}\nالحالة: ${activeTracking.currentStageLabel}\nالسفينة: ${activeTracking.vesselName} (${activeTracking.voyageNumber})\nالوصول المتوقع: ${activeTracking.eta}\nرابط التتبع: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const telemetry = useMemo(() => {
    if (!activeTracking) return null;
    return [
      { label: 'الباخرة:', value: activeTracking.vesselName, mono: false, bold: true },
      { label: 'رقم IMO:', value: activeTracking.vesselImo || '—', mono: true, bold: true },
      { label: 'رقم الرحلة:', value: activeTracking.voyageNumber, mono: true, bold: false },
      { label: 'الوزن القائم:', value: activeTracking.grossWeightKg != null ? `${activeTracking.grossWeightKg.toLocaleString()} كجم` : '—', mono: true, bold: true },
      { label: 'الحجم:', value: activeTracking.volumeCbm != null ? `${activeTracking.volumeCbm.toLocaleString()} م³` : '—', mono: true, bold: false },
      { label: 'عدد الطرود:', value: activeTracking.packageCount != null ? String(activeTracking.packageCount) : '—', mono: true, bold: false },
    ];
  }, [activeTracking]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-slate-950 border border-red-500/25 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl">
        <img
          src="/images/port_hero.jpg"
          alt="Tracking Ports Network"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-25 mix-blend-luminosity pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-[#0A111F]/90 to-[#120B1C]/85 pointer-events-none" />
        <div className="absolute -top-12 -end-12 w-64 h-64 bg-red-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="max-w-2xl text-start">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30">
                  <Anchor className="w-3.5 h-3.5" />
                  <span>بوابة التتبع المباشر للشحنات والحاويات الملاحية</span>
                </div>
                {isLiveConnected && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Sync: /shipments
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                تتبع شحنتك لحظة بلحظة مع RED SHIPPING
              </h1>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                متابعة دقيقة لمراحل الإبحار، تفريغ الحاويات بالموانئ المصرية، إجراءات منظومة نافذة (ACID)، وفترات السماح المجانية لتفادي غرامات الأرضيات
              </p>
            </div>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute start-3.5 top-3.5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="أدخل رقم بوليصة الشحن (B/L)، رقم ملف الشحنة، أو رقم الحاوية..."
                className="w-full bg-black/40 border border-slate-600 rounded-2xl py-3 ps-11 pe-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E] focus:border-transparent transition"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3 rounded-2xl bg-[#FF5E1E] hover:bg-[#FF7034] text-white text-sm font-bold shadow-lg shadow-orange-500/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span>{isSearching ? 'جاري البحث...' : 'تتبع الآن'}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </form>
        </div>
      </div>

      {/* Tracking Results Card */}
      {searched && activeTracking && (
        <div className="space-y-6">
          {/* Main Status Header Card */}
          <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E2638]">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 rounded-xl bg-orange-500/10 text-[#FF5E1E] border border-orange-500/20 text-xs font-bold font-mono">
                    {activeTracking.jobFileNumber}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    بوليصة شحن: <span className="font-mono text-[#FF5E1E]">{activeTracking.blNumber}</span>
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    {activeTracking.carrier}
                  </span>
                  {/* Direct Official Carrier Link */}
                  <a
                    href={getCarrierTrackingUrl(activeTracking.carrier, activeTracking.blNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition"
                    title={`فتح الاستعلام الرسمي المباشر على بوابة ${activeTracking.carrier}`}
                  >
                    <Globe className="w-3.5 h-3.5 text-[#FF5E1E]" />
                    <span>تتبع البوليصة على موقع الخط الرسمي</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  العميل: <strong className="text-slate-800 dark:text-slate-200">{activeTracking.clientName}</strong> • البضاعة: {activeTracking.commodity}
                </p>
              </div>

              {/* Share & Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  مشاركة عبر واتساب
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#181D2A] dark:hover:bg-[#1E2638] text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-[#1E2638] transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'تم النسخ!' : 'نسخ الرابط'}
                </button>
              </div>
            </div>

            {/* Route Voyage Section */}
            <div className="py-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* POL */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#FF5E1E] shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">ميناء الشحن والمنشأ (POL)</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white block">{activeTracking.originPort}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{activeTracking.originPortCode} • تاريخ الإبحار: {activeTracking.etd}</span>
                </div>
              </div>

              {/* Transit Center */}
              <div className="flex flex-col items-center justify-center text-center px-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#FF5E1E]">
                  <Ship className="w-4 h-4 animate-bounce" />
                  <span>{activeTracking.vesselName} ({activeTracking.voyageNumber})</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-[#181D2A] h-2 rounded-full mt-2 relative overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#FF5E1E] to-emerald-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${activeTracking.progressPercent}%` }}
                  ></div>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                  الحالة: <strong className="text-slate-900 dark:text-white">{activeTracking.currentStageLabel}</strong> ({activeTracking.progressPercent}%)
                </span>
              </div>

              {/* POD */}
              <div className="flex items-start gap-3 md:justify-end text-start md:text-end">
                <div className="order-2 md:order-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">ميناء الوصول والمقصد (POD)</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white block">{activeTracking.destinationPort}</span>
                  {activeTracking.ata ? (
                    <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold font-mono">تم الوصول فعلياً: {activeTracking.ata}</span>
                  ) : (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold font-mono">الوصول المتوقع (ETA): {activeTracking.eta}</span>
                  )}
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 order-1 md:order-2">
                  <Anchor className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar: Free Days & ACID with Nafeza link */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-200 dark:border-[#1E2638] text-xs">
              <div className="bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#FF5E1E]" />
                  <span className="text-slate-500 dark:text-slate-400">رقم القيد الجمركي NAFEZA:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{activeTracking.acidNumber}</span>
                  {activeTracking.acidNumber !== '—' && (
                    <a
                      href={buildNafezaValidateUrl(activeTracking.acidNumber)}
                      onClick={() => navigator.clipboard?.writeText(activeTracking.acidNumber).catch(() => {})}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-sky-600 dark:text-sky-400 hover:text-sky-700"
                      title={`التحقق من صلاحية رقم ACID ${activeTracking.acidNumber} على منصة نافذة الرسمية (تم نسخ الرقم للحفظ)`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span className="text-slate-500 dark:text-slate-400">فترة سماح الأرضيات (Free Days):</span>
                </div>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{activeTracking.freeDays} يوم</span>
              </div>

              <div className="bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span className="text-slate-500 dark:text-slate-400">الأيام المتبقية قبل الغرامة:</span>
                </div>
                <span className={`font-bold font-mono ${
                  activeTracking.daysRemainingFreeTime == null
                    ? 'text-slate-400'
                    : activeTracking.daysRemainingFreeTime <= 3
                    ? 'text-rose-600 dark:text-rose-400'
                    : activeTracking.daysRemainingFreeTime <= 7
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {activeTracking.daysRemainingFreeTime == null
                    ? 'بعد تحديد موعد الوصول'
                    : activeTracking.daysRemainingFreeTime <= 0
                    ? 'انتهت الفترة — غرامات مستحقة'
                    : `${activeTracking.daysRemainingFreeTime} يوم`}
                </span>
              </div>
            </div>
          </div>

          {/* ── Live AIS Vessel Radar & Sea Corridor Section ── */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    رادار التتبع الملاحي الحي (Live AIS Radar & Corridor)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    مجاني 100% • بدون اشتراك
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  تتبع حركة الباخرة <strong className="text-white font-mono">{activeTracking.vesselName}</strong> عبر رادار الأقمار الصناعية (AIS) المفتوح أو خريطة الممر الملاحي
                </p>
              </div>

              {/* Radar Mode Switcher */}
              <div className="flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setRadarMode('corridor')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    radarMode === 'corridor'
                      ? 'bg-[#FF5E1E] text-white shadow-md shadow-orange-500/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>الممر الملاحي والمسار</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRadarMode('satellite')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    radarMode === 'satellite'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Satellite className="w-3.5 h-3.5" />
                  <span>رادار الأقمار الصناعية (AIS Live)</span>
                </button>
              </div>
            </div>

            {/* Active Radar Display */}
            <div className="pt-4">
              {radarMode === 'satellite' ? (
                activeTracking.vesselImo ? (
                  <div className="relative w-full h-[380px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-inner">
                    <iframe
                      title={`Live AIS Radar - ${activeTracking.vesselName}`}
                      className="w-full h-full border-0"
                      src={`https://www.vesselfinder.com/aismap?zoom=5&track=true&fleet=false&fleet_name=false&fleet_timespan=2&fleet_hide_old_positions=false&clicktoact=false&store_pos=true&imo=${activeTracking.vesselImo}`}
                    />
                    <div className="absolute top-3 end-3 px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/20 text-[11px] font-mono text-emerald-400 flex items-center gap-2 shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>SATELLITE AIS LIVE • IMO: {activeTracking.vesselImo}</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-[380px] rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 flex flex-col items-center justify-center text-center p-8">
                    <Satellite className="w-10 h-10 text-slate-600 mb-3" />
                    <p className="text-sm font-bold text-slate-300">رقم IMO غير مسجل لهذه السفينة</p>
                    <p className="text-xs text-slate-500 mt-1">
                      أضف رقم IMO للسفينة في ملف الشحنة لتفعيل رادار AIS الحي عبر VesselFinder
                    </p>
                  </div>
                )
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-[#070B14] border border-slate-800 p-6">
                  {/* Visual Sea Corridor & Ports */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
                    <div className="lg:col-span-3">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="font-semibold text-white">خط سير الرحلة البحري (Transit Route)</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {activeTracking.progressPercent >= 100
                            ? 'اكتملت الرحلة ✓'
                            : 'قيد الإبحار'}
                        </span>
                      </div>
                      {/* SVG Corridor */}
                      <svg viewBox="0 0 700 120" className="w-full h-auto drop-shadow-lg">
                        <defs>
                          <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3B82F6" />
                            <stop offset="50%" stopColor="#FF5E1E" />
                            <stop offset="100%" stopColor="#10B981" />
                          </linearGradient>
                        </defs>
                        <path d="M 50,60 Q 200,20 350,60 T 650,60" fill="none" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
                        <path d="M 50,60 Q 200,20 350,60 T 650,60" fill="none" stroke="url(#trackGrad)" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 6" />

                        {/* Waypoints */}
                        <circle cx="50" cy="60" r="8" fill="#3B82F6" />
                        <circle cx="50" cy="60" r="14" fill="#3B82F6" fillOpacity="0.25" />
                        <text x="50" y="95" fill="#94A3B8" fontSize="11" textAnchor="middle" fontWeight="bold">{activeTracking.originPortCode}</text>

                        {/* Canal Point */}
                        <circle cx="350" cy="60" r="5" fill="#F59E0B" />
                        <text x="350" y="95" fill="#F59E0B" fontSize="10" textAnchor="middle">قناة السويس / باب المندب</text>

                        {/* Destination Point */}
                        <circle cx="650" cy="60" r="8" fill="#10B981" />
                        <circle cx="650" cy="60" r="14" fill="#10B981" fillOpacity="0.25" />
                        <text x="650" y="95" fill="#10B981" fontSize="11" textAnchor="middle" fontWeight="bold">{activeTracking.destinationPortCode}</text>

                        {/* Moving Vessel Pointer */}
                        <g transform={`translate(${50 + (600 * (activeTracking.progressPercent / 100))}, 60)`}>
                          <circle cx="0" cy="0" r="10" fill="#FF5E1E" className="animate-ping" fillOpacity="0.4" />
                          <circle cx="0" cy="0" r="7" fill="#FF5E1E" stroke="#FFFFFF" strokeWidth="2" />
                        </g>
                      </svg>
                    </div>

                    {/* Quick Marine Telemetry Specs */}
                    <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-2.5 text-xs">
                      {telemetry?.map((t) => (
                        <div key={t.label} className="flex items-center justify-between gap-3">
                          <span className="text-slate-400 shrink-0">{t.label}</span>
                          <span className={`${t.mono ? 'font-mono' : ''} ${t.bold ? 'font-bold' : ''} text-white truncate`} title={t.value}>
                            {t.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Official Direct Carrier Trace Bar (Zero-Cost Verification) */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 font-medium">
                استعلام رسمي مباشر لدى الناقل البحري دون وسطاء:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={getCarrierTrackingUrl(activeTracking.carrier, activeTracking.blNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition"
                >
                  <Globe className="w-3.5 h-3.5 text-[#FF5E1E]" />
                  <span>بوابة تتبع {activeTracking.carrier} الرسمية ↗</span>
                </a>
                {activeTracking.acidNumber !== '—' && (
                  <a
                    href={buildNafezaValidateUrl(activeTracking.acidNumber)}
                    onClick={() => navigator.clipboard?.writeText(activeTracking.acidNumber).catch(() => {})}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/25 font-semibold transition"
                    title={`الاستعلام عن صلاحية ACID ${activeTracking.acidNumber} على منصة نافذة الرسمية (تم نسخ الرقم للحفظ)`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>استعلام ACID نافذة المصرية ↗</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Containers Breakdown */}
          <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Box className="w-4 h-4 text-[#FF5E1E]" />
              الحاويات المشمولة بالشحنة ({activeTracking.containers.length})
            </h3>

            {activeTracking.containers.length === 0 ? (
              <p className="text-xs text-slate-400">لم يتم تسجيل حاويات على ملف الشحنة بعد</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTracking.containers.map((c) => (
                  <div
                    key={c.id}
                    className="bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-[#181D2A] flex items-center justify-center text-slate-900 dark:text-white font-mono font-bold text-[10px] px-1">
                        {c.type}
                      </div>
                      <div>
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-sm block">{c.number}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">رقم الرصاص الجمركي (Seal): {c.seal}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold self-start sm:self-auto border ${
                        c.status === 'returned_empty' || c.status === 'delivered'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : c.status === 'discharged' || c.status === 'gated_out'
                          ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                          : c.status === 'on_board'
                          ? 'bg-orange-500/10 text-[#FF5E1E] border-orange-500/20'
                          : 'bg-slate-200/60 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" />
                        {c.statusLabel}
                      </span>
                      {c.dischargedAt && (
                        <span className="text-[10px] text-slate-400 block">تفريغ: {c.dischargedAt}</span>
                      )}
                      {/* Direct Carrier Trace Link for Container */}
                      <a
                        href={getCarrierTrackingUrl(activeTracking.carrier, c.number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF5E1E] hover:underline mt-0.5"
                        title={`استعلام حي عن الحاوية ${c.number} على موقع ${activeTracking.carrier}`}
                      >
                        <span>تتبع الحاوية على موقع الخط الرسمي</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Milestones Timeline — real ShipmentEvent history */}
          <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FF5E1E]" />
              الخط الزمني ومحطات التشغيل (Shipment Milestones)
            </h3>

            {activeTracking.milestones.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  لم تُسجل محطات تشغيل بعد — يظهر الخط الزمني تلقائياً عند تحديث مراحل الشحنة من فريق العمليات
                </p>
              </div>
            ) : (
              <div className="relative ps-6 space-y-6 before:absolute before:top-3 before:bottom-3 before:start-2.5 before:w-0.5 before:bg-slate-200 dark:before:bg-[#1E2638]">
                {activeTracking.milestones.map((m) => (
                  <div key={m.id} className="relative flex items-start gap-4">
                    {/* Indicator Dot */}
                    <div
                      className={`absolute -start-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-[#121620] ${
                        m.isCurrent
                          ? 'bg-[#FF5E1E] text-white animate-pulse'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {m.isCurrent ? (
                        <div className="w-2 h-2 rounded-full bg-current"></div>
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-2xl p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {m.title}
                        </h4>
                        <span className="text-xs font-mono text-slate-400">{m.date}</span>
                      </div>
                      {m.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.description}</p>
                      )}
                      {m.location && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 mt-2">
                          <MapPin className="w-3 h-3" />
                          {m.location}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cargo & Documents Summary */}
          <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#FF5E1E]" />
              تفاصيل البضاعة
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-2xl p-3.5">
                <Truck className="w-4 h-4 text-[#FF5E1E] mb-2" />
                <p className="text-slate-500 dark:text-slate-400">نوع الشحنة</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {activeTracking.milestones.length > 0 || activeTracking.containers.length > 0 ? 'شحنة بحرية' : '—'}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-2xl p-3.5">
                <Box className="w-4 h-4 text-[#FF5E1E] mb-2" />
                <p className="text-slate-500 dark:text-slate-400">الوزن القائم الإجمالي</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                  {activeTracking.grossWeightKg != null ? `${activeTracking.grossWeightKg.toLocaleString()} كجم` : '—'}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-2xl p-3.5">
                <Ship className="w-4 h-4 text-[#FF5E1E] mb-2" />
                <p className="text-slate-500 dark:text-slate-400">حجم البضاعة</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                  {activeTracking.volumeCbm != null ? `${activeTracking.volumeCbm.toLocaleString()} م³` : '—'}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-2xl p-3.5">
                <Calendar className="w-4 h-4 text-[#FF5E1E] mb-2" />
                <p className="text-slate-500 dark:text-slate-400">عدد الطرود</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                  {activeTracking.packageCount != null ? activeTracking.packageCount : '—'}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 flex items-center gap-1.5">
              <Download className="w-3 h-3" />
              مستندات الشحنة (بوليصة الشحن، القيد المسبق، شهادة الإفراج 46) متاحة للتحميل من صفحة تفاصيل الشحنة بعد اكتمال التسجيل
            </p>
          </div>

          {/* Need Help Footer Banner */}
          <div className="bg-slate-50 dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#FF5E1E]" />
              <span>هل تحتاج إلى مساعدة أو استفسار بخصوص شحنتك؟ فريق عمليات RED SHIPPING جاهز على مدار الساعة</span>
            </div>
            <a
              href="tel:+20227948800"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-2 shadow-sm"
            >
              <span>اتصل بغرفة العمليات: +20 2 2794 8800</span>
            </a>
          </div>
        </div>
      )}

      {searched && !activeTracking && (
        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] rounded-3xl p-12 text-center shadow-sm">
          <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">لم يتم العثور على شحنة مطابقة</h3>
          <p className="text-xs text-slate-400">تأكد من إدخال رقم ملف الشحنة (مثال: BAN-2026-0001) أو رقم بوليصة الشحن B/L أو رقم الحاوية بشكل صحيح</p>
        </div>
      )}
    </div>
  );
};
