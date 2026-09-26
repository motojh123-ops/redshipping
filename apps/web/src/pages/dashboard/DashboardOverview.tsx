import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import {
  Ship,
  Truck,
  Package,
  Plus,
  Compass,
  TrendingUp,
  MapPin,
  Calendar,
  ChevronRight,
  ChevronDown,
  Phone,
  RefreshCw,
  List,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Box,
  Droplet,
  Anchor,
  UserCheck,
  Container,
  Receipt,
  FileText,
  Inbox,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../../services/api';
import { CreateShipmentModal } from '../shipments/CreateShipmentModal';
import { CreateQuotationModal } from '../quotations/CreateQuotationModal';
import { AnimatedCaptainRed } from '../../components/ui/AnimatedCaptainRed';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SkeletonCard, SkeletonListItem, SkeletonTable } from '../../components/ui/Skeleton';

/* ============================================================
   Interactive Route Map Component (Fleetly Design)
   ============================================================ */
const RouteMapCard: React.FC<{ activeShipment?: any; loading?: boolean }> = ({ activeShipment, loading }) => {
  const [zoom, setZoom] = useState(1);

  if (loading) return <SkeletonCard className="h-64" />;

  const origin = activeShipment?.originPort?.nameAr || activeShipment?.originPort?.nameEn || '—';
  const destination = activeShipment?.destinationPort?.nameAr || activeShipment?.destinationPort?.nameEn || '—';
  const jobNo = activeShipment?.jobFileNumber || '—';

  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#131722] border border-slate-200 dark:border-[#262E40] h-64 flex flex-col justify-between p-4 shadow-sm group">
      {/* Map SVG Network */}
      <svg
        viewBox="0 0 400 240"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300"
        style={{ transform: `scale(${zoom})` }}
      >
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF7A3D" />
            <stop offset="100%" stopColor="#FF5E1E" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#FF5E1E" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Maritime Grids */}
        <g stroke="currentColor" strokeOpacity="0.08" strokeWidth="1">
          <line x1="40" y1="0" x2="40" y2="240" />
          <line x1="100" y1="0" x2="100" y2="240" />
          <line x1="180" y1="0" x2="180" y2="240" />
          <line x1="260" y1="0" x2="260" y2="240" />
          <line x1="340" y1="0" x2="340" y2="240" />

          <line x1="0" y1="50" x2="400" y2="50" />
          <line x1="0" y1="110" x2="400" y2="110" />
          <line x1="0" y1="170" x2="400" y2="170" />
        </g>

        {/* Global Sea Corridor */}
        <path
          d="M0,160 Q120,190 200,120 T400,70"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="8"
        />

        {/* Active Orange Maritime Route */}
        <path
          d="M 40,170 Q 140,180 220,110 T 350,60"
          fill="none"
          stroke="url(#routeGradient)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
        />

        {/* POL Origin Pin */}
        <circle cx="40" cy="170" r="5" fill="#3B82F6" stroke="#fff" strokeWidth="2" />

        {/* Moving Vessel Indicator */}
        <g transform="translate(220, 110)">
          <circle cx="0" cy="0" r="11" fill="#FF5E1E" fillOpacity="0.25" className="animate-ping" />
          <circle cx="0" cy="0" r="7" fill="#FF5E1E" stroke="#fff" strokeWidth="2" />
        </g>

        {/* POD Destination Pin */}
        <g transform="translate(350, 60)">
          <circle cx="0" cy="0" r="6" fill="#10B981" stroke="#fff" strokeWidth="2" />
        </g>
      </svg>

      {/* Top Overlay: Live Route Details */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-[#181D2A]/90 backdrop-blur-md border border-slate-200/80 dark:border-[#262E40] shadow-sm">
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block leading-tight">
            المسار البحري النشط ({jobNo})
          </span>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {origin} ← {destination}
          </span>
        </div>

        <span
          className={`px-2 py-1 rounded-lg text-[10px] font-bold border backdrop-blur-sm ${
            activeShipment
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-slate-200/60 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-300/50 dark:border-[#262E40]'
          }`}
        >
          {activeShipment ? 'جاري الإبحار' : 'لا مسار نشط'}
        </span>
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.2, 1.8))}
            className="w-7 h-7 rounded-lg bg-white/90 dark:bg-[#181D2A]/90 backdrop-blur-md border border-slate-200 dark:border-[#262E40] text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-bold shadow-sm hover:text-[#FF5E1E]"
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.8))}
            className="w-7 h-7 rounded-lg bg-white/90 dark:bg-[#181D2A]/90 backdrop-blur-md border border-slate-200 dark:border-[#262E40] text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-bold shadow-sm hover:text-[#FF5E1E]"
          >
            -
          </button>
        </div>

        <button
          onClick={() => setZoom(1)}
          className="p-1.5 rounded-lg bg-white/90 dark:bg-[#181D2A]/90 backdrop-blur-md border border-slate-200 dark:border-[#262E40] text-slate-600 dark:text-slate-300 text-xs shadow-sm hover:text-[#FF5E1E]"
          title="إعادة التمركز"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/* ============================================================
   Monthly Revenue Wave Chart — computed from REAL /invoices data
   ============================================================ */
const MONTH_NAMES_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const USD_TO_EGP = 51.5;

/* Progress % per shipment stage (real stage → visual progress) */
const STAGE_PROGRESS: Record<string, number> = {
  booking_confirmed: 10,
  cargo_received: 20,
  customs_submitted: 30,
  acid_issued: 40,
  in_transit: 55,
  arrived_destination: 70,
  clearance_in_progress: 80,
  release_issued: 90,
  out_for_delivery: 95,
  delivered: 100,
  closed: 100,
  cancelled: 0,
};

const GlowingEarningsChart: React.FC<{ invoices: any[] }> = ({ invoices }) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  // Aggregate real invoice totals per month of the current year (consolidated to EGP)
  const data = useMemo(() => {
    const year = new Date().getFullYear();
    const monthly = new Array(12).fill(0);
    (invoices || []).forEach((inv: any) => {
      if (!inv?.issueDate && !inv?.createdAt) return;
      const d = new Date(inv.issueDate || inv.createdAt);
      if (d.getFullYear() !== year) return;
      const total = Number(inv.total) || 0;
      const egp = inv.currency === 'EGP' ? total : total * (Number(inv.exchangeRate) > 1 ? Number(inv.exchangeRate) : USD_TO_EGP);
      monthly[d.getMonth()] += egp;
    });
    const monthNames = isArabic ? MONTH_NAMES_AR : MONTH_NAMES_EN;
    return monthly.map((v, i) => ({ m: monthNames[i], v: Math.round(v) }));
  }, [invoices, isArabic]);

  const yearTotal = data.reduce((s, d) => s + d.v, 0);
  const currentMonth = new Date().getMonth();
  const prevMonthVal = currentMonth > 0 ? data[currentMonth - 1].v : 0;
  const growthPct = prevMonthVal > 0 ? Math.round(((data[currentMonth].v - prevMonthVal) / prevMonthVal) * 1000) / 10 : null;

  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; val: string; month: string } | null>(null);

  const hasData = yearTotal > 0;

  const w = 400;
  const h = 140;
  const maxV = Math.max(1, ...data.map((d) => d.v)) * 1.15; // dynamic scale from real data

  const points = data.map((d, i) => {
    const x = 20 + (i / (data.length - 1)) * (w - 40);
    const y = h - 20 - (d.v / maxV) * (h - 40);
    return { ...d, x, y };
  });

  const pathD = points.reduce((acc, curr, idx, arr) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = arr[idx - 1];
    const cx1 = prev.x + (curr.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (curr.x - prev.x) / 2;
    const cy2 = curr.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;

  return (
    <div className="relative w-full overflow-hidden">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44 overflow-visible">
        <defs>
          <linearGradient id="earningsAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF5E1E" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#FF5E1E" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FF5E1E" stopOpacity="0" />
          </linearGradient>
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#FF5E1E" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75, 1].map((pct, i) => (
          <line
            key={i}
            x1="15"
            y1={h - 20 - pct * (h - 40)}
            x2={w - 15}
            y2={h - 20 - pct * (h - 40)}
            stroke="currentColor"
            strokeOpacity="0.06"
            strokeDasharray="3 3"
          />
        ))}

        <path d={areaD} fill="url(#earningsAreaGrad)" />

        {/* Luminous Orange Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#FF5E1E"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#lineGlow)"
        />

        {/* Data points */}
        {points.map((p, idx) => (
          <g
            key={idx}
            className="cursor-pointer group"
            onMouseEnter={() =>
              setHoveredPoint({
                x: p.x,
                y: p.y,
                val: isArabic ? `${p.v.toLocaleString('ar-EG')} ج.م` : `EGP ${p.v.toLocaleString('en-US')}`,
                month: p.m,
              })
            }
          >
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#FF5E1E"
              stroke="#FFFFFF"
              strokeWidth="2"
              className="transition-transform duration-200 group-hover:scale-150"
            />
          </g>
        ))}

        {/* Tooltip Pin */}
        {hoveredPoint && (
          <g transform={`translate(${hoveredPoint.x}, ${hoveredPoint.y})`}>
            <circle cx="0" cy="0" r="6" fill="#FF5E1E" stroke="#fff" strokeWidth="2.5" />
            <circle cx="0" cy="0" r="12" fill="#FF5E1E" fillOpacity="0.25" className="animate-ping" />
            <g transform="translate(-45, -42)">
              <rect
                x="0"
                y="0"
                width="90"
                height="28"
                rx="8"
                fill="#181D2A"
                stroke="#FF5E1E"
                strokeWidth="1.2"
                filter="drop-shadow(0 4px 12px rgba(0,0,0,0.5))"
              />
              <text
                x="45"
                y="18"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="10"
                fontWeight="bold"
                fontFamily="inherit"
              >
                {hoveredPoint.val}
              </text>
            </g>
          </g>
        )}

        {points.filter((_, i) => i % 2 === 0).map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={h - 2}
            textAnchor="middle"
            fill="currentColor"
            fillOpacity="0.4"
            fontSize="9"
            fontFamily="inherit"
          >
            {p.m}
          </text>
        ))}
      </svg>
    </div>
  );
};

/* ============================================================
   3D Fleet & Container Vessel Inspection Widget
   ============================================================ */
const VehicleFleetCard: React.FC<{ activeShipment?: any }> = ({ activeShipment }) => {
  const [vehicleType, setVehicleType] = useState<'vessel' | 'truck' | 'customs'>('vessel');
  const [angle, setAngle] = useState<'side' | 'bay' | 'hold'>('side');

  const containers = activeShipment?.containers || [];
  const containerCount = containers.length;
  const blNumber = activeShipment?.blNumber || '—';
  const carrier = activeShipment?.shippingLine?.name || '—';

  // Real cargo weight from containers (fallback: shipment gross weight)
  const totalWeightKg = Math.round(
    containers.reduce((sum: number, c: any) => sum + (Number(c?.cargoWeightKg) || 0), 0) ||
      Number(activeShipment?.grossWeightKg) ||
      0,
  );

  // Real capacity: containers with assigned numbers vs booked slots
  const assignedCount = containers.filter((c: any) => c?.containerNumber).length;
  const capacityPct = containerCount > 0 ? Math.min(100, Math.round((assignedCount / containerCount) * 100)) : 0;
  const filledSegments = Math.round((capacityPct / 100) * 32);

  return (
    <div className="rounded-2xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] p-4 sm:p-5 shadow-sm space-y-4">
      {/* Selector Tabs */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#262E40] pb-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setVehicleType('vessel')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              vehicleType === 'vessel'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#22293A]'
            }`}
          >
            <Ship className="w-3.5 h-3.5" />
            <span>سفينة الحاويات البحرية</span>
          </button>

          <button
            onClick={() => setVehicleType('truck')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              vehicleType === 'truck'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#22293A]'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>شاحنة نقل بري وتوزيع</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => toast.success('تم تحديث خط سير الشحنة')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#22293A] transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D Vessel / Truck Visual Simulation */}
      <div className="relative rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-[#121620] dark:to-[#0B0E14] border border-slate-200/70 dark:border-[#262E40] p-4 flex flex-col items-center justify-center min-h-[170px] overflow-hidden">
        <div className="absolute w-48 h-48 rounded-full bg-[#FF5E1E]/10 blur-3xl pointer-events-none" />

        <svg viewBox="0 0 460 160" className="w-full max-w-md h-36 drop-shadow-xl">
          <ellipse cx="230" cy="142" rx="190" ry="10" fill="#000" fillOpacity="0.18" filter="blur(4px)" />

          {vehicleType === 'vessel' ? (
            /* Container Vessel Graphic */
            <g>
              {/* Ship Hull */}
              <path
                d="M 40,110 L 100,135 L 360,135 L 420,95 L 390,95 L 40,95 Z"
                fill="#0F172A"
                stroke="#334155"
                strokeWidth="2"
              />
              <path d="M 60,125 L 350,125" stroke="#FF5E1E" strokeWidth="4" />

              {/* Stacked Containers (Orange, Amber, Navy) */}
              <rect x="100" y="70" width="45" height="24" rx="2" fill="#FF5E1E" stroke="#EA580C" strokeWidth="1" />
              <rect x="100" y="44" width="45" height="24" rx="2" fill="#38BDF8" stroke="#0284C7" strokeWidth="1" />
              <rect x="150" y="70" width="45" height="24" rx="2" fill="#F97316" stroke="#C2410C" strokeWidth="1" />
              <rect x="150" y="44" width="45" height="24" rx="2" fill="#FF5E1E" stroke="#EA580C" strokeWidth="1" />
              <rect x="200" y="70" width="45" height="24" rx="2" fill="#10B981" stroke="#059669" strokeWidth="1" />
              <rect x="200" y="44" width="45" height="24" rx="2" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
              <rect x="250" y="70" width="45" height="24" rx="2" fill="#FF5E1E" stroke="#EA580C" strokeWidth="1" />
              <rect x="250" y="44" width="45" height="24" rx="2" fill="#6366F1" stroke="#4F46E5" strokeWidth="1" />

              {/* Bridge Tower */}
              <rect x="310" y="40" width="45" height="54" rx="3" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.5" />
              <rect x="315" y="46" width="35" height="12" rx="2" fill="#38BDF8" fillOpacity="0.6" />
              <line x1="332" y1="24" x2="332" y2="40" stroke="#64748B" strokeWidth="2" />
            </g>
          ) : (
            /* Transport Truck Graphic */
            <g>
              <rect x="60" y="36" width="240" height="88" rx="6" fill="#0F172A" stroke="#334155" strokeWidth="2" />
              {/* Internal glowing cargo */}
              <rect x="70" y="46" width="65" height="66" rx="3" fill="#FF5E1E" fillOpacity="0.25" stroke="#FF5E1E" strokeDasharray="3 2" />
              <rect x="76" y="54" width="24" height="22" rx="2" fill="#FF7A3D" />
              <rect x="104" y="54" width="24" height="22" rx="2" fill="#FF945D" />
              <rect x="76" y="80" width="52" height="24" rx="2" fill="#EA580C" />

              <rect x="145" y="46" width="70" height="66" rx="3" fill="#FF5E1E" fillOpacity="0.25" stroke="#FF5E1E" strokeDasharray="3 2" />
              <rect x="152" y="54" width="26" height="22" rx="2" fill="#F97316" />
              <rect x="182" y="54" width="26" height="22" rx="2" fill="#EA580C" />
              <rect x="152" y="80" width="56" height="24" rx="2" fill="#FF7A3D" />

              {/* Cab */}
              <path d="M300,52 L335,52 Q370,58 380,90 L385,124 L300,124 Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" />
              <path d="M332,56 L362,70 Q368,82 366,92 L332,92 Z" fill="#38BDF8" fillOpacity="0.4" stroke="#0284C7" strokeWidth="1.5" />
              <circle cx="105" cy="126" r="15" fill="#1E293B" stroke="#FF5E1E" strokeWidth="3" />
              <circle cx="145" cy="126" r="15" fill="#1E293B" stroke="#FF5E1E" strokeWidth="3" />
              <circle cx="345" cy="126" r="15" fill="#1E293B" stroke="#FF5E1E" strokeWidth="3" />
            </g>
          )}
        </svg>

        {/* View Angle Pill Selectors */}
        <div className="absolute end-3 top-3 flex flex-col gap-1.5 z-10">
          <button
            onClick={() => setAngle('side')}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center text-[10px] font-bold transition ${
              angle === 'side'
                ? 'border-[#FF5E1E] bg-[#FF5E1E]/10 text-[#FF5E1E]'
                : 'border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-[#181D2A]/80 text-slate-500'
            }`}
          >
            عام
          </button>
          <button
            onClick={() => setAngle('bay')}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center text-[10px] font-bold transition ${
              angle === 'bay'
                ? 'border-[#FF5E1E] bg-[#FF5E1E]/10 text-[#FF5E1E]'
                : 'border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-[#181D2A]/80 text-slate-500'
            }`}
          >
            عنابر
          </button>
        </div>
      </div>

      {/* Capacity & Container Stats */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              B/L: {blNumber}
            </span>
            <span className="text-[10px] text-slate-400">| {carrier}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
            <span>{containerCount} حاوية</span>
            {totalWeightKg > 0 && (
              <span className="font-bold text-[#FF5E1E]">{totalWeightKg.toLocaleString('ar-EG')} كجم</span>
            )}
          </div>
        </div>

        {/* Equalizer Capacity Segmented Bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-500 font-medium">سعة الحجز المحملة (FCL Capacity)</span>
            <span className="font-bold text-slate-900 dark:text-white">{capacityPct}% من إجمالي السعة</span>
          </div>
          <div className="flex items-center gap-1 h-3">
            {Array.from({ length: 32 }).map((_, i) => {
              const filled = i < filledSegments;
              return (
                <span
                  key={i}
                  className={`flex-1 h-full rounded-sm transition-all duration-300 ${
                    filled
                      ? i > 22
                        ? 'bg-amber-500'
                        : 'bg-[#FF5E1E]'
                      : 'bg-slate-200 dark:bg-[#262E40]'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   Cargo Types & Manifest Widget (Real App Freight Categories)
   ============================================================ */
const AdditionalItemsCard: React.FC<{ shipments: any[] }> = ({ shipments }) => {
  // Real per-type container aggregation from actual shipments
  const items = useMemo(() => {
    const TYPE_LABELS: Record<string, string> = {
      GP_20: "حاويات 20' قياسية (GP)",
      GP_40: "حاويات 40' قياسية (GP)",
      HQ_40: "حاويات 40' High Cube",
      HQ_45: "حاويات 45' High Cube",
      RF_20: "حاويات مبردة 20' (Reefer)",
      RF_40: "حاويات مبردة 40' (Reefer)",
      FLAT_RACK: 'رفوف مفتوحة (Flat Rack)',
      OPEN_TOP: 'سقف مفتوح (Open Top)',
    };
    const TYPE_ICONS: Record<string, LucideIcon> = {
      GP_20: Box,
      GP_40: Box,
      HQ_40: Container,
      HQ_45: Container,
      RF_20: Droplet,
      RF_40: Droplet,
      FLAT_RACK: Layers,
      OPEN_TOP: Layers,
    };
    const byType = new Map<string, { count: number; weight: number }>();
    (shipments || []).forEach((s) => {
      (s.containers || []).forEach((c: any) => {
        const key = c.containerType || 'GP_40';
        const cur = byType.get(key) || { count: 0, weight: 0 };
        byType.set(key, {
          count: cur.count + 1,
          weight: cur.weight + (Number(c?.cargoWeightKg) || 0),
        });
      });
    });
    return Array.from(byType.entries())
      .map(([type, agg]) => ({
        type,
        name: TYPE_LABELS[type] || type,
        count: agg.count,
        weight: agg.weight > 0 ? `${Math.round(agg.weight).toLocaleString('ar-EG')} كجم` : null,
        icon: TYPE_ICONS[type] || Box,
      }))
      .sort((a, b) => b.count - a.count);
  }, [shipments]);

  return (
    <div className="rounded-2xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">أنماط الحاويات والحمولات</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {items.reduce((a, b) => a + b.count, 0)} وحدة مشحونة قيد المتابعة والتشغيل
          </p>
        </div>
        <button className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#22293A] text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-2.5">
        {items.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-200 dark:border-[#262E40] rounded-xl">
            <Inbox className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">لا توجد حاويات مسجلة بعد</p>
          </div>
        ) : items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.type}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#121620] border border-slate-200/80 dark:border-[#262E40] hover:border-[#FF5E1E]/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-[#FF5E1E] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#FF5E1E] text-white">
                      {item.count}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {item.weight ? `${item.count} • ${item.weight}` : `${item.count} حاوية`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Link
          to="/shipments"
          className="flex-1 py-2 rounded-xl bg-[#FF5E1E] hover:bg-[#FF7034] text-white text-xs font-bold shadow-md shadow-orange-500/25 transition flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة حاويات للشحنة</span>
        </Link>
        <Link
          to="/pricing"
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#262E40] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#22293A] transition"
        >
          نولون الحاويات
        </Link>
      </div>
    </div>
  );
};

/* ============================================================
   Real Operations Table (Actual App Shipments)
   ============================================================ */
const RealOperationsTable: React.FC<{ shipments: any[]; loading?: boolean }> = ({ shipments, loading }) => {
  const [filter, setFilter] = useState<'all' | 'in_transit' | 'customs'>('all');

  if (loading)
    return (
      <div className="rounded-2xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] p-4 sm:p-5 shadow-sm">
        <SkeletonTable rows={5} cols={5} />
      </div>
    );

  // Filter live shipments against the API's ShipmentStage enum values
  const displayList = (shipments || []).filter((s) => {
    if (filter === 'in_transit') return s.currentStage === 'in_transit';
    if (filter === 'customs') return s.currentStage === 'customs_submitted' || s.currentStage === 'clearance_in_progress' || s.currentStage === 'arrived_destination';
    return true;
  });

  return (
    <div className="rounded-2xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] p-4 sm:p-5 shadow-sm space-y-4">
      {/* Table Header & Real Application Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            ملفات الشحن والعمليات اللوجستية (Active Job Files)
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">متابعة دقيقة لبوالص الشحن B/L، خطوط الملاحة، ومراحل الإفراج الجمركي</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#121620] p-1 rounded-xl border border-slate-200 dark:border-[#262E40]">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              filter === 'all'
                ? 'bg-white dark:bg-[#1E2536] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            كافة الشحنات
          </button>
          <button
            onClick={() => setFilter('in_transit')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              filter === 'in_transit'
                ? 'bg-white dark:bg-[#1E2536] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            في البحر
          </button>
          <button
            onClick={() => setFilter('customs')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              filter === 'customs'
                ? 'bg-white dark:bg-[#1E2536] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            جمارك وموانئ
          </button>
        </div>
      </div>

      {/* Real Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-start text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-[#262E40] text-slate-400 text-[11px]">
              <th className="pb-2.5 font-semibold text-start">رقم ملف الشحنة</th>
              <th className="pb-2.5 font-semibold text-start">العميل</th>
              <th className="pb-2.5 font-semibold text-start">خط الملاحة والمسار</th>
              <th className="pb-2.5 font-semibold text-start">الحاويات</th>
              <th className="pb-2.5 font-semibold text-start">المرحلة الحالية</th>
              <th className="pb-2.5 font-semibold text-end">التفاصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#262E40]/60">
            {displayList.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  لا توجد شحنات تطابق التصفية الحالية
                </td>
              </tr>
            ) : (
              displayList.map((s) => {
              const clientName = s.client?.name || s.clientName || '—';
              const lineName = s.shippingLine?.name || s.carrier || '—';
              const polName = s.polPort?.nameEn || s.pol;
              const podName = s.podPort?.nameEn || s.pod;
              const route = polName && podName ? `${polName} ← ${podName}` : (polName || podName || '—');
              const containerCount = s.containersCount ?? s.containers?.length ?? 0;

              return (
                <tr
                  key={s.id}
                  className="hover:bg-slate-50 dark:hover:bg-[#1E2536]/40 transition group cursor-pointer"
                >
                  <td className="py-3 font-bold text-slate-900 dark:text-white">
                    <Link to={`/shipments/${s.id}`} className="hover:text-[#FF5E1E] transition">
                      {s.jobFileNumber}
                    </Link>
                  </td>
                  <td className="py-3 text-slate-700 dark:text-slate-300 font-medium max-w-[200px] truncate">
                    {clientName}
                  </td>
                  <td className="py-3 text-slate-500 dark:text-slate-400">
                    <span className="block font-medium text-slate-800 dark:text-slate-200">{lineName}</span>
                    <span className="text-[10px] text-slate-400">{route}</span>
                  </td>
                  <td className="py-3 text-slate-700 dark:text-slate-300 font-bold">
                    {containerCount > 0 ? `${containerCount} FCL` : '—'}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={s.currentStage} />
                  </td>
                  <td className="py-3 text-end">
                    <Link
                      to={`/shipments/${s.id}`}
                      className="inline-flex p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#262E40] text-slate-400 hover:text-[#FF5E1E] transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              );
            })
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============================================================
   Real Compliance & Demurrage Alerts (D&D Engine)
   ============================================================ */
const RealComplianceCard: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  useEffect(() => {
    api.get('/notifications').then((res: any) => {
      const items = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
      setAlerts(items.slice(0, 4).map((n: any) => ({
        title: n.title || n.message || 'تنبيه',
        sub: n.message || n.body || '',
        time: n.createdAt ? new Date(n.createdAt).toLocaleDateString('ar-EG') : '',
        alert: n.severity === 'critical' ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' :
               n.severity === 'warning' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
               n.severity === 'success' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
               'text-sky-500 bg-sky-500/10 border-sky-500/20',
        icon: AlertTriangle,
        link: n.link || '/notifications',
      })));
    }).catch(() => {}).finally(() => setLoadingAlerts(false));
  }, []);

  return (
    <div className="rounded-2xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          التنبيهات والمخاطر التشغيلية (Risk & Compliance)
        </h3>
        <Link to="/notifications" className="text-xs font-semibold text-[#FF5E1E] hover:underline flex items-center gap-0.5">
          <span>مركز التنبيهات</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-2">
        {loadingAlerts ? (
          <>
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
          </>
        ) : alerts.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-slate-200 dark:border-[#262E40] rounded-xl">
            <Inbox className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">لا توجد تنبيهات حالياً</p>
          </div>
        ) : alerts.map((a, i) => {
          const Icon = a.icon;
          return (
            <Link
              key={i}
              to={a.link}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#121620] border border-slate-200/80 dark:border-[#262E40] hover:border-[#FF5E1E]/40 transition group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-[#1F2536] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 group-hover:text-[#FF5E1E]">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{a.title}</h4>
                  <p className="text-[10px] text-slate-400">{a.sub}</p>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${a.alert}`}>
                {a.time}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================
   Main Dashboard Container (Real Application Data + Luxury UI)
   ============================================================ */
export const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [shipments, setShipments] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [shipmentsRes, quotesRes, invoicesRes]: any = await Promise.all([
        api.get('/shipments').catch(() => []),
        api.get('/quotations').catch(() => []),
        api.get('/invoices').catch(() => []),
      ]);
      setShipments(Array.isArray(shipmentsRes) ? shipmentsRes : []);
      setQuotations(Array.isArray(quotesRes) ? quotesRes : []);
      setInvoices(Array.isArray(invoicesRes) ? invoicesRes : []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Computed Dashboard KPIs — strictly from real API data (no fallback defaults)
  const stats = useMemo(() => {
    const totalShipments = shipments.length;
    const inTransit = shipments.filter((s) => s.currentStage === 'in_transit').length;
    const atPort = shipments.filter((s) => s.currentStage === 'arrived_destination' || s.currentStage === 'clearance_in_progress').length;
    const delivered = shipments.filter((s) => s.currentStage === 'delivered').length;
    const totalQuotes = quotations.length;
    return { totalShipments, inTransit, atPort, delivered, totalQuotes };
  }, [shipments, quotations]);

  // Real revenue aggregations from invoices (EGP-consolidated)
  const revenueYearTotalEgp = useMemo(() => {
    const year = new Date().getFullYear();
    return (invoices || []).reduce((sum, inv) => {
      if (!inv?.issueDate && !inv?.createdAt) return sum;
      const d = new Date(inv.issueDate || inv.createdAt);
      if (d.getFullYear() !== year) return sum;
      const total = Number(inv.total) || 0;
      return sum + (inv.currency === 'EGP' ? total : total * USD_TO_EGP);
    }, 0);
  }, [invoices]);

  const revenueGrowthPct = useMemo(() => {
    const year = new Date().getFullYear();
    const monthly = new Array(12).fill(0);
    (invoices || []).forEach((inv) => {
      if (!inv?.issueDate && !inv?.createdAt) return;
      const d = new Date(inv.issueDate || inv.createdAt);
      if (d.getFullYear() !== year) return;
      const total = Number(inv.total) || 0;
      monthly[d.getMonth()] += inv.currency === 'EGP' ? total : total * USD_TO_EGP;
    });
    const m = new Date().getMonth();
    const prev = m > 0 ? monthly[m - 1] : 0;
    if (prev <= 0) return null;
    return Math.round(((monthly[m] - prev) / prev) * 1000) / 10;
  }, [invoices]);

  // Real free-time risk: containers discharged vs free days from shipment eta/discharge
  const freeTimeRisk = useMemo<{
    totalDischarged: number;
    atRisk: number;
    safePct: number | null;
    worstContainer: { number: string; daysOut: number; freeDays: number } | null;
  }>(() => {
    let atRisk = 0;
    let totalDischarged = 0;
    let worstContainer: { number: string; daysOut: number; freeDays: number } | null = null;
    (shipments || []).forEach((s) => {
      const freeDays = Number(s.freeDaysAllowed) || 14;
      (s.containers || []).forEach((c: any) => {
        if (c.status === 'discharged' || c.status === 'gated_out') {
          totalDischarged += 1;
          const ref = c.dischargedAt ? new Date(c.dischargedAt) : s.ata ? new Date(s.ata) : null;
          if (ref) {
            const daysOut = Math.floor((Date.now() - ref.getTime()) / 86400000);
            if (daysOut > freeDays - 3) {
              atRisk += 1;
              if (!worstContainer || daysOut - freeDays > worstContainer.daysOut - worstContainer.freeDays) {
                worstContainer = { number: c.containerNumber || '—', daysOut, freeDays };
              }
            }
          }
        }
      });
    });
    const safePct = totalDischarged > 0 ? Math.round(((totalDischarged - atRisk) / totalDischarged) * 100) : null;
    return { totalDischarged, atRisk, safePct, worstContainer };
  }, [shipments]);

  // Real customs compliance from dossiers carried on shipments
  const customsStats = useMemo(() => {
    let withAcid = 0;
    let released = 0;
    let total = 0;
    (shipments || []).forEach((s) => {
      if (s.customsDossier) {
        total += 1;
        if (s.customsDossier.acidNumber) withAcid += 1;
        if (s.customsDossier.status === 'customs_cleared' || s.customsDossier.status === 'released') released += 1;
      }
    });
    return { total, withAcid, released };
  }, [shipments]);

  // Real Egyptian destination-port breakdown from actual shipments
  const portBreakdown = useMemo(() => {
    const byPort = new Map<string, number>();
    (shipments || []).forEach((s) => {
      const name = s.destinationPort?.nameAr || s.destinationPort?.nameEn;
      if (!name) return;
      byPort.set(name, (byPort.get(name) || 0) + 1);
    });
    const rows = Array.from(byPort.entries())
      .map(([port, count]) => ({ port, count, pct: 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const max = Math.max(1, ...rows.map((r) => r.count));
    rows.forEach((r) => (r.pct = Math.round((r.count / max) * 100)));
    return rows;
  }, [shipments]);

  const activeShipment = shipments[0] || null;

  return (
    <div className="space-y-6">
      {/* ── Unified Executive Maritime Command Header ── */}
      <div className="relative rounded-3xl overflow-hidden bg-white/90 dark:bg-[#121620]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-7 shadow-sm transition-all duration-300">
        {/* Subtle Ambient Glow Mesh */}
        <div className="absolute top-0 end-0 w-96 h-96 bg-gradient-to-bl from-red-500/10 via-orange-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 start-0 w-64 h-64 bg-gradient-to-tr from-sky-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Right side: Titles, Mascot Companion & Status Pills */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>RED SHIPPING • المركز اللوجستي الموحد</span>
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#181D2A] text-slate-600 dark:text-slate-300 text-[11px] font-mono border border-slate-200 dark:border-slate-700">
                USD/EGP: 51.50 CBE
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="shrink-0 hidden sm:flex items-center justify-center -my-2">
                <AnimatedCaptainRed
                  size="sm"
                  pose="briefing"
                  interactive={true}
                  className="drop-shadow-md hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                  لوحة التحكم والعمليات الملاحية الذكية
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed mt-1">
                  متابعة دقيقة لدورة الشحن البحري، فترات السماح الممنوحة، شهادات ACID، وكشوفات الأرباح المباشرة لحظة بلحظة.
                </p>
              </div>
            </div>

            {/* Live Status Indicators */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#181D2A] border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200">
                <Ship className="w-3.5 h-3.5 text-red-500" />
                <span>{stats.totalShipments} شحنة نشطة</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#181D2A] border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200">
                <Compass className="w-3.5 h-3.5 text-sky-500" />
                <span>{stats.inTransit} شحنة في البحر الآن</span>
              </div>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                  customsStats.total === 0
                    ? 'bg-slate-50 dark:bg-[#181D2A] border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  نافذة ACID:{' '}
                  {customsStats.total === 0 ? 'لا ملفات بعد' : `${Math.round((customsStats.withAcid / customsStats.total) * 100)}% امتثال`}
                </span>
              </div>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                  freeTimeRisk.atRisk > 0
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
                    : 'bg-slate-50 dark:bg-[#181D2A] border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {freeTimeRisk.atRisk > 0
                    ? `${freeTimeRisk.atRisk} حاوية قرب انتهاء السماح`
                    : 'درع غرامات التأخير: لا مخاطر'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Left side: Quick Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap xl:flex-nowrap shrink-0">
            <Link
              to="/tracking"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-[#181D2A] dark:hover:bg-[#1E2638] text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200/80 dark:border-slate-700 transition cursor-pointer"
            >
              <Compass className="w-4 h-4 text-sky-500" />
              <span>بوابة التتبع المباشر</span>
            </Link>

            <button
              onClick={() => setIsQuotationModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-500/10 hover:bg-orange-500/15 text-[#FF5E1E] text-xs font-bold border border-orange-500/25 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تسعير نولون رسمي</span>
            </button>

            <button
              onClick={() => setIsShipmentModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF5E1E] to-[#EA580C] hover:from-[#FF7034] hover:to-[#F97316] text-white text-xs font-black shadow-lg shadow-orange-500/25 transition transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ فتح ملف شحنة (Job File)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 Executive KPI Metric Cards (Modern, Sleek, WOW Aesthetics) ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: أسطول الشحنات البحرية */}
        <div className="group relative rounded-3xl p-5 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 end-0 w-28 h-28 bg-red-500/5 group-hover:bg-red-500/10 rounded-full blur-2xl transition-colors pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">أسطول الشحنات البحرية</span>
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Ship className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {stats.totalShipments}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ملف قيد التشغيل</span>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
            <span className="px-2 py-0.5 rounded-full font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">
              {stats.inTransit} في البحر 🌊
            </span>
            <span className="px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
              {stats.atPort} بالموانئ ⚓
            </span>
          </div>
        </div>

        {/* Card 2: الإيرادات وصافي الأرباح */}
        <div className="group relative rounded-3xl p-5 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 end-0 w-28 h-28 bg-emerald-500/5 group-hover:bg-emerald-500/10 rounded-full blur-2xl transition-colors pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إيرادات النولون المفوترة</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {revenueYearTotalEgp.toLocaleString('ar-EG', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs font-bold text-slate-400 font-mono">ج.م مفوترة</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">عدد الفواتير المُصدرة</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{invoices.length}</span>
          </div>
        </div>

        {/* Card 3: درع فترات السماح وغرامات الأرضيات */}
        <div className="group relative rounded-3xl p-5 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 end-0 w-28 h-28 bg-amber-500/5 group-hover:bg-amber-500/10 rounded-full blur-2xl transition-colors pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">فترات السماح (Free Time)</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              {freeTimeRisk.safePct !== null ? `${freeTimeRisk.safePct}%` : '—'}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">حاويات مفككة في النطاق الآمن 🟢</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
            <span className="text-amber-600 dark:text-amber-400 font-semibold">حاويات قرب انتهاء السماح:</span>
            <span className="font-bold text-amber-700 dark:text-amber-300 font-mono">{freeTimeRisk.atRisk}</span>
          </div>
        </div>

        {/* Card 4: التخليص الجمركي وإفراجات نافذة */}
        <div className="group relative rounded-3xl p-5 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 end-0 w-28 h-28 bg-sky-500/5 group-hover:bg-sky-500/10 rounded-full blur-2xl transition-colors pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الامتثال الجمركي (NAFEZA)</span>
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-sky-600 dark:text-sky-400 tracking-tight">
              {customsStats.total > 0 ? `${Math.round((customsStats.withAcid / customsStats.total) * 100)}%` : '—'}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ملفات لديها رقم ACID ✓</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">ملفات مُخلصة/مفرج عنها:</span>
            <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">{customsStats.released}</span>
          </div>
        </div>
      </div>
      )}

      {/* ── Main Fleet Grid Section (Direct Match to Fleetly & Fleeex Visuals) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (Map & Active Shipment Capsule) - 4 Cols */}
        <div className="lg:col-span-4 space-y-5">
          <RouteMapCard activeShipment={activeShipment} loading={loading} />

          {/* Active Job File Capsule */}
          <div className="rounded-2xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  أحدث شحنة قيد التشغيل (Active Shipment)
                </h3>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {activeShipment?.jobFileNumber || '—'}
                </span>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* 3 Real Metric Pills */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121620] border border-slate-200/80 dark:border-[#262E40] text-center">
                <span className="text-[10px] text-slate-400 block">الحاويات</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {activeShipment?.containers?.length || 0} FCL
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121620] border border-slate-200/80 dark:border-[#262E40] text-center">
                <span className="text-[10px] text-slate-400 block">فترة السماح</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {activeShipment?.freeDaysAllowed ?? '—'} يوم
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121620] border border-slate-200/80 dark:border-[#262E40] text-center">
                <span className="text-[10px] text-slate-400 block">الإنجاز</span>
                <span className="text-xs font-bold text-[#FF5E1E]">
                  {activeShipment ? `${STAGE_PROGRESS[activeShipment.currentStage] ?? 0}%` : '—'}
                </span>
              </div>
            </div>

            {/* Client / Consignee Profile Row */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#262E40]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-[#FF5E1E] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {activeShipment?.client?.name?.charAt(0) || '—'}
                </div>
                <div className="max-w-[170px] truncate">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                    {activeShipment?.client?.name || '—'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {(() => {
                      const contacts = activeShipment?.client?.contacts || [];
                      const primary = contacts.find((c: any) => c.isPrimary) || contacts[0];
                      return primary?.mobile || primary?.phone || '';
                    })()}
                  </span>
                </div>
              </div>

              <Link
                to={`/shipments/${activeShipment?.id || ''}`}
                className="w-8 h-8 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center hover:scale-105 transition shadow-sm"
                title="فتح ملف الشحنة"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Quick Quote / Customs Promo Card */}
          <div className="relative rounded-2xl overflow-hidden p-5 bg-gradient-to-br from-[#FF5E1E] via-[#FF6F2E] to-[#E0480C] text-white shadow-lg shadow-orange-500/25 flex flex-col justify-between">
            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 backdrop-blur-md text-white uppercase tracking-wider">
                  مكتب التسعير والنولون
                </span>
                <Sparkles className="w-5 h-5 text-white/80" />
              </div>

              <div>
                <h4 className="text-lg font-black tracking-tight">حساب نولون الشحن الفوري</h4>
                <p className="text-xs text-white/85 mt-0.5">
                  تحديثات يومية لأسعار خطوط الملاحة (MSC, Maersk, COSCO) لموانئ الإسكندرية والسخنة.
                </p>
              </div>
            </div>

            <Link
              to="/pricing"
              className="mt-4 relative z-10 w-full py-2.5 rounded-xl bg-white text-slate-900 font-extrabold text-xs shadow-md hover:bg-slate-50 text-center transition-all block"
            >
              فتح جدول أسعار النولون (Pricing Matrix)
            </Link>

            <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
          </div>
        </div>

        {/* Center Column (Vehicle 3D Inspection) - 5 Cols */}
        <div className="lg:col-span-5 space-y-5">
          {/* 3D Vessel / Truck Inspection Card */}
          <VehicleFleetCard activeShipment={activeShipment} />
        </div>

        {/* Right Column (Additional Cargo Manifest & Demurrage Alert) - 3 Cols */}
        <div className="lg:col-span-3 space-y-5">
          <AdditionalItemsCard shipments={shipments} />

          {/* Real Demurrage Warning Card — computed from actual discharged containers */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold">تنبيه أرضيات وغرامات (Demurrage)</span>
            </div>
            {freeTimeRisk.worstContainer ? (
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                حاوية رقم ({freeTimeRisk.worstContainer.number})
                {freeTimeRisk.worstContainer.daysOut > freeTimeRisk.worstContainer.freeDays
                  ? ` تجاوزت ${freeTimeRisk.worstContainer.daysOut - freeTimeRisk.worstContainer.freeDays} يوماً فوق `
                  : ` اقتربت من نهاية `}
                فترة السماح ({freeTimeRisk.worstContainer.freeDays} يوماً). يرجى استكمال إجراءات الإفراج.
              </p>
            ) : (
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                لا توجد حاويات مفككة قرب انتهاء فترة السماح حالياً.
              </p>
            )}
            <Link
              to="/customs"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF5E1E] hover:underline"
            >
              <span>متابعة التخليص الجمركي</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Financial Performance Wave Chart & Egyptian Ports Breakdown (Fleeex Aesthetics) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Glowing Orange Area Wave Chart - 8 Cols */}
        <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-slate-400 font-semibold block">إجمالي إيرادات النولون والخدمات اللوجستية (مفوترة فعلية)</span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {revenueYearTotalEgp.toLocaleString('ar-EG')} ج.م
                </span>
                {revenueGrowthPct !== null && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${
                    revenueGrowthPct >= 0
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    <TrendingUp className="w-3 h-3" />
                    <span>{revenueGrowthPct >= 0 ? '+' : ''}{revenueGrowthPct}% هذا الشهر</span>
                  </span>
                )}
              </div>
            </div>

            <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-[#121620] border border-slate-200 dark:border-[#262E40] text-slate-700 dark:text-slate-300">
              {new Date().getFullYear()} (كامل السنة)
            </span>
          </div>

          {revenueYearTotalEgp > 0 ? (
            <GlowingEarningsChart invoices={invoices} />
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-center space-y-2">
              <TrendingUp className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">لا توجد فواتير مُصدرة هذا العام بعد</p>
              <p className="text-xs text-slate-400">ستظهر الإيرادات هنا تلقائياً عند إصدار أول فاتورة من قسم الفواتير</p>
            </div>
          )}
        </div>

        {/* Egyptian Logistics Ports Breakdown — computed from real shipment destinations */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              حركة الموانئ المصرية (Egyptian Ports)
            </h3>
            <Link to="/masters/ports" className="text-xs text-[#FF5E1E] font-semibold hover:underline">
              الموانئ &gt;
            </Link>
          </div>

          <div className="space-y-3">
            {portBreakdown.length > 0 ? portBreakdown.map((p, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{p.port}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{p.count} شحنة</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-[#262E40] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-[#FF5E1E]"
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
              </div>
            )) : (
              <div className="py-8 text-center">
                <p className="text-xs text-slate-400">لا توجد شحنات مسجلة لوصول لموانئ مصر بعد</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Today's Real Operations & Compliance Section (Direct Match to Fleeex Dark) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8">
          <RealOperationsTable shipments={shipments} loading={loading} />
        </div>
        <div className="lg:col-span-4">
          <RealComplianceCard />
        </div>
      </div>

      {/* Real Modals */}
      {isShipmentModalOpen && (
        <CreateShipmentModal
          isOpen={isShipmentModalOpen}
          onClose={() => setIsShipmentModalOpen(false)}
          onSuccess={() => {
            setIsShipmentModalOpen(false);
            fetchDashboardData();
            toast.success('تم فتح ملف الشحنة بنجاح!');
          }}
        />
      )}

      {isQuotationModalOpen && (
        <CreateQuotationModal
          isOpen={isQuotationModalOpen}
          onClose={() => setIsQuotationModalOpen(false)}
          onSuccess={() => {
            setIsQuotationModalOpen(false);
            fetchDashboardData();
            toast.success('تم إصدار عرض السعر بنجاح!');
          }}
        />
      )}
    </div>
  );
};
