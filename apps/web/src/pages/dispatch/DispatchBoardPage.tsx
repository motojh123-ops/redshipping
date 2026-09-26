import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Truck,
  Search,
  Plus,
  FileSpreadsheet,
  Printer,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Building2,
  User,
  Phone,
  RotateCcw,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { exportToCsv } from '../../utils/exportUtils';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../services/api';

/** Shape returned by GET/POST /dispatch/trips (see dispatch.service.ts DTO) */
interface DispatchTrip {
  id: string;
  tripNumber: string;
  shipmentId?: string | null;
  jobFileNumber?: string | null;
  clientName: string;
  containerNumber: string;
  containerType: string;
  pickupLocation: string;
  deliveryLocation: string;
  driverId?: string | null;
  driverName: string;
  driverPhone: string;
  truckPlate: string;
  truckType: string;
  status: 'scheduled' | 'loading' | 'in_transit' | 'delivered' | 'empty_returned' | 'cancelled';
  scheduledDate: string;
  departureTime?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  costRate: number;
  sellRate: number;
  currency: string;
  waybillNumber: string;
  notes?: string;
}

type UiStatus = 'ASSIGNED' | 'GATE_OUT' | 'DELIVERED_TO_FACTORY' | 'EMPTY_RETURNED' | 'CANCELLED';

const apiToUi = (s: DispatchTrip['status']): UiStatus =>
  s === 'in_transit'
    ? 'GATE_OUT'
    : s === 'delivered'
    ? 'DELIVERED_TO_FACTORY'
    : s === 'empty_returned'
    ? 'EMPTY_RETURNED'
    : s === 'cancelled'
    ? 'CANCELLED'
    : 'ASSIGNED';

const uiToApi = (s: UiStatus): DispatchTrip['status'] =>
  s === 'GATE_OUT'
    ? 'in_transit'
    : s === 'DELIVERED_TO_FACTORY'
    ? 'delivered'
    : s === 'EMPTY_RETURNED'
    ? 'empty_returned'
    : 'scheduled';

const STATUS_LABELS: Record<UiStatus, string> = {
  ASSIGNED: 'تم تعيين السائق والشاحنة',
  GATE_OUT: 'في الطريق (Gate-Out)',
  DELIVERED_TO_FACTORY: 'تم التسليم بالمصنع',
  EMPTY_RETURNED: 'تم إرجاع الفارغ',
  CANCELLED: 'ملغي',
};

export const DispatchBoardPage: React.FC = () => {
  const [trips, setTrips] = useState<DispatchTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeOrderForPrint, setActiveOrderForPrint] = useState<DispatchTrip | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // Masters data: trucking vendors + drivers (linked from السجل الرئيسي)
  const [truckingVendors, setTruckingVendors] = useState<any[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res: any = await api.get('/dispatch/trips');
      const list = Array.isArray(res) ? res : res?.items || [];
      setTrips(list);
    } catch (err: any) {
      setLoadError(err?.message || 'تعذر تحميل أوامر النقل من الخادم');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
    api.get('/masters/vendors').then((res: any) => {
      const list = Array.isArray(res) ? res : res?.data || [];
      setTruckingVendors(list.filter((v: any) => v.vendorType === 'trucking'));
    }).catch(() => {});
    api.get('/masters/drivers').then((res: any) => {
      const list = Array.isArray(res) ? res : res?.data || [];
      setAvailableDrivers(list);
    }).catch(() => {});
  }, [loadTrips]);

  // EIR Clean Return Modal State
  const [isEirModalOpen, setIsEirModalOpen] = useState(false);
  const [selectedOrderForEir, setSelectedOrderForEir] = useState<DispatchTrip | null>(null);
  const [eirForm, setEirForm] = useState({
    eirNumber: '',
    emptyReturnDate: '',
    emptyReturnYard: '',
    eirStatus: 'CLEAN' as 'CLEAN' | 'DAMAGED',
    eirSurveyorName: '',
    eirDamagesFeeEgp: 0,
    eirNotes: '',
  });

  // New Dispatch Form State
  const [newOrder, setNewOrder] = useState({
    containerNumber: '',
    containerType: '40HQ',
    clientName: '',
    pickupLocation: '',
    deliveryLocation: '',
    truckingVendor: '',
    driverName: '',
    driverPhone: '',
    driverNationalId: '',
    truckHeadPlate: '',
    trailerPlate: '',
    emptyReturnYard: '',
    scheduledDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const ui = apiToUi(t.status);
      const matchesStatus = statusFilter === 'ALL' || ui === statusFilter;
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        t.tripNumber.toLowerCase().includes(q) ||
        (t.jobFileNumber || '').toLowerCase().includes(q) ||
        t.containerNumber.toLowerCase().includes(q) ||
        t.driverName.toLowerCase().includes(q) ||
        t.driverPhone.includes(searchTerm) ||
        t.truckPlate.toLowerCase().includes(q) ||
        t.clientName.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [trips, statusFilter, searchTerm]);

  // KPIs
  const stats = useMemo(() => {
    const total = trips.length;
    const gateOut = trips.filter((t) => apiToUi(t.status) === 'GATE_OUT').length;
    const delivered = trips.filter((t) => apiToUi(t.status) === 'DELIVERED_TO_FACTORY').length;
    const emptyReturned = trips.filter((t) => apiToUi(t.status) === 'EMPTY_RETURNED').length;
    return { total, gateOut, delivered, emptyReturned };
  }, [trips]);

  const handleUpdateStatus = async (tripId: string, uiStatus: Exclude<UiStatus, 'ASSIGNED' | 'CANCELLED'>) => {
    setActionBusyId(tripId);
    try {
      const updated: any = await api.patch(`/dispatch/trips/${tripId}/status`, {
        status: uiToApi(uiStatus),
      });
      setTrips((prev) => prev.map((t) => (t.id === tripId ? updated : t)));
    } catch (err: any) {
      alert(err?.message || 'تعذر تحديث حالة أمر النقل');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleOpenEirModal = (trip: DispatchTrip) => {
    setSelectedOrderForEir(trip);
    setEirForm({
      // The EIR number & yard are real-world references issued by the depot —
      // the operator records the actual values from the returned document.
      eirNumber: '',
      emptyReturnDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      emptyReturnYard: '',
      eirStatus: 'CLEAN',
      eirSurveyorName: '',
      eirDamagesFeeEgp: 0,
      eirNotes: '',
    });
    setIsEirModalOpen(true);
  };

  const handleConfirmEirReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForEir) return;
    if (!eirForm.eirNumber.trim()) {
      alert('أدخل رقم إيصال الإرجاع الفعلي (EIR) الصادر من الساحة');
      return;
    }
    if (!eirForm.emptyReturnYard.trim()) {
      alert('أدخل اسم ساحة إرجاع الحاوية الفارغة الفعلية');
      return;
    }

    const composedNotes = [
      `EIR: ${eirForm.eirNumber} (${eirForm.eirStatus})`,
      `ساحة الإرجاع: ${eirForm.emptyReturnYard}`,
      `توقيت الإرجاع: ${eirForm.emptyReturnDate}`,
      eirForm.eirSurveyorName ? `المعاين: ${eirForm.eirSurveyorName}` : '',
      eirForm.eirStatus === 'DAMAGED' && eirForm.eirDamagesFeeEgp ? `تقدير التلفيات: ${eirForm.eirDamagesFeeEgp} EGP` : '',
      eirForm.eirNotes,
    ]
      .filter(Boolean)
      .join(' | ');

    setActionBusyId(selectedOrderForEir.id);
    try {
      const updated: any = await api.patch(`/dispatch/trips/${selectedOrderForEir.id}/status`, {
        status: 'empty_returned',
        notes: composedNotes,
      });
      setTrips((prev) => prev.map((t) => (t.id === selectedOrderForEir.id ? updated : t)));
      setIsEirModalOpen(false);
      setSelectedOrderForEir(null);
    } catch (err: any) {
      alert(err?.message || 'تعذر توثيق إرجاع الحاوية الفارغة');
    } finally {
      setActionBusyId(null);
    }
  };

  // Autofill driver fields when a master driver is selected
  const handleSelectDriver = (driverId: string) => {
    setSelectedDriverId(driverId);
    const d = availableDrivers.find((x: any) => x.id === driverId);
    if (d) {
      setNewOrder((prev) => ({
        ...prev,
        driverName: d.name || prev.driverName,
        driverPhone: d.phone || prev.driverPhone,
        driverNationalId: d.nationalId || prev.driverNationalId,
        truckHeadPlate: d.truckPlate || prev.truckHeadPlate,
        trailerPlate: d.trailerPlate || prev.trailerPlate,
        truckingVendor: d.vendor?.name || (d.vendorId ? truckingVendors.find((v: any) => v.id === d.vendorId)?.name : '') || prev.truckingVendor,
      }));
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      // Persist the fields that have no dedicated columns (national ID, trailer plate, vendor) into notes
      const extraNotes = [
        newOrder.truckingVendor ? `شركة النقل: ${newOrder.truckingVendor}` : '',
        newOrder.driverNationalId ? `الرقم القومي للسائق: ${newOrder.driverNationalId}` : '',
        newOrder.trailerPlate ? `لوحة المقطورة: ${newOrder.trailerPlate}` : '',
        newOrder.emptyReturnYard ? `ساحة الفارغ: ${newOrder.emptyReturnYard}` : '',
        newOrder.notes,
      ]
        .filter(Boolean)
        .join(' | ');

      const created: any = await api.post('/dispatch/trips', {
        clientName: newOrder.clientName,
        containerNumber: newOrder.containerNumber.toUpperCase(),
        containerType: newOrder.containerType,
        pickupLocation: newOrder.pickupLocation || undefined,
        deliveryLocation: newOrder.deliveryLocation || undefined,
        driverId: selectedDriverId || undefined,
        driverName: newOrder.driverName || undefined,
        driverPhone: newOrder.driverPhone || undefined,
        truckPlate: newOrder.truckHeadPlate || undefined,
        truckType: undefined,
        scheduledDate: newOrder.scheduledDate || undefined,
        notes: extraNotes || undefined,
      });

      setTrips((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setSelectedDriverId('');
      setNewOrder({
        containerNumber: '',
        containerType: '40HQ',
        clientName: '',
        pickupLocation: '',
        deliveryLocation: '',
        truckingVendor: '',
        driverName: '',
        driverPhone: '',
        driverNationalId: '',
        truckHeadPlate: '',
        trailerPlate: '',
        emptyReturnYard: '',
        scheduledDate: new Date().toISOString().slice(0, 10),
        notes: '',
      });
    } catch (err: any) {
      setCreateError(err?.message || 'تعذر إصدار أمر النقل — حاول مجدداً');
    } finally {
      setCreating(false);
    }
  };

  const handleExport = () => {
    exportToCsv(
      'redshipping_dispatch_trips',
      filteredTrips,
      [
        { header: 'أمر النقل', accessor: (t: DispatchTrip) => t.tripNumber },
        { header: 'ملف العملية', accessor: (t: DispatchTrip) => t.jobFileNumber || '—' },
        { header: 'رقم الحاوية', accessor: (t: DispatchTrip) => t.containerNumber },
        { header: 'النوع', accessor: (t: DispatchTrip) => t.containerType },
        { header: 'العميل', accessor: (t: DispatchTrip) => t.clientName },
        { header: 'ميناء السحب', accessor: (t: DispatchTrip) => t.pickupLocation },
        { header: 'وجهة التسليم', accessor: (t: DispatchTrip) => t.deliveryLocation },
        { header: 'السائق', accessor: (t: DispatchTrip) => t.driverName },
        { header: 'هاتف السائق', accessor: (t: DispatchTrip) => t.driverPhone },
        { header: 'لوحة الرأس', accessor: (t: DispatchTrip) => t.truckPlate },
        { header: 'تاريخ الجدولة', accessor: (t: DispatchTrip) => t.scheduledDate },
        { header: 'الحالة', accessor: (t: DispatchTrip) => STATUS_LABELS[apiToUi(t.status)] },
        { header: 'ملاحظات', accessor: (t: DispatchTrip) => t.notes || '—' },
      ],
    );
  };

  const handlePrint = (trip: DispatchTrip) => {
    setActiveOrderForPrint(trip);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">غرفة النقل البري والتوزيع (Inland Haulage)</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Truck className="w-3 h-3" />
              Dispatch Operations
            </span>
            {!loading && !loadError && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                أوامر محفوظة في قاعدة البيانات
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            إدارة أوامر سحب الحاويات من الموانئ المصرية، تعيين السائقين والشاحنات، ومتابعة إرجاع الحاويات الفارغة للساحات
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadTrips}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 dark:bg-[#181D2A] dark:hover:bg-[#1E2638] dark:text-slate-300 border border-slate-200 dark:border-[#1E2638] transition shadow-sm cursor-pointer"
            title="تحديث القائمة من الخادم"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExport}
            disabled={filteredTrips.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 dark:bg-[#181D2A] dark:hover:bg-[#1E2638] dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-[#1E2638] transition shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            تصدير إكسيل
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF5E1E] hover:bg-[#FF7034] text-white text-xs font-semibold shadow-lg shadow-orange-500/25 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            أمر نقل بري جديد
          </button>
        </div>
      </div>

      {/* ── Operational Banner ── */}
      <div className="relative rounded-3xl overflow-hidden bg-white/90 dark:bg-[#121620]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm transition-all duration-300">
        <div className="absolute top-0 end-0 w-80 h-80 bg-gradient-to-bl from-emerald-500/10 via-orange-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-start max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <Truck className="w-3.5 h-3.5" />
              <span>إدارة أسطول النقل وسيارات الفحص الميداني</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-snug">
              غرفة العمليات وتوجيه الشاحنات من الموانئ إلى المصانع
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              إصدار تصاريح الخروج (Gate-Out)، ربط السائقين بأرقام الحاويات، والتأكد من إرجاع الحاويات الفارغة للساحات المعتمدة لتجنب غرامات التأخير (Demurrage).
            </p>
          </div>

          <div className="flex flex-col gap-2 bg-slate-50 dark:bg-[#181D2A] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 min-w-[220px] text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800 pb-1">جاهزية الأسطول الميداني</span>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500 dark:text-slate-400">أوامر مجدولة:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">{stats.total}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500 dark:text-slate-400">على الطريق الآن:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{stats.gateOut}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500 dark:text-slate-400">فارغ مسترد (EIR):</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{stats.emptyReturned}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">إجمالي أوامر النقل</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#FF5E1E]">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">أمر نقل</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">في الطريق (Gate-Out)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.gateOut}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">خرجت من الميناء</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">تم التسليم بمصنع العميل</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.delivered}</span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400">مسلّمة</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">تم إرجاع الفارغ (EIR)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.emptyReturned}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">بدون غرامات تأخير</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] p-4 rounded-2xl shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث برقم أمر النقل، الحاوية، السائق، رقم اللوحات، أو العميل..."
              className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 ps-9 pe-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E] transition"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]"
            >
              <option value="ALL">جميع حالات النقل (All Statuses)</option>
              <option value="ASSIGNED">تم تعيين السائق والشاحنة</option>
              <option value="GATE_OUT">خرجت من بوابة الميناء (في الطريق)</option>
              <option value="DELIVERED_TO_FACTORY">تم التسليم بمصنع العميل</option>
              <option value="EMPTY_RETURNED">تم إرجاع الحاوية الفارغة للساحة</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dispatch Orders Table */}
      <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin" />
            <span className="text-xs font-bold">جارٍ تحميل أوامر النقل من الخادم...</span>
          </div>
        ) : loadError ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <div>
              <h3 className="text-sm font-black text-red-600 dark:text-red-400 mb-1">تعذر تحميل البيانات</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{loadError}</p>
              <button onClick={loadTrips} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer">
                إعادة المحاولة
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-[#0E121A] border-b border-slate-200 dark:border-[#1E2638] text-slate-500 dark:text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4 text-start">أمر النقل</th>
                  <th className="py-3 px-4 text-start">الحاوية / الشحنة</th>
                  <th className="py-3 px-4 text-start">العميل ومكان التسليم</th>
                  <th className="py-3 px-4 text-start">السائق وبيانات السيارة</th>
                  <th className="py-3 px-4 text-start">ميناء السحب / الجدولة</th>
                  <th className="py-3 px-4 text-center">حالة النقل</th>
                  <th className="py-3 px-4 text-center">إجراءات المتابعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Truck className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#FF5E1E]" />
                      <p className="font-semibold text-slate-700 dark:text-slate-200">لا توجد أوامر نقل محفوظة بعد</p>
                      <p className="text-xs text-slate-400 mt-1">اضغط «أمر نقل بري جديد» لإصدار أول أمر سحب حاوية — سيُحفظ في قاعدة البيانات</p>
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map((t) => {
                    const ui = apiToUi(t.status);
                    const busy = actionBusyId === t.id;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-[#181D2A] transition">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          <span>{t.tripNumber}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-normal">{t.scheduledDate || '—'}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[#FF5E1E] block">{t.containerNumber || '—'}</span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 block">{t.containerType}</span>
                          {t.jobFileNumber && <span className="text-[10px] text-slate-400 dark:text-slate-500 block">ملف: {t.jobFileNumber}</span>}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 dark:text-white block">{t.clientName}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                            {t.deliveryLocation || '—'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                            <User className="w-3.5 h-3.5 text-[#FF5E1E]" />
                            <span>{t.driverName || '—'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-emerald-500" />
                            <a href={`tel:${t.driverPhone}`} className="hover:underline font-mono">
                              {t.driverPhone || '—'}
                            </a>
                          </div>
                          <div className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#0E121A] px-2 py-0.5 rounded border border-slate-200 dark:border-[#1E2638] mt-1 inline-block">
                            رأس: <strong className="text-slate-900 dark:text-white">{t.truckPlate || '—'}</strong>
                            {t.truckType ? <span> • {t.truckType}</span> : null}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          <div className="text-xs font-medium text-slate-800 dark:text-slate-200">من: {t.pickupLocation || '—'}</div>
                          {t.departureTime && <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">خروج: {t.departureTime}</div>}
                          {t.actualArrival && <div className="text-[10px] text-emerald-600 dark:text-emerald-400">وصول: {t.actualArrival}</div>}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              ui === 'EMPTY_RETURNED'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                : ui === 'DELIVERED_TO_FACTORY'
                                ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20'
                                : ui === 'GATE_OUT'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                                : ui === 'CANCELLED'
                                ? 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                : 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20'
                            }`}
                          >
                            {ui === 'EMPTY_RETURNED' && <CheckCircle2 className="w-3 h-3 me-1" />}
                            {STATUS_LABELS[ui]}
                          </span>
                          {t.notes && (
                            <span className="text-[9px] text-slate-400 block mt-1 max-w-[180px] mx-auto truncate" title={t.notes}>
                              {t.notes}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {ui === 'ASSIGNED' && (
                              <button
                                onClick={() => handleUpdateStatus(t.id, 'GATE_OUT')}
                                disabled={busy}
                                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                              >
                                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                                خروج من الميناء
                              </button>
                            )}
                            {ui === 'GATE_OUT' && (
                              <button
                                onClick={() => handleUpdateStatus(t.id, 'DELIVERED_TO_FACTORY')}
                                disabled={busy}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                              >
                                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Building2 className="w-3 h-3" />}
                                تأكيد وصول المصنع
                              </button>
                            )}
                            {ui === 'DELIVERED_TO_FACTORY' && (
                              <button
                                onClick={() => handleOpenEirModal(t)}
                                disabled={busy}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                              >
                                <RotateCcw className="w-3 h-3" />
                                إرجاع الفارغ (EIR Clean)
                              </button>
                            )}
                            <button
                              onClick={() => handlePrint(t)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#181D2A] hover:bg-slate-200 dark:hover:bg-[#1E2638] text-slate-600 dark:text-slate-300 transition cursor-pointer"
                              title="طباعة إذن نقل بري EIR"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Dispatch Order Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="إنشاء أمر نقل بري وسحب حاوية"
          subtitle="تعيين شركة النقل، السائق، والشاحنة لسحب الحاوية من الميناء — يُحفظ الأمر في قاعدة البيانات"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">رقم الحاوية *</label>
                <input
                  type="text"
                  required
                  value={newOrder.containerNumber}
                  onChange={(e) => setNewOrder({ ...newOrder, containerNumber: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">نوع الحاوية</label>
                <select
                  value={newOrder.containerType}
                  onChange={(e) => setNewOrder({ ...newOrder, containerType: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                >
                  <option value="40HQ">40HQ High Cube</option>
                  <option value="20GP">20GP General Purpose</option>
                  <option value="40RF">40RF Reefer مبردة</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم العميل ومصنع التسليم *</label>
                <input
                  type="text"
                  required
                  value={newOrder.clientName}
                  onChange={(e) => setNewOrder({ ...newOrder, clientName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ الجدولة</label>
                <input
                  type="date"
                  value={newOrder.scheduledDate}
                  onChange={(e) => setNewOrder({ ...newOrder, scheduledDate: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ميناء سحب الحاوية</label>
                <input
                  type="text"
                  placeholder="مثال: ميناء الإسكندرية"
                  value={newOrder.pickupLocation}
                  onChange={(e) => setNewOrder({ ...newOrder, pickupLocation: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">عنوان المصنع / مخزن التسليم</label>
                <input
                  type="text"
                  value={newOrder.deliveryLocation}
                  onChange={(e) => setNewOrder({ ...newOrder, deliveryLocation: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">شركة النقل البري</label>
                {truckingVendors.length > 0 ? (
                  <select
                    value={newOrder.truckingVendor}
                    onChange={(e) => setNewOrder({ ...newOrder, truckingVendor: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">-- اختر شركة النقل --</option>
                    {truckingVendors.map((v: any) => (
                      <option key={v.id} value={v.name}>{v.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newOrder.truckingVendor}
                    onChange={(e) => setNewOrder({ ...newOrder, truckingVendor: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">السائق (من السجل الرئيسي)</label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => handleSelectDriver(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                >
                  <option value="">-- إدخال يدوي / اختر سائق --</option>
                  {availableDrivers.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name}{d.truckPlate ? ` — ${d.truckPlate}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم السائق *</label>
                <input
                  type="text"
                  required
                  value={newOrder.driverName}
                  onChange={(e) => setNewOrder({ ...newOrder, driverName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">هاتف السائق *</label>
                <input
                  type="text"
                  required
                  value={newOrder.driverPhone}
                  onChange={(e) => setNewOrder({ ...newOrder, driverPhone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الرقم القومي للسائق</label>
                <input
                  type="text"
                  value={newOrder.driverNationalId}
                  onChange={(e) => setNewOrder({ ...newOrder, driverNationalId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">رقم لوحات رأس السيارة *</label>
                <input
                  type="text"
                  required
                  value={newOrder.truckHeadPlate}
                  onChange={(e) => setNewOrder({ ...newOrder, truckHeadPlate: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">رقم لوحات المقطورة</label>
                <input
                  type="text"
                  value={newOrder.trailerPlate}
                  onChange={(e) => setNewOrder({ ...newOrder, trailerPlate: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ساحة إرجاع الحاوية الفارغة</label>
                <input
                  type="text"
                  value={newOrder.emptyReturnYard}
                  onChange={(e) => setNewOrder({ ...newOrder, emptyReturnYard: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-400">
              الحقول غير المخصصة بأعمدة في قاعدة البيانات (الرقم القومي، المقطورة، شركة النقل، ساحة الفارغ) تُحفظ ضمن ملاحظات الأمر.
            </p>

            {createError && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#1E2638]">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#181D2A] dark:hover:bg-[#1E2638] dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2 rounded-xl bg-[#FF5E1E] hover:bg-[#FF7034] disabled:opacity-60 text-white text-xs font-semibold shadow-lg shadow-orange-500/25 transition flex items-center gap-2 cursor-pointer"
              >
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {creating ? 'جارٍ الإصدار...' : 'إصدار أمر النقل وتثبيت السائق'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* EIR Clean Return Modal */}
      {isEirModalOpen && selectedOrderForEir && (
        <Modal
          isOpen={isEirModalOpen}
          onClose={() => setIsEirModalOpen(false)}
          title="توثيق إرجاع الحاوية الفارغة وإيصال الساحة (EIR Return)"
          subtitle="تسجيل استلام الساحة للحاوية وفحصها الفني وإيقاف احتساب غرامات التأخير (Demurrage Stop)"
          maxWidth="lg"
        >
          <form onSubmit={handleConfirmEirReturn} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                  رقم الحاوية: {selectedOrderForEir.containerNumber} ({selectedOrderForEir.containerType})
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 block mt-0.5">
                  أمر النقل: {selectedOrderForEir.tripNumber} • ملف: {selectedOrderForEir.jobFileNumber || '—'}
                </span>
              </div>
              <div className="text-end">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                  إيقاف عداد الغرامة فور الاعتماد
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم إيصال استلام الساحة (EIR Receipt No.) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: EIR-MSC-2026-9812"
                  value={eirForm.eirNumber}
                  onChange={(e) => setEirForm({ ...eirForm, eirNumber: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ وتوقيت تسليم الفارغ للساحة *
                </label>
                <input
                  type="text"
                  required
                  value={eirForm.emptyReturnDate}
                  onChange={(e) => setEirForm({ ...eirForm, emptyReturnDate: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ساحة / مستودع استلام الفارغ *
                </label>
                <input
                  type="text"
                  required
                  value={eirForm.emptyReturnYard}
                  onChange={(e) => setEirForm({ ...eirForm, emptyReturnYard: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم مهندس / معاين الساحة المستلمة
                </label>
                <input
                  type="text"
                  value={eirForm.eirSurveyorName}
                  onChange={(e) => setEirForm({ ...eirForm, eirSurveyorName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Condition Toggle: EIR Clean vs Damaged */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                نتيجة الفحص الفني للحاوية (Container Inspection Condition) *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEirForm({ ...eirForm, eirStatus: 'CLEAN', eirDamagesFeeEgp: 0 })}
                  className={`p-3 rounded-xl border text-start transition flex items-center gap-2.5 ${
                    eirForm.eirStatus === 'CLEAN'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 font-bold'
                      : 'border-slate-200 dark:border-[#1E2638] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 ${eirForm.eirStatus === 'CLEAN' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-xs block">EIR Clean (سليمة 100%)</span>
                    <span className="text-[10px] opacity-75 block font-normal">خالية من التلفيات والصدمات - استرداد التأمين فوراً</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEirForm({ ...eirForm, eirStatus: 'DAMAGED' })}
                  className={`p-3 rounded-xl border text-start transition flex items-center gap-2.5 ${
                    eirForm.eirStatus === 'DAMAGED'
                      ? 'border-rose-500 bg-rose-500/10 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20 font-bold'
                      : 'border-slate-200 dark:border-[#1E2638] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <AlertTriangle className={`w-4 h-4 ${eirForm.eirStatus === 'DAMAGED' ? 'text-rose-500' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-xs block">تلفيات بالحاوية (EMR Damage)</span>
                    <span className="text-[10px] opacity-75 block font-normal">شروخ أرضية / صدمات بالقوائم - تعليق التأمين للإصلاح</span>
                  </div>
                </button>
              </div>
            </div>

            {eirForm.eirStatus === 'DAMAGED' && (
              <div>
                <label className="block text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">
                  تقدير تكلفة إصلاح التلفيات (EGP)
                </label>
                <input
                  type="number"
                  placeholder="مثال: 3500"
                  value={eirForm.eirDamagesFeeEgp || ''}
                  onChange={(e) => setEirForm({ ...eirForm, eirDamagesFeeEgp: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-rose-300 dark:border-rose-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ملاحظات الفحص والمعاينة *
              </label>
              <textarea
                rows={2}
                value={eirForm.eirNotes}
                onChange={(e) => setEirForm({ ...eirForm, eirNotes: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#1E2638]">
              <button
                type="button"
                onClick={() => setIsEirModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#181D2A] dark:hover:bg-[#1E2638] dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={actionBusyId === selectedOrderForEir.id}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition cursor-pointer flex items-center gap-1.5"
              >
                {actionBusyId === selectedOrderForEir.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                تأكيد إرجاع الفارغ وإيقاف غرامة التأخير
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Printable Dispatch Waybill (EIR) */}
      {activeOrderForPrint && (
        <div className="hidden print:block fixed inset-0 bg-white text-black p-8 font-sans">
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">RED SHIPPING International Logistics S.A.E</h1>
              <p className="text-xs">إذن صرف وتكليف نقل بري لحاوية وارد (EIR Dispatch Waybill)</p>
            </div>
            <div className="text-end">
              <p className="font-mono font-bold text-lg">{activeOrderForPrint.tripNumber}</p>
              <p className="text-xs">التاريخ: {activeOrderForPrint.scheduledDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mb-6 border p-4">
            <div><strong>رقم ملف العملية:</strong> {activeOrderForPrint.jobFileNumber || '—'}</div>
            <div><strong>رقم الحاوية:</strong> {activeOrderForPrint.containerNumber} ({activeOrderForPrint.containerType})</div>
            <div><strong>العميل المستورد:</strong> {activeOrderForPrint.clientName}</div>
            <div><strong>ميناء الخروج:</strong> {activeOrderForPrint.pickupLocation || '—'}</div>
            <div><strong>وجهة التسليم (المصنع):</strong> {activeOrderForPrint.deliveryLocation || '—'}</div>
            <div><strong>ساحة تسليم الفارغ:</strong> حسب ملاحظات الأمر</div>
          </div>

          <div className="border p-4 text-xs mb-6">
            <h3 className="font-bold mb-2">بيانات السائق والشاحنة المعتمدة:</h3>
            <div className="grid grid-cols-2 gap-2">
              <div><strong>اسم السائق:</strong> {activeOrderForPrint.driverName}</div>
              <div><strong>هاتف السائق:</strong> {activeOrderForPrint.driverPhone}</div>
              <div><strong>لوحات رأس السيارة:</strong> {activeOrderForPrint.truckPlate}</div>
              <div><strong>نوع الشاحنة:</strong> {activeOrderForPrint.truckType || '—'}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8 text-center text-xs pt-12 border-t mt-12">
            <div>
              <p className="font-bold mb-8">مسؤول الحركة والنقل</p>
              <p>............................</p>
            </div>
            <div>
              <p className="font-bold mb-8">توقيع السائق بالاستلام</p>
              <p>............................</p>
            </div>
            <div>
              <p className="font-bold mb-8">أمن بوابة الميناء / المصنع</p>
              <p>............................</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
