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
  Inbox,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { SkeletonCard, SkeletonTable } from '../../components/ui/Skeleton';
import { exportToCsv } from '../../utils/exportUtils';
import { api } from '../../services/api';
import { toast } from 'sonner';

export const ReportsDashboardPage: React.FC = () => {
  const [period, setPeriod] = useState('ytd');
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'routes' | 'clients'>('overview');
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<any>(null);
  const [lanesData, setLanesData] = useState<any[]>([]);
  const [clientsData, setClientsData] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.get('/reports/kpi-summary', { params: { period } }),
      api.get('/reports/lanes-performance', { params: { period } }),
      api.get('/clients'),
    ]).then(([kpiRes, lanesRes, clientsRes]) => {
      if (kpiRes.status === 'fulfilled' && kpiRes.value && typeof kpiRes.value === 'object') {
        setKpiData(kpiRes.value);
      }
      if (lanesRes.status === 'fulfilled' && Array.isArray(lanesRes.value)) {
        setLanesData(lanesRes.value);
      } else if (lanesRes.status === 'fulfilled' && (lanesRes.value as any)?.data && Array.isArray((lanesRes.value as any).data)) {
        setLanesData((lanesRes.value as any).data);
      }
      if (clientsRes.status === 'fulfilled' && Array.isArray(clientsRes.value)) {
        setClientsData(clientsRes.value);
      } else if (clientsRes.status === 'fulfilled' && (clientsRes.value as any)?.data && Array.isArray((clientsRes.value as any).data)) {
        setClientsData((clientsRes.value as any).data);
      }
      setLoading(false);
    });
  }, [period]);

  const monthlyTrend = kpiData?.monthlyRevenueTrend || [];
  const carriers = kpiData?.carrierMarketShare || [];
  const topPorts = kpiData?.topPortsByVolume || [];

  const totalRevenue = kpiData?.totalRevenueEgp || 0;
  const profitMargin = kpiData?.averageProfitMarginPercent || 0;
  const activeShipments = kpiData?.activeShipmentsCount || 0;
  const invoicePending = kpiData?.outstandingReceivablesEgp || 0;
  const growthPercent = kpiData?.monthlyGrowthPercent || 0;
  const grossProfit = Math.round(totalRevenue * profitMargin / 100);

  const maxRevenue = monthlyTrend.length > 0 ? Math.max(...monthlyTrend.map((m: any) => m.revenue)) : 1;

  /* ── Empty State Component ── */
  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
      <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">{message}</p>
      <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">سيتم عرض البيانات هنا عند توفرها من النظام</p>
    </div>
  );

  /* Client has no phone/email columns — they live on ClientContact */
  const primaryContact = (c: any) =>
    c?.contacts?.find((x: any) => x.isPrimary) || c?.contacts?.[0] || null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-48 animate-shimmer rounded-lg bg-slate-200/80 dark:bg-[#1E2638]" />
            <div className="h-3.5 w-72 animate-shimmer rounded-lg bg-slate-200/80 dark:bg-[#1E2638]" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonTable rows={6} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">التقارير والتحليلات</h1>
          <p className="text-sm text-slate-500 mt-1">لوحة أداء شاملة — الإيرادات، المبيعات، المسارات التجارية، ومؤشرات الأداء</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E2638] text-xs font-medium text-slate-700 dark:text-slate-300">
            <option value="ytd">منذ بداية السنة</option>
            <option value="q3">الربع الثالث 2026</option>
            <option value="q2">الربع الثاني 2026</option>
            <option value="q1">الربع الأول 2026</option>
            <option value="last30">آخر 30 يوم</option>
          </select>
          <button
            onClick={() => {
              exportToCsv(
                'reports_summary',
                [
                  ...monthlyTrend.map((m: any) => ({ section: 'monthly', month: m.month, revenue: m.revenue, cost: m.cost, profit: m.profit })),
                  ...lanesData.map((l: any) => ({ section: 'lane', month: l.lane, revenue: l.shipmentsCount, cost: l.averageTransitDays, profit: l.averageMarginPercent })),
                ],
                [
                  { header: 'القسم', accessor: (r: any) => r.section },
                  { header: 'الشهر/المسار', accessor: (r: any) => r.month },
                  { header: 'القيمة 1', accessor: (r: any) => r.revenue },
                  { header: 'القيمة 2', accessor: (r: any) => r.cost },
                  { header: 'القيمة 3', accessor: (r: any) => r.profit },
                ],
              );
              toast.success('تم تصدير ملخص التقارير (CSV)');
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-[#262E40] hover:bg-slate-50 dark:hover:bg-[#1E2638] text-sm font-medium text-slate-600 dark:text-slate-300 transition"
          >
            <Download className="w-4 h-4" /> تصدير CSV
          </button>
        </div>
      </div>

      {/* Top-level KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي الإيرادات" value={totalRevenue > 0 ? `${(totalRevenue / 1000).toFixed(0)}K EGP` : '—'} icon={DollarSign} trend={growthPercent > 0 ? `+${growthPercent}% عن الشهر السابق` : undefined} trendDirection="up" iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-950/50" />
        <StatCard title="صافي الربح" value={grossProfit > 0 ? `${(grossProfit / 1000).toFixed(0)}K EGP` : '—'} icon={TrendingUp} trend={profitMargin > 0 ? `هامش ${profitMargin}%` : undefined} trendDirection="up" iconColor="text-brand-600" iconBg="bg-brand-50 dark:bg-brand-950/50" />
        <StatCard title="الشحنات النشطة" value={activeShipments || '—'} icon={Ship} iconColor="text-sky-600" iconBg="bg-sky-50 dark:bg-sky-950/50" />
        <StatCard title="فواتير معلقة" value={invoicePending > 0 ? `${(invoicePending / 1000).toFixed(0)}K EGP` : '—'} icon={FileSpreadsheet} subtitle="بحاجة للتحصيل" iconColor="text-amber-600" iconBg="bg-amber-50 dark:bg-amber-950/50" />
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-white dark:bg-[#181D2A] rounded-2xl border border-slate-200/80 dark:border-[#262E40] p-1.5">
        {[
          { key: 'overview', label: 'نظرة عامة', icon: BarChart3 },
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
          {/* Revenue Chart (from API monthly trend) */}
          <div className="bg-white dark:bg-[#181D2A] rounded-2xl border border-slate-200/80 dark:border-[#262E40] p-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">الإيرادات الشهرية (EGP)</h3>
            {monthlyTrend.some((m: any) => m.revenue > 0 || m.cost > 0) ? (
              <>
                <div className="flex items-end gap-3 h-52">
                  {monthlyTrend.map((m: any, i: number) => {
                    const height = (m.revenue / maxRevenue) * 100;
                    const profitHeight = (m.profit / maxRevenue) * 100;
                    const profitShare = height > 0 ? Math.min(100, (profitHeight / height) * 100) : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <span className="text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition">{(m.revenue / 1000).toFixed(0)}K</span>
                        <div className="w-full relative" style={{ height: `${height}%` }}>
                          <div className="absolute inset-x-0 bottom-0 rounded-t-lg bg-brand-500/80 transition-all group-hover:bg-brand-600" style={{ height: '100%' }} />
                          <div className="absolute inset-x-0 bottom-0 rounded-t-lg bg-emerald-400/60" style={{ height: `${profitShare}%` }} />
                        </div>
                        <span className="text-[9px] font-medium text-slate-400 mt-1">{(m.month || '').substring(0, 3)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-[#262E40]">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-500/80" /><span className="text-[10px] text-slate-500">الإيرادات</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400/60" /><span className="text-[10px] text-slate-500">صافي الربح</span></div>
                </div>
              </>
            ) : (
              <EmptyState message="لا توجد بيانات إيرادات شهرية بعد" />
            )}
          </div>

          {/* Carrier Market Share + Port KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Carrier Share */}
            <div className="bg-white dark:bg-[#181D2A] rounded-2xl border border-slate-200/80 dark:border-[#262E40] p-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">حصة الخطوط الملاحية</h3>
              {carriers.length > 0 ? (
                <div className="space-y-3">
                  {carriers.map((c: any, i: number) => {
                    const colors = ['bg-sky-500', 'bg-indigo-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500'];
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{c.carrierName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">{c.shipmentCount} شحنة</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-white">{c.sharePercent}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-[#1E2638] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-700`} style={{ width: `${c.sharePercent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState message="لا توجد بيانات خطوط ملاحية" />
              )}
            </div>

            {/* Top Ports KPIs */}
            <div className="bg-white dark:bg-[#181D2A] rounded-2xl border border-slate-200/80 dark:border-[#262E40] p-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">أعلى الموانئ حسب الحجم</h3>
              {topPorts.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {topPorts.slice(0, 4).map((p: any, i: number) => {
                    const iconColors = ['text-sky-600', 'text-emerald-600', 'text-amber-600', 'text-purple-600'];
                    const bgColors = ['bg-sky-50/50 dark:bg-sky-950/20 border-sky-200/60 dark:border-sky-800/40', 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40', 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40', 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-800/40'];
                    return (
                      <div key={i} className={`p-3 rounded-xl border ${bgColors[i % bgColors.length]}`}>
                        <Anchor className={`w-5 h-5 ${iconColors[i % iconColors.length]} mb-1`} />
                        <span className="text-lg font-bold text-slate-800 dark:text-white block">{p.volumeTeu} TEU</span>
                        <span className="text-[10px] text-slate-500 block truncate">{p.portName}</span>
                        <span className="text-[9px] text-slate-400">{(p.revenueEgp / 1000).toFixed(0)}K EGP</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState message="لا توجد بيانات موانئ" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Routes Tab ===== */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#181D2A] rounded-2xl border border-slate-200/80 dark:border-[#262E40] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#262E40]">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">أكثر المسارات التجارية نشاطاً</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">ترتيب حسب عدد الشحنات والإيرادات</p>
            </div>
            {lanesData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-[#262E40]">
                      <th className="text-start px-6 py-3 font-semibold text-slate-500">#</th>
                      <th className="text-start px-4 py-3 font-semibold text-slate-500">المسار</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-500">عدد الشحنات</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-500">متوسط العبور</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-500">هامش الربح</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-500">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lanesData.map((lane: any, i: number) => {
                      const statusMap: Record<string, { label: string; cls: string }> = {
                        high_demand: { label: 'طلب مرتفع', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
                        fast_transit: { label: 'عبور سريع', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
                        steady: { label: 'مستقر', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
                      };
                      const st = statusMap[lane.status] || { label: lane.status, cls: 'bg-slate-100 text-slate-600' };
                      return (
                        <tr key={i} className="border-b border-slate-100 dark:border-[#262E40] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="px-6 py-4">
                            {i === 0 ? <span className="text-amber-500 font-bold">🥇</span> :
                              i === 1 ? <span className="text-slate-400 font-bold">🥈</span> :
                                i === 2 ? <span className="text-amber-700 font-bold">🥉</span> :
                                  <span className="font-bold text-slate-400">{i + 1}</span>}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Anchor className="w-4 h-4 text-sky-500" />
                              <span className="font-semibold text-slate-800 dark:text-white">{lane.lane}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center font-bold text-slate-700 dark:text-slate-200">{lane.shipmentsCount}</td>
                          <td className="px-4 py-4 text-center text-slate-500">{lane.averageTransitDays} يوم</td>
                          <td className="px-4 py-4 text-center font-bold text-emerald-600">{lane.averageMarginPercent}%</td>
                          <td className="px-4 py-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="لا توجد بيانات مسارات تجارية بعد" />
            )}
          </div>
        </div>
      )}

      {/* ===== Clients Tab ===== */}
      {activeTab === 'clients' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#181D2A] rounded-2xl border border-slate-200/80 dark:border-[#262E40] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#262E40]">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">العملاء المسجلين</h3>
            </div>
            {clientsData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-[#262E40]">
                      <th className="text-start px-6 py-3 font-semibold text-slate-500">#</th>
                      <th className="text-start px-4 py-3 font-semibold text-slate-500">العميل</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-500">البريد الإلكتروني</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-500">الهاتف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientsData.map((client: any, i: number) => (
                      <tr key={client.id || i} className="border-b border-slate-100 dark:border-[#262E40] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-400">{i + 1}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-[10px] font-bold">{(client.name || client.companyName || '?').charAt(0)}</div>
                            <span className="font-semibold text-slate-800 dark:text-white">{client.name || client.companyName || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-slate-500">{client.email || primaryContact(client)?.email || '—'}</td>
                        <td className="px-4 py-4 text-center text-slate-500">{primaryContact(client)?.mobile || primaryContact(client)?.phone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="لا يوجد عملاء مسجلين بعد" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
