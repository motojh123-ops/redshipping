import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  DollarSign,
  Ship,
  Users,
  FileSpreadsheet,
  ShieldCheck,
  Calendar,
  ChevronDown,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Globe2,
  Anchor,
  Package,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { exportToCsv } from '../../utils/exportUtils';
import { api } from '../../services/api';

/* ─── Demo KPI Data ─── */
const REVENUE_SUMMARY = {
  totalRevenue: 2_850_000,
  prevMonthRevenue: 2_450_000,
  totalExpenses: 1_890_000,
  grossProfit: 960_000,
  profitMargin: 33.7,
  activeShipments: 47,
  completedShipments: 128,
  totalQuotations: 85,
  wonQuotations: 34,
  activeClients: 42,
  customsClearances: 31,
  invoicePending: 680_000,
};

const MONTHLY_REVENUE = [
  { month: 'يناير', revenue: 180000, expenses: 120000, profit: 60000, shipments: 8 },
  { month: 'فبراير', revenue: 220000, expenses: 148000, profit: 72000, shipments: 11 },
  { month: 'مارس', revenue: 310000, expenses: 205000, profit: 105000, shipments: 15 },
  { month: 'أبريل', revenue: 280000, expenses: 190000, profit: 90000, shipments: 12 },
  { month: 'مايو', revenue: 350000, expenses: 230000, profit: 120000, shipments: 18 },
  { month: 'يونيو', revenue: 290000, expenses: 195000, profit: 95000, shipments: 14 },
  { month: 'يوليو', revenue: 380000, expenses: 255000, profit: 125000, shipments: 20 },
  { month: 'أغسطس', revenue: 340000, expenses: 225000, profit: 115000, shipments: 16 },
  { month: 'سبتمبر', revenue: 500000, expenses: 322000, profit: 178000, shipments: 22 },
];

const TOP_CLIENTS = [
  { name: 'المصرية للإنشاءات', revenue: 520000, shipments: 28, trend: '+18%' },
  { name: 'النيل للصناعات الثقيلة', revenue: 380000, shipments: 22, trend: '+12%' },
  { name: 'تك سوليوشنز', revenue: 290000, shipments: 15, trend: '+25%' },
  { name: 'الدلتا للنسيج والأقمشة', revenue: 240000, shipments: 18, trend: '+8%' },
  { name: 'وادي النيل للتصدير', revenue: 185000, shipments: 10, trend: '-5%' },
  { name: 'بتروكيم العربية', revenue: 160000, shipments: 8, trend: '+32%' },
];

const SALES_PERFORMANCE = [
  { name: 'أحمد سليم', leads: 24, won: 12, lost: 4, revenue: 850000, conversionRate: 50, avgDealSize: 70800 },
  { name: 'سارة أحمد', leads: 18, won: 9, lost: 3, revenue: 620000, conversionRate: 50, avgDealSize: 68900 },
  { name: 'محمد عبدالله', leads: 15, won: 6, lost: 5, revenue: 410000, conversionRate: 40, avgDealSize: 68300 },
  { name: 'نورهان كمال', leads: 12, won: 7, lost: 2, revenue: 380000, conversionRate: 58, avgDealSize: 54300 },
];

const ROUTE_ANALYTICS = [
  { route: 'شنغهاي → الإسكندرية', shipments: 22, revenue: 680000, avgTransit: '25 يوم' },
  { route: 'هامبورج → السخنة', shipments: 15, revenue: 420000, avgTransit: '18 يوم' },
  { route: 'مومباي → دمياط', shipments: 12, revenue: 350000, avgTransit: '14 يوم' },
  { route: 'الإسكندرية → روتردام', shipments: 10, revenue: 310000, avgTransit: '12 يوم' },
  { route: 'نينغبو → السخنة', shipments: 8, revenue: 250000, avgTransit: '28 يوم' },
];

const SERVICE_BREAKDOWN = [
  { type: 'بحري FCL', count: 85, percentage: 48, revenue: 1_350_000, color: 'bg-sky-500' },
  { type: 'بحري LCL', count: 32, percentage: 18, revenue: 420_000, color: 'bg-indigo-500' },
  { type: 'جوي', count: 18, percentage: 10, revenue: 380_000, color: 'bg-amber-500' },
  { type: 'بري', count: 24, percentage: 14, revenue: 320_000, color: 'bg-emerald-500' },
  { type: 'تخليص جمركي', count: 16, percentage: 9, revenue: 280_000, color: 'bg-purple-500' },
];

export const ReportsDashboardPage: React.FC = () => {
  const [period, setPeriod] = useState('ytd');
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'routes' | 'clients'>('overview');
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [kpiData, setKpiData] = useState<any>(null);

  useEffect(() => {
    api.get('/reports/kpi-summary').then((res: any) => {
      if (res && typeof res === 'object') {
        setKpiData(res);
        setIsLiveConnected(true);
      }
    }).catch(() => setIsLiveConnected(false));
  }, []);

  const summary = kpiData ? {
    ...REVENUE_SUMMARY,
    totalRevenue: kpiData.totalRevenueEgp || REVENUE_SUMMARY.totalRevenue,
    activeShipments: kpiData.activeShipmentsCount || REVENUE_SUMMARY.activeShipments,
    profitMargin: kpiData.averageProfitMarginPercent || REVENUE_SUMMARY.profitMargin,
    invoicePending: kpiData.outstandingReceivablesEgp || REVENUE_SUMMARY.invoicePending,
  } : REVENUE_SUMMARY;

  const revenueGrowth = ((summary.totalRevenue - summary.prevMonthRevenue) / summary.prevMonthRevenue * 100).toFixed(1);

  const maxRevenue = Math.max(...MONTHLY_REVENUE.map((m) => m.revenue));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">التقارير والتحليلات</h1>
          <p className="text-sm text-slate-500 mt-1">لوحة أداء شاملة — الإيرادات، المبيعات، المسارات التجارية، ومؤشرات الأداء</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
            <option value="ytd">منذ بداية السنة</option>
            <option value="q3">الربع الثالث 2026</option>
            <option value="q2">الربع الثاني 2026</option>
            <option value="q1">الربع الأول 2026</option>
            <option value="last30">آخر 30 يوم</option>
          </select>
          <button className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 transition">
            <Download className="w-4 h-4" /> تقرير PDF
          </button>
        </div>
      </div>

      {/* Top-level KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي الإيرادات" value={`${(REVENUE_SUMMARY.totalRevenue / 1000).toFixed(0)}K EGP`} icon={DollarSign} trend={`+${revenueGrowth}% عن الشهر السابق`} trendDirection="up" iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-950/50" />
        <StatCard title="صافي الربح" value={`${(REVENUE_SUMMARY.grossProfit / 1000).toFixed(0)}K EGP`} icon={TrendingUp} trend={`هامش ${REVENUE_SUMMARY.profitMargin}%`} trendDirection="up" iconColor="text-brand-600" iconBg="bg-brand-50 dark:bg-brand-950/50" />
        <StatCard title="الشحنات النشطة" value={REVENUE_SUMMARY.activeShipments} icon={Ship} subtitle={`${REVENUE_SUMMARY.completedShipments} مكتملة`} iconColor="text-sky-600" iconBg="bg-sky-50 dark:bg-sky-950/50" />
        <StatCard title="فواتير معلقة" value={`${(REVENUE_SUMMARY.invoicePending / 1000).toFixed(0)}K EGP`} icon={FileSpreadsheet} subtitle="بحاجة للتحصيل" iconColor="text-amber-600" iconBg="bg-amber-50 dark:bg-amber-950/50" />
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-1.5">
        {[
          { key: 'overview', label: 'نظرة عامة', icon: BarChart3 },
          { key: 'sales', label: 'أداء المبيعات', icon: Users },
          { key: 'routes', label: 'المسارات التجارية', icon: Globe2 },
          { key: 'clients', label: 'تحليل العملاء', icon: Target },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${activeTab === tab.key ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ===== Overview Tab ===== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Revenue Chart (pure CSS bars) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">الإيرادات الشهرية (EGP)</h3>
            <div className="flex items-end gap-3 h-52">
              {MONTHLY_REVENUE.map((m, i) => {
                const height = (m.revenue / maxRevenue) * 100;
                const profitHeight = (m.profit / maxRevenue) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition">{(m.revenue / 1000).toFixed(0)}K</span>
                    <div className="w-full relative" style={{ height: `${height}%` }}>
                      <div className="absolute inset-x-0 bottom-0 rounded-t-lg bg-brand-500/80 transition-all group-hover:bg-brand-600" style={{ height: '100%' }} />
                      <div className="absolute inset-x-0 bottom-0 rounded-t-lg bg-emerald-400/60" style={{ height: `${profitHeight / height * 100}%` }} />
                    </div>
                    <span className="text-[9px] font-medium text-slate-400 mt-1">{m.month.substring(0, 3)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-500/80" /><span className="text-[10px] text-slate-500">الإيرادات</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400/60" /><span className="text-[10px] text-slate-500">صافي الربح</span></div>
            </div>
          </div>

          {/* Service Type Breakdown + Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Service Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">توزيع الخدمات حسب النوع</h3>
              <div className="space-y-3">
                {SERVICE_BREAKDOWN.map((svc, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{svc.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{svc.count} شحنة</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white">{svc.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${svc.color} transition-all duration-700`} style={{ width: `${svc.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Operational KPIs */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">مؤشرات تشغيلية رئيسية</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-800/40">
                  <Ship className="w-5 h-5 text-sky-600 mb-1" />
                  <span className="text-lg font-bold text-slate-800 dark:text-white block">{REVENUE_SUMMARY.activeShipments}</span>
                  <span className="text-[10px] text-slate-500">شحنة نشطة</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                  <Package className="w-5 h-5 text-emerald-600 mb-1" />
                  <span className="text-lg font-bold text-slate-800 dark:text-white block">{REVENUE_SUMMARY.completedShipments}</span>
                  <span className="text-[10px] text-slate-500">شحنة مكتملة</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                  <FileSpreadsheet className="w-5 h-5 text-amber-600 mb-1" />
                  <span className="text-lg font-bold text-slate-800 dark:text-white block">{REVENUE_SUMMARY.totalQuotations}</span>
                  <span className="text-[10px] text-slate-500">عرض سعر ({REVENUE_SUMMARY.wonQuotations} مقبول)</span>
                </div>
                <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40">
                  <ShieldCheck className="w-5 h-5 text-purple-600 mb-1" />
                  <span className="text-lg font-bold text-slate-800 dark:text-white block">{REVENUE_SUMMARY.customsClearances}</span>
                  <span className="text-[10px] text-slate-500">ملف تخليص جمركي</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Sales Performance Tab ===== */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">أداء فريق المبيعات</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="text-start px-6 py-3 font-semibold text-slate-500">الموظف</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500">الفرص</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500">مكسوب</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500">خسارة</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500">معدل التحويل</th>
                    <th className="text-end px-4 py-3 font-semibold text-slate-500">الإيرادات</th>
                    <th className="text-end px-4 py-3 font-semibold text-slate-500">متوسط الصفقة</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500">الأداء</th>
                  </tr>
                </thead>
                <tbody>
                  {SALES_PERFORMANCE.map((sp, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-bold">{sp.name.charAt(0)}</div>
                          <span className="font-semibold text-slate-800 dark:text-white">{sp.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center font-medium text-slate-600 dark:text-slate-300">{sp.leads}</td>
                      <td className="px-4 py-4 text-center font-bold text-emerald-600">{sp.won}</td>
                      <td className="px-4 py-4 text-center font-bold text-red-500">{sp.lost}</td>
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${sp.conversionRate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${sp.conversionRate}%` }} />
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{sp.conversionRate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-end font-bold text-slate-800 dark:text-white">{sp.revenue.toLocaleString()} EGP</td>
                      <td className="px-4 py-4 text-end font-medium text-slate-500">{sp.avgDealSize.toLocaleString()} EGP</td>
                      <td className="px-4 py-4 text-center">
                        {i === 0 ? <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">⭐ الأفضل</span> :
                          sp.conversionRate >= 50 ? <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">ممتاز</span> :
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">جيد</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sales Funnel */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">قمع المبيعات — تحويل الفرص</h3>
            <div className="space-y-2">
              {[
                { stage: 'فرص جديدة', count: 69, pct: 100, color: 'bg-sky-500' },
                { stage: 'تم التواصل', count: 52, pct: 75, color: 'bg-indigo-500' },
                { stage: 'تم التسعير', count: 38, pct: 55, color: 'bg-amber-500' },
                { stage: 'قيد التفاوض', count: 22, pct: 32, color: 'bg-purple-500' },
                { stage: 'مكسوب', count: 34, pct: 49, color: 'bg-emerald-500' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-semibold text-slate-600 dark:text-slate-300 text-end">{s.stage}</span>
                  <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative">
                    <div className={`h-full rounded-lg ${s.color} transition-all duration-700 flex items-center justify-end pe-3`} style={{ width: `${s.pct}%` }}>
                      <span className="text-[10px] font-bold text-white">{s.count}</span>
                    </div>
                  </div>
                  <span className="w-10 text-[10px] font-bold text-slate-400 text-start">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== Routes Tab ===== */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">أكثر المسارات التجارية نشاطاً</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">ترتيب حسب عدد الشحنات والإيرادات</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="text-start px-6 py-3 font-semibold text-slate-500">#</th>
                    <th className="text-start px-4 py-3 font-semibold text-slate-500">المسار</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500">عدد الشحنات</th>
                    <th className="text-end px-4 py-3 font-semibold text-slate-500">الإيرادات</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500">متوسط العبور</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500">الحصة</th>
                  </tr>
                </thead>
                <tbody>
                  {ROUTE_ANALYTICS.map((route, i) => {
                    const totalRouteShipments = ROUTE_ANALYTICS.reduce((s, r) => s + r.shipments, 0);
                    const share = ((route.shipments / totalRouteShipments) * 100).toFixed(0);
                    return (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-6 py-4">
                          {i === 0 ? <span className="text-amber-500 font-bold">🥇</span> :
                            i === 1 ? <span className="text-slate-400 font-bold">🥈</span> :
                              i === 2 ? <span className="text-amber-700 font-bold">🥉</span> :
                                <span className="font-bold text-slate-400">{i + 1}</span>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Anchor className="w-4 h-4 text-sky-500" />
                            <span className="font-semibold text-slate-800 dark:text-white">{route.route}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-slate-700 dark:text-slate-200">{route.shipments}</td>
                        <td className="px-4 py-4 text-end font-bold text-emerald-600">{route.revenue.toLocaleString()} EGP</td>
                        <td className="px-4 py-4 text-center text-slate-500">{route.avgTransit}</td>
                        <td className="px-4 py-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-brand-500" style={{ width: `${share}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== Clients Tab ===== */}
      {activeTab === 'clients' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">أفضل العملاء حسب الإيرادات</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="text-start px-6 py-3 font-semibold text-slate-500">#</th>
                    <th className="text-start px-4 py-3 font-semibold text-slate-500">العميل</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500">الشحنات</th>
                    <th className="text-end px-4 py-3 font-semibold text-slate-500">الإيرادات</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500">النمو</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500">الحصة</th>
                  </tr>
                </thead>
                <tbody>
                  {TOP_CLIENTS.map((client, i) => {
                    const totalClientRev = TOP_CLIENTS.reduce((s, c) => s + c.revenue, 0);
                    const share = ((client.revenue / totalClientRev) * 100).toFixed(0);
                    const isUp = client.trend.startsWith('+');
                    return (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-6 py-4">
                          {i === 0 ? <span className="font-bold">🏆</span> : <span className="font-bold text-slate-400">{i + 1}</span>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-[10px] font-bold">{client.name.charAt(0)}</div>
                            <span className="font-semibold text-slate-800 dark:text-white">{client.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-bold text-slate-700 dark:text-slate-200">{client.shipments}</td>
                        <td className="px-4 py-4 text-end font-bold text-slate-800 dark:text-white">{client.revenue.toLocaleString()} EGP</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {client.trend}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-sky-500" style={{ width: `${share}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
