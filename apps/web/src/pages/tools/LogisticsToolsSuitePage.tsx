import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  ShieldAlert,
  FileSearch,
  Plane,
  Leaf,
  Radar,
  Ship,
  Truck,
  ArrowRight,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Calculator,
  Download,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Compass,
  Anchor,
  Globe,
  Boxes,
  Maximize2,
  Layers,
  FileCheck2,
  Activity,
  Zap,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   DATA & PRESETS
───────────────────────────────────────────────────────────── */

const SHIPPING_LINES_RATES: Record<
  string,
  { name: string; freeDaysDefault: number; t1: number; t2: number; t3: number }
> = {
  MSCU: { name: 'MSC (Mediterranean Shipping Co)', freeDaysDefault: 21, t1: 45, t2: 85, t3: 160 },
  MAEU: { name: 'Maersk Line', freeDaysDefault: 14, t1: 50, t2: 95, t3: 175 },
  CMDU: { name: 'CMA CGM Group', freeDaysDefault: 14, t1: 45, t2: 85, t3: 160 },
  HLCU: { name: 'Hapag-Lloyd', freeDaysDefault: 14, t1: 55, t2: 100, t3: 180 },
  ONEY: { name: 'ONE (Ocean Network Express)', freeDaysDefault: 14, t1: 45, t2: 90, t3: 165 },
  COSU: { name: 'COSCO Shipping', freeDaysDefault: 14, t1: 40, t2: 80, t3: 150 },
};

const SAMPLE_DOCS = [
  {
    id: 'sample-bl-msc',
    title: 'بوليصة شحن ملاحية رسمية (MSC Ocean B/L)',
    type: 'B/L',
    carrier: 'MSC Mediterranean Shipping',
    fileRef: 'MSCU89128392.pdf',
    data: {
      blNumber: 'MSCU89128392',
      containerNumber: 'MSCU9021847',
      sealNumber: 'EGY-88910',
      shipper: 'Ningbo Suntech Solar Technology Co., Ltd.',
      consignee: 'شركة الأهرام للهندسة والمقاولات والتوريدات',
      pol: 'Ningbo Port (CNNGB) - China',
      pod: 'Alexandria Port (EGALY) - Egypt',
      vesselVoyage: 'MSC TINA / 2603W',
      grossWeight: '22,450 KG',
      cbm: '68.20 CBM',
      packages: '48 Pallets / 960 Cartons',
      hsCode: '8541.40.90 (خلايا وألواح طاقة شمسية)',
      cargoValue: '$48,200 USD',
      freightTerms: 'Freight Prepaid (نولون مدفوع مسبقاً)',
    },
  },
  {
    id: 'sample-inv-cma',
    title: 'فاتورة تجارية وبحث بنود (Commercial Invoice)',
    type: 'Invoice',
    carrier: 'CMA CGM',
    fileRef: 'INV-2026-0941.pdf',
    data: {
      blNumber: 'CMDU9920194',
      containerNumber: 'CMAU1182903',
      sealNumber: 'ML-002914',
      shipper: 'Milan Industrial Valves S.p.A - Italy',
      consignee: 'العالمية للاستيراد والتصدير والمحابس الصناعية',
      pol: 'Genoa Port (ITGOA) - Italy',
      pod: 'Sokhna Port (EGSOK) - Egypt',
      vesselVoyage: 'CMA CGM MOZART / 001E',
      grossWeight: '18,300 KG',
      cbm: '36.50 CBM',
      packages: '24 Steel Crates',
      hsCode: '8481.80.10 (محابس وصمامات ضغط صناعي)',
      cargoValue: '€62,800 EUR',
      freightTerms: 'FOB Genoa (شحن على ظهر السفينة)',
    },
  },
];

const VESSELS_RADAR_DATA = [
  {
    id: 'vessel-1',
    name: 'MSC TINA',
    imo: '9725134',
    mmsi: '372481000',
    type: 'Container Ship (Ultra Large)',
    flag: 'Panama 🇵🇦',
    built: 2017,
    capacity: '19,224 TEU',
    length: '398m × 59m',
    status: 'Underway Using Engine (مبحرة)',
    speed: '17.4 Knots (عقدة)',
    course: '142° (جنوب شرق)',
    draught: '14.8 m',
    currentLocation: 'قناة السويس - المدخل الشمالي (بورسعيد)',
    coordinates: '31.2653° N, 32.3019° E',
    origin: 'Shanghai (CNSHA)',
    destination: 'Alexandria (EGALY)',
    eta: '2026-09-22 14:00 (خلال 22 ساعة)',
    riskFactor: 'Low • Weather Clear',
  },
  {
    id: 'vessel-2',
    name: 'MAERSK MC-KINNEY MOLLER',
    imo: '9619907',
    mmsi: '219018271',
    type: 'Container Ship (Triple-E Class)',
    flag: 'Denmark 🇩🇰',
    built: 2013,
    capacity: '18,270 TEU',
    length: '399m × 59m',
    status: 'Anchored (في منطقة المخطاف الخارجي)',
    speed: '0.2 Knots',
    course: '310°',
    draught: '15.2 m',
    currentLocation: 'منطقة المخطاف الخارجي - ميناء الدخيلة',
    coordinates: '31.1412° N, 29.8055° E',
    origin: 'Ningbo (CNNGB)',
    destination: 'Dekheila Port (EGDXH)',
    eta: 'وصلت - انتظار دخول الرصيف رقم 96',
    riskFactor: 'Port Congestion • 12h Delay',
  },
  {
    id: 'vessel-3',
    name: 'CMA CGM JACQUES SAADE',
    imo: '9839179',
    mmsi: '228386700',
    type: 'LNG-Powered Container Ship',
    flag: 'France 🇫🇷',
    built: 2020,
    capacity: '23,112 TEU (عملاقة الغاز المسال)',
    length: '400m × 61m',
    status: 'Underway Using Engine',
    speed: '18.9 Knots',
    course: '178° (جنوباً)',
    draught: '15.9 m',
    currentLocation: 'مضيق باب المندب - جنوب البحر الأحمر',
    coordinates: '12.5833° N, 43.3333° E',
    origin: 'Shenzhen (CNSZX)',
    destination: 'Sokhna Port (EGSOK)',
    eta: '2026-09-24 08:30 (خلال 3 أيام)',
    riskFactor: 'Maritime Security Corridor Active',
  },
];

export const LogisticsToolsSuitePage: React.FC = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  // Active Tool Tab
  const [activeTab, setActiveTab] = useState<'demurrage' | 'ocr' | 'airfreight' | 'carbon' | 'ais'>('demurrage');

  /* ─────────────────────────────────────────────────────────────
     1. DEMURRAGE & DETENTION STATE
  ───────────────────────────────────────────────────────────── */
  const [dCarrier, setDCarrier] = useState('MSCU');
  const [dContainerSize, setDContainerSize] = useState<'20' | '40'>('40');
  const [dDischargeDate, setDDischargeDate] = useState('2026-09-02');
  const [dFreeDays, setDFreeDays] = useState(21);
  const [dGateOutDate, setDGateOutDate] = useState('2026-09-27');
  const [dExchangeRate, setDExchangeRate] = useState(49.5);

  const demurrageCalculation = useMemo(() => {
    const discharge = new Date(dDischargeDate);
    const gateOut = new Date(dGateOutDate);
    const diffTime = gateOut.getTime() - discharge.getTime();
    const totalDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const remaining = dFreeDays - totalDays;
    const overdueDays = Math.max(0, totalDays - dFreeDays);

    const line = SHIPPING_LINES_RATES[dCarrier] || SHIPPING_LINES_RATES.MSCU;
    const sizeMultiplier = dContainerSize === '40' ? 1.8 : 1.0;

    let penaltyUsd = 0;
    if (overdueDays > 0) {
      const tier1Days = Math.min(overdueDays, 7);
      const tier2Days = Math.min(Math.max(0, overdueDays - 7), 7);
      const tier3Days = Math.max(0, overdueDays - 14);

      penaltyUsd =
        tier1Days * (line.t1 * sizeMultiplier) +
        tier2Days * (line.t2 * sizeMultiplier) +
        tier3Days * (line.t3 * sizeMultiplier);
    }

    const penaltyEgp = penaltyUsd * dExchangeRate;

    return {
      totalDays,
      remaining,
      overdueDays,
      penaltyUsd,
      penaltyEgp,
      status:
        overdueDays > 0
          ? 'critical'
          : remaining <= 3
          ? 'warning'
          : 'safe',
    };
  }, [dDischargeDate, dGateOutDate, dFreeDays, dCarrier, dContainerSize, dExchangeRate]);

  /* ─────────────────────────────────────────────────────────────
     2. AI OCR SCANNER STATE
  ───────────────────────────────────────────────────────────── */
  const [selectedDoc, setSelectedDoc] = useState(SAMPLE_DOCS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(100);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const triggerScan = (doc: (typeof SAMPLE_DOCS)[0]) => {
    setSelectedDoc(doc);
    setIsScanning(true);
    setScanProgress(15);
    setTimeout(() => setScanProgress(55), 250);
    setTimeout(() => setScanProgress(85), 500);
    setTimeout(() => {
      setScanProgress(100);
      setIsScanning(false);
    }, 750);
  };

  const copyValue = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  /* ─────────────────────────────────────────────────────────────
     3. AIR FREIGHT & VOLUMETRIC STATE
  ───────────────────────────────────────────────────────────── */
  const [packagesCount, setPackagesCount] = useState<number>(10);
  const [pkgLength, setPkgLength] = useState<number>(120); // cm
  const [pkgWidth, setPkgWidth] = useState<number>(80); // cm
  const [pkgHeight, setPkgHeight] = useState<number>(100); // cm
  const [pkgGrossWeight, setPkgGrossWeight] = useState<number>(180); // kg per piece
  const [airDivisor, setAirDivisor] = useState<number>(6000); // IATA 6000 or Courier 5000

  const airCalculations = useMemo(() => {
    const singleVolCbm = (pkgLength * pkgWidth * pkgHeight) / 1000000;
    const totalCbm = singleVolCbm * packagesCount;

    const singleVolWeight = (pkgLength * pkgWidth * pkgHeight) / airDivisor;
    const totalVolumetricWeight = singleVolWeight * packagesCount;

    const totalGrossWeight = pkgGrossWeight * packagesCount;
    const chargeableWeight = Math.max(totalGrossWeight, totalVolumetricWeight);
    const isVolumetric = totalVolumetricWeight > totalGrossWeight;

    // Ocean container utilization (40HQ = ~68 CBM, 20GP = ~33 CBM)
    const utilization20GP = Math.min(100, (totalCbm / 33) * 100);
    const utilization40HQ = Math.min(100, (totalCbm / 68) * 100);

    return {
      singleVolCbm,
      totalCbm,
      totalVolumetricWeight,
      totalGrossWeight,
      chargeableWeight,
      isVolumetric,
      ratio: totalGrossWeight > 0 ? (totalVolumetricWeight / totalGrossWeight).toFixed(2) : '1.0',
      utilization20GP,
      utilization40HQ,
    };
  }, [packagesCount, pkgLength, pkgWidth, pkgHeight, pkgGrossWeight, airDivisor]);

  /* ─────────────────────────────────────────────────────────────
     4. CARBON FOOTPRINT (CO2e) STATE
  ───────────────────────────────────────────────────────────── */
  const [carbonMode, setCarbonMode] = useState<'sea' | 'air' | 'road'>('sea');
  const [cargoWeightTons, setCargoWeightTons] = useState<number>(24);
  const [distanceKm, setDistanceKm] = useState<number>(9800); // e.g. Shanghai to Alexandria
  const [fuelType, setFuelType] = useState<'standard' | 'lng' | 'bio'>('standard');

  const carbonCalculation = useMemo(() => {
    // Emission factors (g CO2e per ton-km) according to GLEC standards
    let factor = 12; // Sea default
    if (carbonMode === 'sea') {
      if (fuelType === 'lng') factor = 8.5;
      else if (fuelType === 'bio') factor = 4.2;
      else factor = 12.0; // VLSFO
    } else if (carbonMode === 'air') {
      factor = 602.0; // Long-haul freighter
    } else if (carbonMode === 'road') {
      factor = 62.0; // Heavy duty diesel truck
    }

    const totalGrams = factor * cargoWeightTons * distanceKm;
    const totalKg = totalGrams / 1000;
    const totalTons = totalKg / 1000;

    // Trees required for annual offset (1 tree absorbs ~21.77 kg CO2 / year)
    const treesRequired = Math.ceil(totalKg / 21.77);

    return {
      factor,
      totalKg: Math.round(totalKg),
      totalTons: totalTons.toFixed(2),
      treesRequired,
      ecoScore: carbonMode === 'sea' ? 'A+' : carbonMode === 'road' ? 'B' : 'D',
    };
  }, [carbonMode, cargoWeightTons, distanceKm, fuelType]);

  /* ─────────────────────────────────────────────────────────────
     5. AIS VESSEL RADAR STATE
  ───────────────────────────────────────────────────────────── */
  const [selectedVessel, setSelectedVessel] = useState(VESSELS_RADAR_DATA[0]);
  const [searchImo, setSearchImo] = useState('');

  const filteredVessels = useMemo(() => {
    if (!searchImo.trim()) return VESSELS_RADAR_DATA;
    const q = searchImo.toLowerCase().trim();
    return VESSELS_RADAR_DATA.filter(
      (v) => v.name.toLowerCase().includes(q) || v.imo.includes(q) || v.origin.toLowerCase().includes(q),
    );
  }, [searchImo]);

  return (
    <div className="space-y-8 pb-12">
      {/* ── 1. Executive Suite Header ── */}
      <div className="relative rounded-3xl overflow-hidden bg-white/95 dark:bg-[#111622]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-8 shadow-sm transition-all duration-300">
        <div className="absolute top-0 end-0 w-96 h-96 bg-gradient-to-bl from-[#FF5E1E]/15 via-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 start-0 w-80 h-80 bg-gradient-to-tr from-sky-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl text-start">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-orange-500/15 via-emerald-500/15 to-sky-500/15 border border-orange-500/20 text-[#FF5E1E] text-xs font-black shadow-xs">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>منظومة الذكاء اللوجستي العالمية • Global Logistics Intelligence Suite</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              أدوات التشغيل والتتبع والمحاكاة اللوجستية المتقدمة
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              حزمة أدوات متكاملة ومجانية 100% بدون أي اشتراكات: محرك إنذارات غرامات الأرضيات (D&D)، القارئ الذكي لبوالص الشحن بالـ AI OCR، حاسبة الشحن الجوي والـ CBM، مقياس البصمة الكربونية، ورادار التتبع الفضائي المباشر للسفن.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>خوارزميات معتمدة دولياً (IATA • GLEC • NAFEZA)</span>
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                بدون استهلاك API خارجي مدفوع
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/shipments')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#FF5E1E] to-[#EA580C] hover:from-[#FF7034] hover:to-[#FF5E1E] text-white text-xs sm:text-sm font-bold shadow-lg shadow-orange-500/25 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Ship className="w-4 h-4" />
              <span>العودة للشحنات النشطة</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Unified 5-Tool Navigation Switcher ── */}
      <div className="p-2 rounded-3xl bg-white dark:bg-[#111622] border border-slate-200/90 dark:border-slate-800/90 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {/* Tab 1 */}
          <button
            onClick={() => setActiveTab('demurrage')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'demurrage'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>محرك غرامات الأرضيات (D&D Engine)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'demurrage' ? 'bg-white/20 text-white' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            }`}>
              حي
            </span>
          </button>

          {/* Tab 2 */}
          <button
            onClick={() => setActiveTab('ocr')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'ocr'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <FileSearch className="w-4 h-4" />
            <span>المستخرج الذكي للبوالص (AI OCR)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'ocr' ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}>
              AI
            </span>
          </button>

          {/* Tab 3 */}
          <button
            onClick={() => setActiveTab('airfreight')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'airfreight'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Plane className="w-4 h-4" />
            <span>حاسبة الشحن الجوي والـ CBM</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'airfreight' ? 'bg-white/20 text-white' : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
            }`}>
              IATA
            </span>
          </button>

          {/* Tab 4 */}
          <button
            onClick={() => setActiveTab('carbon')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'carbon'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Leaf className="w-4 h-4" />
            <span>البصمة الكربونية (CO2e Emissions)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'carbon' ? 'bg-white/20 text-white' : 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
            }`}>
              ESG
            </span>
          </button>

          {/* Tab 5 */}
          <button
            onClick={() => setActiveTab('ais')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'ais'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <Radar className="w-4 h-4" />
            <span>رادار التتبع الفضائي (Live AIS)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'ais' ? 'bg-white/20 text-white' : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
            }`}>
              Space
            </span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
         TAB 1: DEMURRAGE & DETENTION (D&D) RISK ENGINE
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'demurrage' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          {/* Input Form Column */}
          <div className="lg:col-span-6 rounded-3xl bg-white dark:bg-[#111622] border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    بيانات الحاوية وفترة السماح الممنوحة
                  </h2>
                  <span className="text-xs text-slate-500">حساب شرائح غرامات الأرضيات والحراسات بالميناء</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                1 USD = {dExchangeRate} EGP
              </span>
            </div>

            {/* Carrier Select */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                التوكيل الملاحي (Shipping Line)
              </label>
              <select
                value={dCarrier}
                onChange={(e) => {
                  const val = e.target.value;
                  setDCarrier(val);
                  setDFreeDays(SHIPPING_LINES_RATES[val]?.freeDaysDefault || 14);
                }}
                className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/40"
              >
                {Object.entries(SHIPPING_LINES_RATES).map(([code, data]) => (
                  <option key={code} value={code}>
                    {data.name} ({code})
                  </option>
                ))}
              </select>
            </div>

            {/* Container Size & Free Days */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                  مقاس ونوع الحاوية
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setDContainerSize('20')}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      dContainerSize === '20'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    20GP Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setDContainerSize('40')}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      dContainerSize === '40'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    40HQ High Cube
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                  فترة السماح (Free Days)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={dFreeDays}
                    onChange={(e) => setDFreeDays(Number(e.target.value))}
                    className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white font-mono font-bold"
                  />
                  <span className="absolute end-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                    يوم وصول
                  </span>
                </div>
              </div>
            </div>

            {/* Dates: Discharged vs Gate-out */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                  تاريخ تفريغ الحاوية بالميناء
                </label>
                <input
                  type="date"
                  value={dDischargeDate}
                  onChange={(e) => setDDischargeDate(e.target.value)}
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                  تاريخ الخروج / إرجاع الفارغ
                </label>
                <input
                  type="date"
                  value={dGateOutDate}
                  onChange={(e) => setDGateOutDate(e.target.value)}
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-400 block mb-2">تجارب وحالات سريعة:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDDischargeDate('2026-09-12');
                    setDGateOutDate('2026-09-20');
                    setDFreeDays(14);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer"
                >
                  ✓ سحب آمن خلال السماح (8 أيام)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDDischargeDate('2026-09-01');
                    setDGateOutDate('2026-09-23');
                    setDFreeDays(14);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition cursor-pointer"
                >
                  ⚠️ تأخير 8 أيام غرامة (تجاوز 14 يوم)
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Calculation & Penalty Output Column */}
          <div className="lg:col-span-6 space-y-6">
            <div
              className={`rounded-3xl border p-6 sm:p-7 shadow-sm transition-all duration-300 ${
                demurrageCalculation.status === 'critical'
                  ? 'bg-gradient-to-br from-rose-50 via-white to-orange-50 dark:from-rose-950/30 dark:via-[#111622] dark:to-orange-950/20 border-rose-300/80 dark:border-rose-800/80 ring-2 ring-rose-500/20'
                  : demurrageCalculation.status === 'warning'
                  ? 'bg-gradient-to-br from-amber-50 via-white to-amber-50 dark:from-amber-950/30 dark:via-[#111622] dark:to-amber-950/20 border-amber-300/80 dark:border-amber-800/80 ring-2 ring-amber-500/20'
                  : 'bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/30 dark:via-[#111622] dark:to-teal-950/20 border-emerald-300/80 dark:border-emerald-800/80 ring-2 ring-emerald-500/20'
              }`}
            >
              {/* Status Banner */}
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-3.5 h-3.5 rounded-full animate-ping ${
                      demurrageCalculation.status === 'critical'
                        ? 'bg-rose-500'
                        : demurrageCalculation.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {demurrageCalculation.status === 'critical'
                      ? '⚠️ غرامات أرضيات جارية ومستحقة'
                      : demurrageCalculation.status === 'warning'
                      ? '⏳ مهلة حرجة - تنتهي خلال 72 ساعة'
                      : '✅ الحاوية ضمن فترة السماح القانونية'}
                  </span>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-black ${
                    demurrageCalculation.status === 'critical'
                      ? 'bg-rose-500 text-white'
                      : demurrageCalculation.status === 'warning'
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-500 text-white'
                  }`}
                >
                  {demurrageCalculation.totalDays} يوماً بالميناء
                </span>
              </div>

              {/* Penalty Amount Display */}
              <div className="p-5 rounded-2xl bg-white/80 dark:bg-[#0B0E14]/80 border border-slate-200/80 dark:border-slate-800/80 text-center mb-6">
                <span className="text-xs font-bold text-slate-400 block mb-1">
                  إجمالي الغرامة المحسوبة (Total Demurrage Penalties)
                </span>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                  ${demurrageCalculation.penaltyUsd.toLocaleString()}{' '}
                  <span className="text-sm text-slate-400 font-normal">USD</span>
                </div>
                <div className="text-base font-black text-[#FF5E1E] font-mono mt-1">
                  ≈ {demurrageCalculation.penaltyEgp.toLocaleString()}{' '}
                  <span className="text-xs font-sans font-bold text-slate-500">جنيه مصري</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3 text-center mb-6">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">فترة السماح</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {dFreeDays} يوم
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">الأيام المستهلكة</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {demurrageCalculation.totalDays} يوم
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">
                    {demurrageCalculation.overdueDays > 0 ? 'أيام الغرامة' : 'المتبقي مجاناً'}
                  </span>
                  <span
                    className={`text-base font-black font-mono ${
                      demurrageCalculation.overdueDays > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {demurrageCalculation.overdueDays > 0
                      ? `+${demurrageCalculation.overdueDays} يوم`
                      : `${demurrageCalculation.remaining} يوم`}
                  </span>
                </div>
              </div>

              {/* Tiered Breakdown */}
              <div className="space-y-2 text-xs border-t border-slate-200/60 dark:border-slate-800/60 pt-4">
                <span className="font-bold text-slate-600 dark:text-slate-300 block mb-2">
                  لائحة شرائح الغرامات المعتمدة لتوكيل {SHIPPING_LINES_RATES[dCarrier]?.name}:
                </span>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>الشريحة الأولى (اليوم 1 حتى 7 تأخير):</span>
                  <strong className="font-mono text-slate-900 dark:text-white">
                    ${(SHIPPING_LINES_RATES[dCarrier]?.t1 * (dContainerSize === '40' ? 1.8 : 1)).toFixed(0)} / يوم
                  </strong>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>الشريحة الثانية (اليوم 8 حتى 14 تأخير):</span>
                  <strong className="font-mono text-slate-900 dark:text-white">
                    ${(SHIPPING_LINES_RATES[dCarrier]?.t2 * (dContainerSize === '40' ? 1.8 : 1)).toFixed(0)} / يوم
                  </strong>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>الشريحة الثالثة (من اليوم 15 فما فوق):</span>
                  <strong className="font-mono text-rose-600 dark:text-rose-400">
                    ${(SHIPPING_LINES_RATES[dCarrier]?.t3 * (dContainerSize === '40' ? 1.8 : 1)).toFixed(0)} / يوم
                  </strong>
                </div>
              </div>
            </div>

            {/* Operational Action Banner */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <strong className="block font-black mb-0.5">توصية التشغيل الفوري:</strong>
                <span>
                  {demurrageCalculation.overdueDays > 0
                    ? 'يجب سداد إذن التسليم فوراً وإصدار إذن صرف لسيارة النقل لرفع الحاوية اليوم لتجنب تراكم شريحة الغرامة التالية.'
                    : 'الحاوية ضمن الأمان، يُوصى بإنهاء فحص لجنة الكشف الجمركي قبل موعد انتهاء السماح بـ 48 ساعة.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
         TAB 2: AI DOCUMENT OCR & B/L PARSER
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'ocr' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          {/* Document Upload & Selector */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-3xl bg-white dark:bg-[#111622] border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                  <FileSearch className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    رفع وتحليل مستندات الشحن
                  </h2>
                  <span className="text-xs text-slate-500">استخراج الحاويات والأوزان والبوالص آلياً بالذكاء الاصطناعي</span>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-3xl p-6 text-center transition cursor-pointer bg-slate-50/50 dark:bg-[#0B0E14]/50 group">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  اسحب ملف البوليصة أو الفاتورة هنا
                </h3>
                <span className="text-xs text-slate-400 block mb-3">
                  يدعم ملفات PDF الممسوحة ضوئياً، صور JPG، و PNG عالية الدقة
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                  تصفح الملفات من جهازك
                </span>
              </div>

              {/* Sample Presets */}
              <div>
                <span className="text-xs font-bold text-slate-500 block mb-2.5">
                  أو اختر نموذجاً حياً للاختبار الفوري:
                </span>
                <div className="space-y-2">
                  {SAMPLE_DOCS.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => triggerScan(doc)}
                      className={`w-full text-start p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        selectedDoc.id === doc.id
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/60 text-emerald-900 dark:text-emerald-200 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <span className="text-xs font-bold block">{doc.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{doc.fileRef}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        تحليل المستند ➔
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Extracted Fields Column */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-3xl bg-white dark:bg-[#111622] border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-7 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      البيانات المستخرجة آلياً (OCR Data Schema)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                      دقة 99.4%
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                    المصدر: {selectedDoc.title} • {selectedDoc.carrier}
                  </span>
                </div>

                <button
                  onClick={() => navigate('/shipments')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>توليد شحنة جديدة فوراً</span>
                </button>
              </div>

              {/* Progress Bar when Scanning */}
              {isScanning && (
                <div className="mb-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30">
                  <div className="flex justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1.5">
                    <span>جاري مسح الباركود وجداول الشحنة...</span>
                    <span>{scanProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-emerald-200 dark:bg-emerald-900 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Extracted Fields Table/Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {Object.entries(selectedDoc.data).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-2 group hover:border-emerald-500/50 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        {key === 'blNumber'
                          ? 'رقم بوليصة الشحن (B/L)'
                          : key === 'containerNumber'
                          ? 'رقم الحاوية (Container)'
                          : key === 'sealNumber'
                          ? 'رقم السيل الملاحي (Seal)'
                          : key === 'shipper'
                          ? 'الشاحن (Shipper)'
                          : key === 'consignee'
                          ? 'المستورد (Consignee)'
                          : key === 'pol'
                          ? 'ميناء الشحن (POL)'
                          : key === 'pod'
                          ? 'ميناء الوصول (POD)'
                          : key === 'vesselVoyage'
                          ? 'اسم السفينة والرحلة'
                          : key === 'grossWeight'
                          ? 'الوزن الإجمالي (Gross Weight)'
                          : key === 'cbm'
                          ? 'الحجم الإجمالي (CBM)'
                          : key === 'packages'
                          ? 'عدد الطرود والعبوات'
                          : key === 'hsCode'
                          ? 'البند الجمركي (HS Code)'
                          : key === 'cargoValue'
                          ? 'قيمة الفاتورة'
                          : 'شروط الشحن (Incoterm)'}
                      </span>
                      <strong className="text-slate-900 dark:text-white font-mono text-xs block truncate" title={val}>
                        {val}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyValue(val, key)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
                      title="نسخ القيمة"
                    >
                      {copiedField === key ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
         TAB 3: AIR FREIGHT & VOLUMETRIC CBM CALCULATOR
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'airfreight' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          {/* Inputs */}
          <div className="lg:col-span-6 rounded-3xl bg-white dark:bg-[#111622] border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black">
                  <Plane className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    حاسبة الوزن الحجمي للشحن الجوي (IATA)
                  </h2>
                  <span className="text-xs text-slate-500">حساب الوزن الخاضع للتحصيل (Chargeable Weight) والـ CBM</span>
                </div>
              </div>
            </div>

            {/* Standard Ratio Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                معيار الحساب (IATA Air vs Express Courier)
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setAirDivisor(6000)}
                  className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    airDivisor === 6000
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  معيار IATA الرسمي (÷ 6000)
                </button>
                <button
                  type="button"
                  onClick={() => setAirDivisor(5000)}
                  className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    airDivisor === 5000
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  البريد السريع Express (÷ 5000)
                </button>
              </div>
            </div>

            {/* Packages count & Gross Weight */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                  عدد الطرود / الكراتين
                </label>
                <input
                  type="number"
                  min="1"
                  value={packagesCount}
                  onChange={(e) => setPackagesCount(Number(e.target.value))}
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                  الوزن الفعلي لكل طرد (KG)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={pkgGrossWeight}
                  onChange={(e) => setPkgGrossWeight(Number(e.target.value))}
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
            </div>

            {/* Package Dimensions */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                أبعاد الطرد الواحد بالسنتيمتر (الطول × العرض × الارتفاع CM)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={pkgLength}
                    onChange={(e) => setPkgLength(Number(e.target.value))}
                    placeholder="الطول L"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                  />
                  <span className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">سم</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={pkgWidth}
                    onChange={(e) => setPkgWidth(Number(e.target.value))}
                    placeholder="العرض W"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                  />
                  <span className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">سم</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={pkgHeight}
                    onChange={(e) => setPkgHeight(Number(e.target.value))}
                    placeholder="الارتفاع H"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                  />
                  <span className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">سم</span>
                </div>
              </div>
            </div>

            {/* Quick Dimension Templates */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-2">أبعاد باليتات قياسية جاهزة:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPkgLength(120);
                    setPkgWidth(80);
                    setPkgHeight(160);
                  }}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-500/10 hover:text-sky-600 transition cursor-pointer"
                >
                  Euro Pallet (120×80×160)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPkgLength(120);
                    setPkgWidth(100);
                    setPkgHeight(180);
                  }}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-500/10 hover:text-sky-600 transition cursor-pointer"
                >
                  Standard Pallet (120×100×180)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPkgLength(60);
                    setPkgWidth(40);
                    setPkgHeight(40);
                  }}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-500/10 hover:text-sky-600 transition cursor-pointer"
                >
                  Master Carton (60×40×40)
                </button>
              </div>
            </div>
          </div>

          {/* Results Output */}
          <div className="lg:col-span-6 space-y-6">
            <div className="rounded-3xl bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-sky-950/30 dark:via-[#111622] dark:to-blue-950/20 border border-sky-300/80 dark:border-sky-800/80 p-6 sm:p-7 shadow-sm ring-2 ring-sky-500/15">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                  الوزن الخاضع للتحصيل الجوي (Chargeable Weight)
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-sky-500 text-white">
                  {airCalculations.isVolumetric ? 'محاسبة بالوزن الحجمي' : 'محاسبة بالوزن الفعلي'}
                </span>
              </div>

              {/* Big Result Box */}
              <div className="p-5 rounded-2xl bg-white/90 dark:bg-[#0B0E14]/90 border border-sky-200 dark:border-sky-900/60 text-center mb-6">
                <div className="text-4xl font-black font-mono text-slate-900 dark:text-white">
                  {airCalculations.chargeableWeight.toLocaleString()}{' '}
                  <span className="text-sm font-sans font-bold text-slate-400">KG</span>
                </div>
                <span className="text-xs text-slate-500 font-medium mt-1 block">
                  القيمة الأكبر المعتمدة بين الوزن الفعلي والوزن الحجمي لشركة الطيران
                </span>
              </div>

              {/* Comparison Matrix */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">الوزن الفعلي الإجمالي (Gross)</span>
                  <div className="text-xl font-black font-mono text-slate-800 dark:text-slate-200">
                    {airCalculations.totalGrossWeight.toLocaleString()} KG
                  </div>
                  <span className="text-[10px] text-slate-500">حساب الميزان الفعلي</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">الوزن الحجمي (Volumetric)</span>
                  <div className="text-xl font-black font-mono text-sky-600 dark:text-sky-400">
                    {airCalculations.totalVolumetricWeight.toLocaleString()} KG
                  </div>
                  <span className="text-[10px] text-slate-500">(L×W×H / {airDivisor})</span>
                </div>
              </div>

              {/* Volume in CBM */}
              <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-[#0E121A]/90 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    الحجم الإجمالي للمتر المكعب (Total CBM):
                  </span>
                  <strong className="text-base font-black font-mono text-slate-900 dark:text-white">
                    {airCalculations.totalCbm.toFixed(2)} CBM (م³)
                  </strong>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>نسبة إشغال حاوية بحرية 40HQ ({airCalculations.totalCbm.toFixed(1)} / 68 CBM):</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {airCalculations.utilization40HQ.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${Math.min(100, airCalculations.utilization40HQ)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
         TAB 4: CO2e CARBON FOOTPRINT & ESG CALCULATOR
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'carbon' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          {/* Inputs */}
          <div className="lg:col-span-6 rounded-3xl bg-white dark:bg-[#111622] border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    حاسبة البصمة الكربونية للشحنات (GLEC Standard)
                  </h2>
                  <span className="text-xs text-slate-500">حساب انبعاثات $CO_2e$ وشهادات الاستدامة البيئية الدولية</span>
                </div>
              </div>
            </div>

            {/* Transport Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                وسيلة الشحن الرئيسية
              </label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setCarbonMode('sea')}
                  className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    carbonMode === 'sea'
                      ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Ship className="w-3.5 h-3.5" />
                  <span>شحن بحري</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCarbonMode('road')}
                  className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    carbonMode === 'road'
                      ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>نقل بري</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCarbonMode('air')}
                  className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    carbonMode === 'air'
                      ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Plane className="w-3.5 h-3.5" />
                  <span>شحن جوي</span>
                </button>
              </div>
            </div>

            {/* Weight and Distance */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                  وزن الشحنة بالطن (Tons)
                </label>
                <input
                  type="number"
                  min="0.1"
                  value={cargoWeightTons}
                  onChange={(e) => setCargoWeightTons(Number(e.target.value))}
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                  مسافة الرحلة (كم KM)
                </label>
                <input
                  type="number"
                  min="10"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
            </div>

            {/* Fuel Type for Sea */}
            {carbonMode === 'sea' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                  نوع وقود السفينة وتقنية المحرك
                </label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as any)}
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white font-bold"
                >
                  <option value="standard">وقود ملاحي تقليدي منخفض الكبريت (VLSFO Standard)</option>
                  <option value="lng">سفينة تعمل بالغاز الطبيعي المسال (LNG Eco Vessel -30%)</option>
                  <option value="bio">وقود حيوي ميثانول أخضر (Bio-Methanol Green -65%)</option>
                </select>
              </div>
            )}
          </div>

          {/* Environmental Certificate Output */}
          <div className="lg:col-span-6 space-y-6">
            <div className="rounded-3xl bg-gradient-to-br from-teal-50 via-white to-emerald-50 dark:from-teal-950/30 dark:via-[#111622] dark:to-emerald-950/20 border border-teal-300/80 dark:border-teal-800/80 p-6 sm:p-7 shadow-sm ring-2 ring-teal-500/15">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                  تقرير الانبعاثات الكربونية للشحنة (CO2e Audit)
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-teal-600 text-white">
                  تصنيف بيئي {carbonCalculation.ecoScore}
                </span>
              </div>

              {/* Total Carbon Output */}
              <div className="p-5 rounded-2xl bg-white/90 dark:bg-[#0B0E14]/90 border border-teal-200 dark:border-teal-900/60 text-center mb-6">
                <span className="text-xs font-bold text-slate-400 block mb-1">
                  إجمالي انبعاثات غازات الاحتباس الحراري
                </span>
                <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white">
                  {carbonCalculation.totalTons}{' '}
                  <span className="text-sm font-sans font-bold text-slate-400">طن $CO_2e$</span>
                </div>
                <div className="text-xs text-teal-700 dark:text-teal-400 font-bold mt-1">
                  ({carbonCalculation.totalKg.toLocaleString()} كجم من مكافئ ثاني أكسيد الكربون)
                </div>
              </div>

              {/* Environmental Equivalence Card */}
              <div className="p-4 rounded-2xl bg-emerald-100/50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-3.5 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-xs font-black text-slate-900 dark:text-white block mb-0.5">
                    التعويض البيئي المعادل (Carbon Offset Equivalence):
                  </strong>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    يتطلب امتصاص انبعاثات هذه الشحنة زراعة ما يقارب{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                      {carbonCalculation.treesRequired} شجرة
                    </strong>{' '}
                    لمدة عام كامل لتحقيق الحياد الكربوني المعتمد.
                  </p>
                </div>
              </div>

              {/* Official ESG Certificate Button */}
              <button
                type="button"
                onClick={() => alert('تم إصدار شهادة البصمة الكربونية المعتمدة بنجاح جاهزة للإرفاق مع الفاتورة للعميل!')}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>إصدار وتصدير شهادة الشحن الأخضر (Green Logistics Certificate)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
         TAB 5: LIVE AIS VESSEL SATELLITE RADAR
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'ais' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          {/* Vessels List Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl bg-white dark:bg-[#111622] border border-slate-200/90 dark:border-slate-800/90 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                    <Radar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white">
                      رادار السفن الحية (AIS Live)
                    </h2>
                    <span className="text-xs text-slate-500">تتبع السفن عبر الأقمار الصناعية</span>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchImo}
                  onChange={(e) => setSearchImo(e.target.value)}
                  placeholder="ابحث باسم السفينة أو رقم الـ IMO..."
                  className="w-full ps-4 pe-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Vessel Cards */}
              <div className="space-y-2.5">
                {filteredVessels.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVessel(v)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-2 ${
                      selectedVessel.id === v.id
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/25 border-indigo-500/70 shadow-sm ring-1 ring-indigo-500/30'
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                          {v.name}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                          IMO: {v.imo} • {v.flag}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                        {v.speed}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/40 dark:border-slate-800/40">
                      <span>الموقع: {v.currentLocation}</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {v.destination}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Vessel Live Telemetry Column */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-3xl bg-white dark:bg-[#111622] border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-7 shadow-sm">
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {selectedVessel.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      {selectedVessel.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                    {selectedVessel.type} • العلم: {selectedVessel.flag} • السعة: {selectedVessel.capacity}
                  </span>
                </div>

                <div className="text-end">
                  <span className="text-[10px] text-slate-400 font-bold block">إحداثيات الأقمار الصناعية (GPS)</span>
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedVessel.coordinates}
                  </span>
                </div>
              </div>

              {/* Telemetry Gauges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-6">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">السرعة الحالية</span>
                  <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                    {selectedVessel.speed}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">الاتجاه الملاحي</span>
                  <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                    {selectedVessel.course}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">الغاطس المائي</span>
                  <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                    {selectedVessel.draught}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0B0E14] border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">الأبعاد والمقاييس</span>
                  <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                    {selectedVessel.length}
                  </span>
                </div>
              </div>

              {/* Route & ETA Card */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 space-y-3 mb-5">
                <div className="flex items-center justify-between text-xs">
                  <div className="text-start">
                    <span className="text-[10px] text-slate-400 font-bold block">ميناء المغادرة</span>
                    <strong className="text-slate-900 dark:text-white">{selectedVessel.origin}</strong>
                  </div>
                  <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                    <span>مسار الإبحار</span>
                    <ChevronLeft className="w-4 h-4 rtl:rotate-0 rotate-180" />
                  </div>
                  <div className="text-end">
                    <span className="text-[10px] text-slate-400 font-bold block">ميناء الوصول المتوقع</span>
                    <strong className="text-slate-900 dark:text-white">{selectedVessel.destination}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-indigo-200/40 dark:border-indigo-800/30 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">الموعد التقديري للوصول (ETA):</span>
                  <strong className="font-mono text-indigo-700 dark:text-indigo-300 font-black">
                    {selectedVessel.eta}
                  </strong>
                </div>
              </div>

              {/* Open Sea Radar View Simulation */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative h-56 bg-slate-950 flex items-center justify-center">
                {/* Radar Grid Overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                <div className="absolute w-40 h-40 rounded-full border border-indigo-500/30 animate-ping" />
                <div className="absolute w-24 h-24 rounded-full border border-indigo-500/50" />
                <div className="absolute w-12 h-12 rounded-full border border-indigo-500/70" />

                <div className="relative z-10 text-center space-y-2 p-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-600/30 border border-indigo-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/40">
                    <Ship className="w-6 h-6 animate-pulse" />
                  </div>
                  <span className="text-xs font-bold text-white block">
                    {selectedVessel.name} • {selectedVessel.currentLocation}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-300 block">
                    LAT/LON: {selectedVessel.coordinates}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
