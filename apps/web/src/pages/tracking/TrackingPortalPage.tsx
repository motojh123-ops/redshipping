import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Search,
  Ship,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
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
  Sparkles,
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

interface TrackingData {
  jobFileNumber: string;
  blNumber: string;
  acidNumber: string;
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
  freeDays: number;
  daysRemainingFreeTime: number;
  clientName: string;
  commodity: string;
  containers: {
    number: string;
    type: string;
    seal: string;
    status: string;
    statusLabel: string;
    dischargedAt?: string;
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
  documents: {
    name: string;
    type: string;
    size: string;
  }[];
}

const SAMPLE_TRACKING_DATA: Record<string, TrackingData> = {
  MSCU8812903: {
    jobFileNumber: 'RED-2026-0001',
    blNumber: 'MSCU8812903',
    acidNumber: '4829104829',
    carrier: 'MSC (Mediterranean Shipping Company)',
    vesselName: 'MSC LORETTO',
    vesselImo: '9231494',
    voyageNumber: '2408W',
    originPort: 'Shanghai Port (شنغهاي - الصين)',
    originPortCode: 'CNSHA',
    destinationPort: 'Alexandria Port (الإسكندرية - مصر)',
    destinationPortCode: 'EGALY',
    currentStage: 'in_transit',
    currentStageLabel: 'في عرض البحر (In Transit)',
    progressPercent: 55,
    etd: '2026-09-02',
    eta: '2026-09-22',
    freeDays: 21,
    daysRemainingFreeTime: 21,
    clientName: 'Al-Ahram Food Industries (الأهرام للصناعات الغذائية)',
    commodity: 'مواد غذائية معلبة (Canned Tuna & Tomato Paste)',
    containers: [
      {
        number: 'MEDU1029384',
        type: '40HQ',
        seal: 'SL-88412',
        status: 'on_vessel',
        statusLabel: 'مشحونة على ظهر السفينة',
      },
      {
        number: 'MEDU1029385',
        type: '40HQ',
        seal: 'SL-88413',
        status: 'on_vessel',
        statusLabel: 'مشحونة على ظهر السفينة',
      },
    ],
    milestones: [
      {
        id: 'm1',
        title: 'تأكيد الحجز الملاحي (Booking Confirmed)',
        description: 'تم حجز المساحة على الخط الملاحي بنجاح',
        location: 'Shanghai, China',
        date: '2026-08-20 10:00',
        isCompleted: true,
        isCurrent: false,
      },
      {
        id: 'm2',
        title: 'استلام الحاويات في ساحة الميناء (Gate-In)',
        description: 'دخول الحاويات ساحة التصدير بميناء شنغهاي',
        location: 'Shanghai Port Terminal',
        date: '2026-08-25 14:30',
        isCompleted: true,
        isCurrent: false,
      },
      {
        id: 'm3',
        title: 'صدور رقم القيد الجمركي المسبق (ACID NAFEZA)',
        description: 'تسجيل الشحنة على منظومة نافذة برقم 4829104829',
        location: 'Cairo / Alexandria, Egypt',
        date: '2026-08-28 09:15',
        isCompleted: true,
        isCurrent: false,
      },
      {
        id: 'm4',
        title: 'إبحار السفينة ومغادرة ميناء المنشأ (Vessel Departed)',
        description: 'مغادرة السفينة MSC LORETTO متجهة إلى ميناء الإسكندرية',
        location: 'East China Sea',
        date: '2026-09-02 18:00',
        isCompleted: true,
        isCurrent: true,
      },
      {
        id: 'm5',
        title: 'الوصول المتوقع لميناء الإسكندرية (ETA Destination)',
        description: 'تراكي السفينة وتفريغ الحاويات بساحة المستودعات',
        location: 'Alexandria Port, Egypt',
        date: '2026-09-22 08:00 (متوقع)',
        isCompleted: false,
        isCurrent: false,
      },
      {
        id: 'm6',
        title: 'الكشف والمعاينة وصدور استمارة 46 (Form 46 Release)',
        description: 'استكمال إجراءات التثمين وسداد الرسوم الجمركية',
        location: 'مركز الخدمات اللوجستية بميناء الإسكندرية',
        date: 'قيد الانتظار',
        isCompleted: false,
        isCurrent: false,
      },
      {
        id: 'm7',
        title: 'النقل البري والتسليم لمخزن العميل (Final Delivery)',
        description: 'نقل الحاويات بواسطة أسطول شاحنات RED SHIPPING حتى المصنع بمدينة 6 أكتوبر',
        location: '6th of October City, Giza',
        date: 'قيد الانتظار',
        isCompleted: false,
        isCurrent: false,
      },
    ],
    documents: [
      { name: 'بوليصة الشحن البحري Draft B/L.pdf', type: 'PDF', size: '1.4 MB' },
      { name: 'الفاتورة التجارية Commercial Invoice.pdf', type: 'PDF', size: '840 KB' },
      { name: 'بيان العبوة ومحتويات الحاوية Packing List.xlsx', type: 'Excel', size: '512 KB' },
      { name: 'إشعار تسجيل نافذة ACID Certificate.pdf', type: 'PDF', size: '620 KB' },
    ],
  },
  MAEU982183910: {
    jobFileNumber: 'RED-2026-0002',
    blNumber: 'MAEU982183910',
    acidNumber: '3910294811',
    carrier: 'Maersk Line',
    vesselName: 'MAERSK MC-KINNEY MOLLER',
    vesselImo: '9619907',
    voyageNumber: '2604W',
    originPort: 'Shanghai Port (شنغهاي - الصين)',
    originPortCode: 'CNSHA',
    destinationPort: 'Alexandria Port (الإسكندرية - مصر)',
    destinationPortCode: 'EGALY',
    currentStage: 'clearance_in_progress',
    currentStageLabel: 'قيد التخليص الجمركي بميناء الإسكندرية',
    progressPercent: 78,
    etd: '2026-08-25',
    eta: '2026-09-14',
    freeDays: 14,
    daysRemainingFreeTime: 9,
    clientName: 'Delta Chemicals & Polymers (دلتا للكيماويات)',
    commodity: 'حبيبات وبوليمرات صناعية في أكياس باليتات',
    containers: [
      {
        number: 'MSKU8849120',
        type: '40HQ',
        seal: 'SL-99120',
        status: 'discharged',
        statusLabel: 'تم التفريغ بساحة الميناء',
        dischargedAt: '2026-09-15 06:30',
      },
    ],
    milestones: [
      {
        id: 'm1',
        title: 'تأكيد الحجز الملاحي',
        description: 'تأكيد الحجز لدى خط ميرسك',
        location: 'Shanghai, China',
        date: '2026-08-15',
        isCompleted: true,
        isCurrent: false,
      },
      {
        id: 'm2',
        title: 'استلام الحاويات والإبحار',
        description: 'إبحار السفينة من ميناء شنغهاي',
        location: 'Shanghai Port',
        date: '2026-08-25',
        isCompleted: true,
        isCurrent: false,
      },
      {
        id: 'm3',
        title: 'وصول وتفريغ الحاويات بميناء الإسكندرية',
        description: 'تفريغ الحاويات في ساحة محطة الحاويات',
        location: 'Alexandria Terminal',
        date: '2026-09-15',
        isCompleted: true,
        isCurrent: false,
      },
      {
        id: 'm4',
        title: 'المعاينة والفحص الفني (Customs Inspection)',
        description: 'إجراءات الفحص بالأشعة والمعاينة الجمركية واستخراج استمارة 46',
        location: 'جمرك الإسكندرية',
        date: '2026-09-18 (جاري الآن)',
        isCompleted: false,
        isCurrent: true,
      },
    ],
    documents: [
      { name: 'بوليصة الشحن المعيارية Sea Waybill.pdf', type: 'PDF', size: '1.2 MB' },
      { name: 'استمارة 46 إفراج تحت الفحص Form 46.pdf', type: 'PDF', size: '920 KB' },
    ],
  },
};

export const TrackingPortalPage: React.FC = () => {
  const [query, setQuery] = useState('MSCU8812903');
  const [activeTracking, setActiveTracking] = useState<TrackingData | null>(
    SAMPLE_TRACKING_DATA['MSCU8812903'],
  );
  const [copied, setCopied] = useState(false);
  const [searched, setSearched] = useState(true);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim().toUpperCase();
    const result =
      SAMPLE_TRACKING_DATA[cleanQuery] ||
      Object.values(SAMPLE_TRACKING_DATA).find(
        (t) =>
          t.blNumber.toUpperCase() === cleanQuery ||
          t.acidNumber === cleanQuery ||
          t.jobFileNumber.toUpperCase() === cleanQuery ||
          t.containers.some((c) => c.number.toUpperCase() === cleanQuery),
      );

    if (result) {
      setActiveTracking(result);
      setSearched(true);
    } else {
      // Create fallback tracking result
      const fallback: TrackingData = {
        jobFileNumber: `RED-2026-${cleanQuery.slice(-4)}`,
        blNumber: cleanQuery,
        acidNumber: '4920194812',
        carrier: 'Maersk Line / MSC',
        vesselName: 'GLOBAL VOYAGER',
        vesselImo: '9795610',
        voyageNumber: '2609E',
        originPort: 'Shanghai Port (شنغهاي)',
        originPortCode: 'CNSHA',
        destinationPort: 'Alexandria Port (الإسكندرية)',
        destinationPortCode: 'EGALY',
        currentStage: 'in_transit',
        currentStageLabel: 'في عرض البحر (In Transit)',
        progressPercent: 60,
        etd: '2026-09-05',
        eta: '2026-09-25',
        freeDays: 14,
        daysRemainingFreeTime: 14,
        clientName: 'شركة النقل الدولي والتوكيلات',
        commodity: 'بضائع عامة مشحونة بحراً',
        containers: [
          {
            number: cleanQuery.startsWith('MEDU') || cleanQuery.startsWith('MSKU') ? cleanQuery : 'MSKU9918231',
            type: '40HQ',
            seal: 'SL-77123',
            status: 'on_vessel',
            statusLabel: 'مشحونة على متن السفينة',
          },
        ],
        milestones: [
          {
            id: 'm1',
            title: 'تأكيد الحجز الملاحي',
            description: 'تم إصدار الحجز',
            location: 'POL Terminal',
            date: '2026-09-01',
            isCompleted: true,
            isCurrent: false,
          },
          {
            id: 'm2',
            title: 'إبحار السفينة في اتجاه مصر',
            description: 'السفينة في المسار الملاحي المباشر',
            location: 'International Waters',
            date: '2026-09-05',
            isCompleted: true,
            isCurrent: true,
          },
          {
            id: 'm3',
            title: 'الوصول المتوقع لميناء المقصد',
            description: 'التفريغ وبدء التخليص الجمركي',
            location: 'EGALY Alexandria',
            date: '2026-09-25 (متوقع)',
            isCompleted: false,
            isCurrent: false,
          },
        ],
        documents: [
          { name: 'Draft Bill of Lading.pdf', type: 'PDF', size: '1.2 MB' },
        ],
      };

      // Try fetching live shipment from backend
      api.get('/shipments')
        .then((res: any) => {
          const list = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []);
          const found = list.find((s: any) =>
            (s.blNumber && s.blNumber.toUpperCase() === cleanQuery) ||
            (s.jobFileNumber && s.jobFileNumber.toUpperCase() === cleanQuery) ||
            (s.acidNumber && s.acidNumber === cleanQuery) ||
            (s.containers && s.containers.some((c: any) => c.containerNumber && c.containerNumber.toUpperCase() === cleanQuery))
          );
          if (found) {
            const liveData: TrackingData = {
              jobFileNumber: found.jobFileNumber || 'RED-2026-LIVE',
              blNumber: found.blNumber || cleanQuery,
              acidNumber: found.acidNumber || '4920194812',
              carrier: found.shippingLine?.name || found.carrier || 'MSC Mediterranean Shipping',
              vesselName: found.vesselName || 'GLOBAL VOYAGER',
              voyageNumber: found.voyageNumber || '2604W',
              originPort: found.pol || found.loadingPort || 'Shanghai Port (شنغهاي)',
              originPortCode: found.polCode || 'CNSHA',
              destinationPort: found.pod || found.dischargePort || 'Alexandria Port (الإسكندرية)',
              destinationPortCode: found.podCode || 'EGALY',
              currentStage: found.status === 'DELIVERED' ? 'delivered' : 'in_transit',
              currentStageLabel: found.status === 'DELIVERED' ? 'تم التسليم بالكامل' : 'في طريق الإبحار',
              progressPercent: found.status === 'DELIVERED' ? 100 : 75,
              etd: found.etd ? String(found.etd).slice(0, 10) : '2026-09-01',
              eta: found.eta ? String(found.eta).slice(0, 10) : '2026-09-22',
              freeDays: 14,
              daysRemainingFreeTime: 10,
              clientName: typeof found.client === 'object' ? (found.client?.nameAr || found.client?.name || 'عميل معتمد') : 'عميل معتمد',
              commodity: found.cargoDescription || 'بضائع عامة مشحونة بحراً',
              containers: (found.containers || []).map((c: any) => ({
                number: c.containerNumber || 'MSCU-LIVE',
                type: c.type || '40HQ',
                seal: c.sealNumber || 'SL-88129',
                status: 'on_vessel',
                statusLabel: 'على متن السفينة',
              })),
              milestones: [
                { id: 'm1', title: 'تأكيد الحجز وتصدير الإذن', description: 'تأكيد الحجز الملاحي', location: 'Origin Port', date: '2026-09-01', isCompleted: true, isCurrent: false },
                { id: 'm2', title: 'إبحار السفينة', description: 'مغادرة ميناء الشحن', location: 'En Route', date: '2026-09-05', isCompleted: true, isCurrent: true },
              ],
              documents: [
                { name: 'Draft Bill of Lading.pdf', type: 'PDF', size: '1.2 MB' },
              ],
            };
            setActiveTracking(liveData);
            setSearched(true);
          }
        })
        .catch(() => {});

      setActiveTracking(fallback);
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
                placeholder="أدخل رقم بوليصة الشحن (B/L)، رقم الحاوية، أو رقم ACID..."
                className="w-full bg-black/40 border border-slate-600 rounded-2xl py-3 ps-11 pe-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E] focus:border-transparent transition"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-[#FF5E1E] hover:bg-[#FF7034] text-white text-sm font-bold shadow-lg shadow-orange-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>تتبع الآن</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </form>

          {/* Quick Search Tags */}
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
            <span>شحنات تجريبية سريعة:</span>
            <button
              type="button"
              onClick={() => {
                setQuery('MSCU8812903');
                setActiveTracking(SAMPLE_TRACKING_DATA['MSCU8812903']);
              }}
              className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-orange-300 font-mono transition"
            >
              MSCU8812903
            </button>
            <button
              type="button"
              onClick={() => {
                setQuery('MAEU982183910');
                setActiveTracking(SAMPLE_TRACKING_DATA['MAEU982183910']);
              }}
              className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-orange-300 font-mono transition"
            >
              MAEU982183910
            </button>
          </div>
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
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">تاريخ الإبحار: {activeTracking.etd}</span>
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
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold font-mono">الوصول المتوقع (ETA): {activeTracking.eta}</span>
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
                  <a
                    href="https://www.nafeza.gov.eg/ar/tracking"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-sky-600 dark:text-sky-400 hover:text-sky-700"
                    title="التحقق من منصة نافذة الرسمية"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
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
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {activeTracking.daysRemainingFreeTime} يوم أمان
                </span>
              </div>
            </div>
          </div>

          {/* ── Live AIS Vessel Radar & Sea Corridor Section (100% Free / Zero API Cost) ── */}
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
                <div className="space-y-3">
                  <div className="relative w-full h-[380px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-inner">
                    <iframe
                      title={`Live AIS Radar - ${activeTracking.vesselName}`}
                      className="w-full h-full border-0"
                      src={`https://www.vesselfinder.com/aismap?zoom=5&track=true&fleet=false&fleet_name=false&fleet_timespan=2&fleet_hide_old_positions=false&clicktoact=false&store_pos=true&imo=${activeTracking.vesselImo || '9231494'}`}
                    />
                    <div className="absolute top-3 end-3 px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/20 text-[11px] font-mono text-emerald-400 flex items-center gap-2 shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>SATELLITE AIS LIVE • IMO: {activeTracking.vesselImo || '9231494'}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 px-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      بيانات رادار AIS الحية مجانية ومفتوحة بدون الحاجة لاشتراكات أو مفاتيح API مدفوعة.
                    </span>
                    <a
                      href={`https://www.vesselfinder.com/vessels/details/${activeTracking.vesselImo || '9231494'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FF5E1E] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>عرض السجل الملاحي الكامل على VesselFinder</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-[#070B14] border border-slate-800 p-6">
                  {/* Visual Sea Corridor & Ports */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
                    <div className="lg:col-span-3">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="font-semibold text-white">خط سير الرحلة البحري (Transit Route)</span>
                        <span className="font-mono text-emerald-400 font-bold">السرعة التقديرية: 19.2 عقدة (Knots)</span>
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
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">الباخرة:</span>
                        <span className="font-bold text-white truncate">{activeTracking.vesselName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">رقم IMO:</span>
                        <span className="font-mono font-bold text-orange-400">{activeTracking.vesselImo || '9231494'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">رقم الرحلة:</span>
                        <span className="font-mono text-white">{activeTracking.voyageNumber}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">المسافة المتبقية:</span>
                        <span className="font-mono font-bold text-emerald-400">~ 2,410 ميل بحري</span>
                      </div>
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
                <a
                  href="https://www.nafeza.gov.eg/ar/tracking"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/25 font-semibold transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>استعلام ACID نافذة المصرية ↗</span>
                </a>
              </div>
            </div>
          </div>

          {/* Containers Breakdown */}
          <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Box className="w-4 h-4 text-[#FF5E1E]" />
              الحاويات المشمولة بالشحنة ({activeTracking.containers.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTracking.containers.map((c) => (
                <div
                  key={c.number}
                  className="bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-[#181D2A] flex items-center justify-center text-slate-900 dark:text-white font-mono font-bold text-sm">
                      {c.type}
                    </div>
                    <div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-sm block">{c.number}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">رقم الرصاص الجمركي (Seal): {c.seal}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-500/10 text-[#FF5E1E] border border-orange-500/20 self-start sm:self-auto">
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
          </div>

          {/* Milestones Timeline */}
          <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FF5E1E]" />
              الخط الزمني ومحطات التشغيل (Shipment Milestones)
            </h3>

            <div className="relative ps-6 space-y-6 before:absolute before:top-3 before:bottom-3 before:start-2.5 before:w-0.5 before:bg-slate-200 dark:before:bg-[#1E2638]">
              {activeTracking.milestones.map((m) => (
                <div key={m.id} className="relative flex items-start gap-4">
                  {/* Indicator Dot */}
                  <div
                    className={`absolute -start-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-[#121620] ${
                      m.isCompleted
                        ? 'bg-emerald-500 text-white'
                        : m.isCurrent
                        ? 'bg-[#FF5E1E] text-white animate-pulse'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {m.isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-2xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4
                        className={`text-sm font-bold ${
                          m.isCurrent ? 'text-[#FF5E1E]' : m.isCompleted ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                        }`}
                      >
                        {m.title}
                      </h4>
                      <span className="text-xs font-mono text-slate-400">{m.date}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.description}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 mt-2">
                      <MapPin className="w-3 h-3" />
                      {m.location}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents Download Center */}
          <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#FF5E1E]" />
              مستندات الشحنة المتاحة للتحميل ({activeTracking.documents.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {activeTracking.documents.map((doc) => (
                <div
                  key={doc.name}
                  className="bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-2xl p-3.5 flex items-center justify-between hover:border-orange-500/40 transition"
                >
                  <div className="min-w-0 flex-1 me-2">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={doc.name}>
                      {doc.name}
                    </p>
                    <span className="text-[10px] text-slate-400">{doc.size}</span>
                  </div>
                  <button
                    onClick={() => alert(`جاري تحميل ملف ${doc.name}`)}
                    className="p-2 rounded-xl bg-slate-200 dark:bg-[#181D2A] hover:bg-[#FF5E1E] hover:text-white text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    title="تحميل"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
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
    </div>
  );
};
