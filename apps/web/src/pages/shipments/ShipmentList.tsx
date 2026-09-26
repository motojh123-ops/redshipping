import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ship, Filter, Search, ChevronRight, Container, MapPin, Calendar, Plus, Download, FileBadge, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { useShipments } from '../../hooks/queries/useShipments';
import { CreateShipmentModal } from './CreateShipmentModal';
import { exportToCsv } from '../../utils/exportUtils';
import { PortOptions } from '../../components/ui/PortSelect';
import { calculateDemurrageDetention } from '../../utils/maritime';

const getShipmentDemurrageStatus = (s: any) => {
  const containers = s.containers || [];
  const dischargedContainers = containers.filter((c: any) => c.dischargedAt);

  if (dischargedContainers.length === 0) {
    return {
      type: 'pending',
      label: `${s.freeDaysAllowed || 14} يوم سماح`,
      subtext: 'سارية بعد التفريغ',
      className: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    };
  }

  let minRemaining = 999;
  let maxOverdueDays = 0;
  let totalFineUsd = 0;

  dischargedContainers.forEach((c: any) => {
    const dd = calculateDemurrageDetention({
      containerNumber: c.containerNumber || '',
      containerType: c.containerType || '40HQ',
      shippingLine: s.shippingLine?.name || 'MSC',
      dischargedAt: c.dischargedAt,
      gatedOutAt: c.emptyReturnedAt,
      agreedFreeDays: s.freeDaysAllowed || 14,
      egpExchangeRate: 51.50,
    });

    if (dd.isOverdue) {
      if (dd.chargeableDays > maxOverdueDays) maxOverdueDays = dd.chargeableDays;
      totalFineUsd += dd.totalDemurrageUsd;
    } else {
      const remaining = dd.freeDays - dd.totalDaysInPort;
      if (remaining < minRemaining) minRemaining = remaining;
    }
  });

  if (maxOverdueDays > 0) {
    return {
      type: 'overdue',
      label: `🔴 متجاوز ${maxOverdueDays} يوم`,
      subtext: `غرامة: $${totalFineUsd} USD`,
      className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse font-bold',
    };
  }

  if (minRemaining <= 2) {
    return {
      type: 'warning',
      label: `🟡 متبقي ${minRemaining} يوم فقط`,
      subtext: 'تحذير اقتراب انتهاء السماح',
      className: 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold',
    };
  }

  return {
    type: 'safe',
    label: `🟢 متبقي ${minRemaining} يوم سماح`,
    subtext: 'فترة سماح سارية وآمنة',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold',
  };
};

export const ShipmentList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [portFilter, setPortFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const {
    data: shipments = [],
    isLoading: loading,
    isSuccess: isLiveConnected,
    refetch,
  } = useShipments({
    search: search || undefined,
    stage: stageFilter || undefined,
    port: portFilter || undefined,
  });

  const handleExportShipments = () => {
    exportToCsv('redshipping_shipments_report', shipments, [
      { header: 'رقم ملف الشحنة', accessor: (s) => s.jobFileNumber },
      { header: 'رقم البوليصة B/L', accessor: (s) => s.blNumber || '—' },
      { header: 'العميل', accessor: (s) => s.client?.name || s.clientName || '—' },
      { header: 'خط الملاحة', accessor: (s) => s.shippingLine?.name || s.carrier || '—' },
      { header: 'ميناء الشحن POL', accessor: (s) => s.polPort?.nameEn || s.pol || '—' },
      { header: 'ميناء الوصول POD', accessor: (s) => s.podPort?.nameEn || s.pod || '—' },
      { header: 'نوع الشحن', accessor: (s) => s.shipmentType },
      { header: 'المرحلة التشغيلية', accessor: (s) => s.currentStage },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إدارة الشحنات والعمليات البحرية</h1>
          <p className="text-sm text-slate-500 mt-1">متابعة ملفات الشحن، خطوط السير، مراحل التشغيل، وأرقام الحاويات</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Sync Status Pill */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
            isLiveConnected 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-xs' 
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{isLiveConnected ? '🟢 متصل بالـ API (Live Synced)' : '🟡 وضع الذاكرة المحلية'}</span>
          </div>

          <button
            onClick={() => refetch()}
            disabled={loading}
            title="تحديث البيانات من السيرفر"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <Clock className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FF5E1E]' : 'text-slate-500'}`} />
            <span>تحديث</span>
          </button>

          <button
            onClick={handleExportShipments}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF5E1E] hover:bg-[#FF7034] text-white text-sm font-semibold shadow-md shadow-orange-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>فتح ملف شحنة جديد</span>
          </button>
        </div>
      </div>

      <CreateShipmentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => refetch()}
      />

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الملف، رقم البوليصة B/L، أو اسم السفينة..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 ps-10 pe-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E] transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]"
          >
            <option value="">جميع المراحل التشغيلية</option>
            <option value="booking_confirmed">تأكيد الحجز (Booking Confirmed)</option>
            <option value="cargo_received">استلام البضاعة (Cargo Received)</option>
            <option value="acid_issued">صدور نافذة (ACID Issued)</option>
            <option value="in_transit">في البحر (In Transit)</option>
            <option value="arrived_destination">وصول الميناء (Arrived Destination)</option>
            <option value="clearance_in_progress">قيد التخليص (Customs Clearance)</option>
            <option value="delivered">تم التسليم (Delivered)</option>
          </select>

          <select
            value={portFilter}
            onChange={(e) => setPortFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]"
          >
            <PortOptions includeAllOption allOptionLabel="تصفية حسب الميناء (الكل)" allOptionValue="" />
          </select>
        </div>
      </div>

      {/* Shipments List Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-medium uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 text-start">رقم الملف (Job File)</th>
                <th className="py-3.5 px-4 text-start">العميل</th>
                <th className="py-3.5 px-4 text-start">الموانئ وخط السير</th>
                <th className="py-3.5 px-4 text-start">الحاويات وتفاصيل الشحنة</th>
                <th className="py-3.5 px-4 text-start">المرحلة الحالية</th>
                <th className="py-3.5 px-4 text-start">عداد غرامات وسماح الحاويات (D&D)</th>
                <th className="py-3.5 px-4 text-start"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {shipments.length > 0 ? (
                shipments.map((s) => {
                  const status = getShipmentDemurrageStatus(s);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4 font-bold text-brand-600">
                        <div>{s.jobFileNumber}</div>
                        <div className="text-[11px] font-normal text-slate-400">B/L: {s.blNumber || '—'}</div>
                        {s.deliveryOrderNumber && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                            <FileBadge className="w-3 h-3" />
                            <span>D/O: {s.deliveryOrderNumber}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-900 dark:text-white">
                        {s.client?.name || 'عميل غير محدد'}
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.originPort?.nameEn || s.originPort?.code || '—'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 ps-5">
                          إلى: {s.destinationPort?.nameEn || s.destinationPort?.code || '—'}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                          <Container className="w-4 h-4 text-[#FF5E1E]" />
                          <span>{s.containers?.length ? `${s.containers.length}x الحاويات` : '—'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {s.currentStage}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs ${status.className}`}>
                            {status.label}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {status.subtext}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-end">
                        <Link
                          to={`/shipments/${s.id}`}
                          className="inline-flex p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <ChevronRight className="w-5 h-5 rtl:rotate-180" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Ship className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">لا توجد شحنات مسجلة</p>
                    <p className="text-xs text-slate-400 mt-1">لم يتم العثور على أي شحنات مطابقة في قاعدة البيانات.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
