import React, { useState, useMemo, useEffect } from 'react';
import {
  Truck,
  Search,
  Plus,
  FileSpreadsheet,
  Printer,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Building2,
  ShieldCheck,
  ArrowRight,
  Filter,
  User,
  Phone,
  Box,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { exportToCsv } from '../../utils/exportUtils';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../services/api';

interface DispatchOrder {
  id: string;
  orderNumber: string;
  jobFileNumber: string;
  blNumber: string;
  containerNumber: string;
  containerType: string;
  sealNumber: string;
  clientName: string;
  factoryDestination: string;
  departurePort: string;
  truckingVendor: string;
  driverName: string;
  driverPhone: string;
  driverNationalId: string;
  truckHeadPlate: string;
  trailerPlate: string;
  dispatchDate: string;
  deliveryDate?: string;
  emptyReturnDate?: string;
  emptyReturnYard: string;
  status: 'ASSIGNED' | 'GATE_OUT' | 'DELIVERED_TO_FACTORY' | 'EMPTY_RETURNED';
  eirNumber?: string;
  eirStatus?: 'CLEAN' | 'DAMAGED';
  eirNotes?: string;
  eirSurveyorName?: string;
  eirDamagesFeeEgp?: number;
  notes?: string;
}

const INITIAL_DISPATCH_ORDERS: DispatchOrder[] = [
  {
    id: 'dsp-1',
    orderNumber: 'TRK-2026-0041',
    jobFileNumber: 'RED-2026-0001',
    blNumber: 'MSCU8812903',
    containerNumber: 'MEDU1029384',
    containerType: '40HQ',
    sealNumber: 'SL-88412',
    clientName: 'Al-Ahram Food Industries (الأهرام للصناعات الغذائية)',
    factoryDestination: 'المنطقة الصناعية الثالثة، مدينة 6 أكتوبر، الجيزة',
    departurePort: 'Alexandria Port (ميناء الإسكندرية)',
    truckingVendor: 'شركة الإسكندرية لخدمات النقل البري والتريلات',
    driverName: 'رمضان عبد العال السيد',
    driverPhone: '+20 100 882 1199',
    driverNationalId: '28409121800192',
    truckHeadPlate: 'س ق ج ٨٩١٢',
    trailerPlate: 'م ق ر ٤٤١٩',
    dispatchDate: '2026-09-18 07:00',
    deliveryDate: '2026-09-18 13:30',
    emptyReturnYard: 'المستودع المصري لتخزين الحاويات - العامرية',
    status: 'DELIVERED_TO_FACTORY',
    notes: 'تم فحص الرصاص الجمركي وسلامة الحاوية قبل الخروج من باب 27',
  },
  {
    id: 'dsp-2',
    orderNumber: 'TRK-2026-0042',
    jobFileNumber: 'RED-2026-0001',
    blNumber: 'MSCU8812903',
    containerNumber: 'MEDU1029385',
    containerType: '40HQ',
    sealNumber: 'SL-88413',
    clientName: 'Al-Ahram Food Industries (الأهرام للصناعات الغذائية)',
    factoryDestination: 'المنطقة الصناعية الثالثة، مدينة 6 أكتوبر، الجيزة',
    departurePort: 'Alexandria Port (ميناء الإسكندرية)',
    truckingVendor: 'شركة الإسكندرية لخدمات النقل البري والتريلات',
    driverName: 'عصام محمد فتح الله',
    driverPhone: '+20 111 445 6677',
    driverNationalId: '29008151203341',
    truckHeadPlate: 'ط د ر ٣١٩٠',
    trailerPlate: 'س ف ج ٧٧١١',
    dispatchDate: '2026-09-18 08:30',
    emptyReturnYard: 'المستودع المصري لتخزين الحاويات - العامرية',
    status: 'GATE_OUT',
    notes: 'خرجت من بوابة الميناء متجهة إلى طريق الإسكندرية الصحراوي',
  },
  {
    id: 'dsp-3',
    orderNumber: 'TRK-2026-0043',
    jobFileNumber: 'RED-2026-0002',
    blNumber: 'MAEU982183910',
    containerNumber: 'MSKU8849120',
    containerType: '40HQ',
    sealNumber: 'SL-99120',
    clientName: 'Delta Chemicals & Polymers (دلتا للكيماويات)',
    factoryDestination: 'المنطقة الحرة العامة بالعامرية، الإسكندرية',
    departurePort: 'Alexandria Port (ميناء الإسكندرية)',
    truckingVendor: 'شركة الإسكندرية لخدمات النقل البري والتريلات',
    driverName: 'محمود الصاوي',
    driverPhone: '+20 122 998 8776',
    driverNationalId: '28105041900281',
    truckHeadPlate: 'ي ب د ٥٥١٢',
    trailerPlate: 'ق س م ١٢٠٩',
    dispatchDate: '2026-09-16 10:00',
    deliveryDate: '2026-09-16 14:00',
    emptyReturnDate: '2026-09-17 11:00',
    emptyReturnYard: 'ساحة ميرسك اللوجستية (Maersk Yard Dekheila)',
    status: 'EMPTY_RETURNED',
    eirNumber: 'EIR-MAE-2026-0819',
    eirStatus: 'CLEAN',
    eirSurveyorName: 'ك. حسام الديب (معاين الساحة المعتمد)',
    eirNotes: 'فحص الحاوية سليم 100%، خالية من الصدمات والروائح، أرضية خشبية سليمة (Clean & Sound).',
    notes: 'تم إرجاع الفارغ بنجاح والحصول على إيصال استلام الساحة EIR Clean',
  },
];

export const DispatchBoardPage: React.FC = () => {
  const [orders, setOrders] = useState<DispatchOrder[]>(INITIAL_DISPATCH_ORDERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeOrderForPrint, setActiveOrderForPrint] = useState<DispatchOrder | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    api.get('/shipments')
      .then((res: any) => {
        if (res) {
          const list = Array.isArray(res) ? res : (Array.isArray(res.items) ? res.items : []);
          setIsLiveConnected(true);
          if (list.length > 0) {
            const mappedOrders: DispatchOrder[] = list
              .filter((s: any) => s.containers && s.containers.length > 0)
              .flatMap((s: any, sIdx: number) =>
                s.containers.map((c: any, cIdx: number) => ({
                  id: `dsp-live-${s.id}-${cIdx}`,
                  orderNumber: `TRK-2026-${String(sIdx * 10 + cIdx + 41).padStart(4, '0')}`,
                  jobFileNumber: s.jobFileNumber || `RED-2026-${String(sIdx + 1).padStart(4, '0')}`,
                  blNumber: s.blNumber || s.masterBlNumber || 'MSCU-LIVE',
                  containerNumber: c.containerNumber || `CONT-${cIdx}`,
                  containerType: c.type || '40HQ',
                  sealNumber: c.sealNumber || 'SL-88412',
                  clientName: typeof s.client === 'object' ? (s.client?.nameAr || s.client?.name || 'عميل معتمد') : (s.clientName || 'عميل معتمد'),
                  factoryDestination: s.deliveryAddress || 'المنطقة الصناعية الثالثة، مدينة 6 أكتوبر',
                  departurePort: s.dischargePort || 'Alexandria Port (ميناء الإسكندرية)',
                  truckingVendor: 'شركة النقل المعتمدة للأسطول',
                  driverName: 'سائق معتمد',
                  driverPhone: '+20 100 882 1199',
                  driverNationalId: '28409121800192',
                  truckHeadPlate: 'س ق ج ٨٩١٢',
                  trailerPlate: 'م ق ر ٤٤١٩',
                  dispatchDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
                  emptyReturnYard: 'المستودع المصري لتخزين الحاويات - العامرية',
                  status: (c.status === 'DELIVERED' ? 'DELIVERED_TO_FACTORY' : 'GATE_OUT') as DispatchOrder['status'],
                  notes: 'أمر نقل مرتبط بشحنة حية من الباك اند المركزي',
                }))
              );
            if (mappedOrders.length > 0) {
              setOrders([...mappedOrders, ...INITIAL_DISPATCH_ORDERS]);
            }
          }
        }
      })
      .catch(() => setIsLiveConnected(false));
  }, []);

  // EIR Clean Return Modal State
  const [isEirModalOpen, setIsEirModalOpen] = useState(false);
  const [selectedOrderForEir, setSelectedOrderForEir] = useState<DispatchOrder | null>(null);
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
    jobFileNumber: 'RED-2026-0001',
    blNumber: 'MSCU8812903',
    containerNumber: 'MEDU9921041',
    containerType: '40HQ',
    sealNumber: 'SL-55102',
    clientName: 'Al-Ahram Food Industries (الأهرام للصناعات الغذائية)',
    factoryDestination: 'المنطقة الصناعية الثالثة، مدينة 6 أكتوبر',
    departurePort: 'Alexandria Port (ميناء الإسكندرية)',
    truckingVendor: 'شركة الإسكندرية لخدمات النقل البري والتريلات',
    driverName: 'حسن الجوهري',
    driverPhone: '+20 101 223 3445',
    driverNationalId: '28607141800293',
    truckHeadPlate: 'س ف ج ٩٩١٢',
    trailerPlate: 'م ن ط ٣٣٢١',
    emptyReturnYard: 'المستودع المصري لتخزين الحاويات - العامرية',
    notes: '',
  });

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const matchesSearch =
        o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.jobFileNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.driverPhone.includes(searchTerm) ||
        o.truckHeadPlate.includes(searchTerm) ||
        o.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchTerm]);

  // KPIs
  const stats = useMemo(() => {
    const total = orders.length;
    const gateOut = orders.filter((o) => o.status === 'GATE_OUT').length;
    const delivered = orders.filter((o) => o.status === 'DELIVERED_TO_FACTORY').length;
    const emptyReturned = orders.filter((o) => o.status === 'EMPTY_RETURNED').length;
    return { total, gateOut, delivered, emptyReturned };
  }, [orders]);

  const handleUpdateStatus = (
    orderId: string,
    newStatus: 'ASSIGNED' | 'GATE_OUT' | 'DELIVERED_TO_FACTORY' | 'EMPTY_RETURNED',
  ) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
        return {
          ...o,
          status: newStatus,
          deliveryDate: newStatus === 'DELIVERED_TO_FACTORY' ? now : o.deliveryDate,
          emptyReturnDate: newStatus === 'EMPTY_RETURNED' ? now : o.emptyReturnDate,
        };
      }),
    );
  };

  const handleOpenEirModal = (order: DispatchOrder) => {
    setSelectedOrderForEir(order);
    const linePrefix = order.containerNumber.slice(0, 4);
    setEirForm({
      eirNumber: `EIR-${linePrefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      emptyReturnDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      emptyReturnYard: order.emptyReturnYard || 'المستودع المصري لتخزين الحاويات - العامرية',
      eirStatus: 'CLEAN',
      eirSurveyorName: 'ك. حسام الديب (معاين الساحة)',
      eirDamagesFeeEgp: 0,
      eirNotes: 'تم فحص الحاوية بالكامل: الأرضية الخشبية سليمة، القوائم والزوايا خالية من الانبعاج، خالية من الروائح (Clean & Sound).',
    });
    setIsEirModalOpen(true);
  };

  const handleConfirmEirReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForEir) return;

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== selectedOrderForEir.id) return o;
        return {
          ...o,
          status: 'EMPTY_RETURNED',
          emptyReturnDate: eirForm.emptyReturnDate,
          emptyReturnYard: eirForm.emptyReturnYard,
          eirNumber: eirForm.eirNumber,
          eirStatus: eirForm.eirStatus,
          eirSurveyorName: eirForm.eirSurveyorName,
          eirDamagesFeeEgp: eirForm.eirStatus === 'DAMAGED' ? Number(eirForm.eirDamagesFeeEgp) : 0,
          eirNotes: eirForm.eirNotes,
          notes: `تم تسليم الفارغ واستلام إيصال EIR Clean رقم ${eirForm.eirNumber} وإيقاف عداد غرامات التأخير.`,
        };
      }),
    );

    setIsEirModalOpen(false);
    setSelectedOrderForEir(null);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const created: DispatchOrder = {
      id: `dsp-${Date.now()}`,
      orderNumber: `TRK-2026-${String(orders.length + 41).padStart(4, '0')}`,
      ...newOrder,
      dispatchDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'ASSIGNED',
    };
    setOrders([created, ...orders]);
    setIsAddModalOpen(false);
  };

  const handleExport = () => {
    exportToCsv(
      'redshipping_inland_trucking_dispatch_orders',
      filteredOrders,
      [
        { header: 'أمر النقل', accessor: (o) => o.orderNumber },
        { header: 'ملف العملية', accessor: (o) => o.jobFileNumber },
        { header: 'رقم الحاوية', accessor: (o) => o.containerNumber },
        { header: 'النوع', accessor: (o) => o.containerType },
        { header: 'العميل', accessor: (o) => o.clientName },
        { header: 'وجهة المصنع', accessor: (o) => o.factoryDestination },
        { header: 'السائق', accessor: (o) => o.driverName },
        { header: 'هاتف السائق', accessor: (o) => o.driverPhone },
        { header: 'رقم السيارة (رأس)', accessor: (o) => o.truckHeadPlate },
        { header: 'المقطورة', accessor: (o) => o.trailerPlate },
        { header: 'تاريخ الخروج', accessor: (o) => o.dispatchDate },
        {
          header: 'حالة النقل',
          accessor: (o) =>
            o.status === 'EMPTY_RETURNED'
              ? 'تم إرجاع الفارغ'
              : o.status === 'DELIVERED_TO_FACTORY'
              ? 'تم التسليم بالمصنع'
              : o.status === 'GATE_OUT'
              ? 'في الطريق'
              : 'تم التعيين',
        },
      ],
    );
  };

  const handlePrint = (order: DispatchOrder) => {
    setActiveOrderForPrint(order);
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
            {isLiveConnected && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync: /shipments
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            إدارة أوامر سحب الحاويات من الموانئ المصرية، تعيين السائقين والشاحنات، ومتابعة إرجاع الحاويات الفارغة للساحات
          </p>
        </div>

        <div className="flex items-center gap-3">
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
            أمر نقل بري جديد
          </button>
        </div>
      </div>

      {/* ── Operational Dispatch & Fleet Coordination Banner ── */}
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
              <span className="text-slate-500 dark:text-slate-400">شاحنات مخصصة:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">{stats.total} شاحنة</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500 dark:text-slate-400">على الطريق الآن:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{stats.gateOut} شاحنة</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500 dark:text-slate-400">فارغ مسترد (EIR):</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{stats.emptyReturned} حاوية</span>
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
            <span className="text-xs text-slate-500 dark:text-slate-400">حاوية برية</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">شاحنات في الطريق (Gate-Out)</span>
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
            <span className="text-xs text-indigo-600 dark:text-indigo-400">قيد التعتيق والتفريغ</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">تم إرجاع الفارغ (EIR Clean)</span>
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
          {/* Search bar */}
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

          {/* Status Filter */}
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
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-[#0E121A] border-b border-slate-200 dark:border-[#1E2638] text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">أمر النقل</th>
                <th className="py-3 px-4 text-start">الحاوية / الشحنة</th>
                <th className="py-3 px-4 text-start">العميل ومكان التسليم</th>
                <th className="py-3 px-4 text-start">السائق وبيانات السيارة</th>
                <th className="py-3 px-4 text-start">ميناء الخروج / ساحة الفارغ</th>
                <th className="py-3 px-4 text-center">حالة النقل</th>
                <th className="py-3 px-4 text-center">إجراءات المتابعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/70 dark:hover:bg-[#181D2A] transition">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    <span>{o.orderNumber}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-normal">{o.dispatchDate}</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-[#FF5E1E] block">{o.containerNumber}</span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 block">
                      {o.containerType} • Seal: {o.sealNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">ملف: {o.jobFileNumber}</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 dark:text-white block">{o.clientName}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                      {o.factoryDestination}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                      <User className="w-3.5 h-3.5 text-[#FF5E1E]" />
                      <span>{o.driverName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-emerald-500" />
                      <a href={`tel:${o.driverPhone}`} className="hover:underline font-mono">
                        {o.driverPhone}
                      </a>
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#0E121A] px-2 py-0.5 rounded border border-slate-200 dark:border-[#1E2638] mt-1 inline-block">
                      رأس: <strong className="text-slate-900 dark:text-white">{o.truckHeadPlate}</strong> • مقطورة: <strong className="text-slate-900 dark:text-white">{o.trailerPlate}</strong>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200">من: {o.departurePort}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">ساحة الفارغ: {o.emptyReturnYard}</div>
                  </td>

                  <td className="py-3 px-4 text-center">
                    {o.status === 'EMPTY_RETURNED' ? (
                      <div className="flex flex-col items-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            o.eirStatus === 'DAMAGED'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {o.eirStatus === 'DAMAGED' ? 'فارغ بملاحظات تلف ⚠️' : 'تم إرجاع الفارغ (EIR Clean) ✓'}
                        </span>
                        {o.eirNumber && (
                          <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                            {o.eirNumber}
                          </span>
                        )}
                        <span className="text-[9px] text-slate-400 font-mono">
                          {o.emptyReturnDate}
                        </span>
                      </div>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          o.status === 'DELIVERED_TO_FACTORY'
                            ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20'
                            : o.status === 'GATE_OUT'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {o.status === 'DELIVERED_TO_FACTORY'
                          ? 'تم التسليم بالمصنع 🏭'
                          : o.status === 'GATE_OUT'
                          ? 'في الطريق 🚛'
                          : 'تم التعيين 📋'}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {o.status === 'ASSIGNED' && (
                        <button
                          onClick={() => handleUpdateStatus(o.id, 'GATE_OUT')}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition cursor-pointer"
                        >
                          تسجيل خروج من الميناء
                        </button>
                      )}
                      {o.status === 'GATE_OUT' && (
                        <button
                          onClick={() => handleUpdateStatus(o.id, 'DELIVERED_TO_FACTORY')}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition cursor-pointer"
                        >
                          تأكيد وصول المصنع
                        </button>
                      )}
                      {o.status === 'DELIVERED_TO_FACTORY' && (
                        <button
                          onClick={() => handleOpenEirModal(o)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <RotateCcw className="w-3 h-3" />
                          إرجاع الفارغ (EIR Clean)
                        </button>
                      )}
                      <button
                        onClick={() => handlePrint(o)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#181D2A] hover:bg-slate-200 dark:hover:bg-[#1E2638] text-slate-600 dark:text-slate-300 transition cursor-pointer"
                        title="طباعة إذن نقل بري EIR"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Dispatch Order Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="إنشاء أمر نقل بري وسحب حاوية"
          subtitle="تعيين شركة النقل، السائق، والشاحنة لسحب الحاوية من الميناء"
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">عنوان المصنع / مخزن التسليم *</label>
                <input
                  type="text"
                  required
                  value={newOrder.factoryDestination}
                  onChange={(e) => setNewOrder({ ...newOrder, factoryDestination: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">شركة النقل البري</label>
                <select
                  value={newOrder.truckingVendor}
                  onChange={(e) => setNewOrder({ ...newOrder, truckingVendor: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                >
                  <option value="شركة الإسكندرية لخدمات النقل البري والتريلات">شركة الإسكندرية لخدمات النقل البري</option>
                  <option value="شركة النيل لنقل الحاويات الثقيلة">شركة النيل لنقل الحاويات الثقيلة</option>
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">رقم لوحات المقطورة *</label>
                <input
                  type="text"
                  required
                  value={newOrder.trailerPlate}
                  onChange={(e) => setNewOrder({ ...newOrder, trailerPlate: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
                />
              </div>
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
                إصدار أمر النقل وتثبيت السائق
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
                  بوليصة: {selectedOrderForEir.blNumber} • ملف: {selectedOrderForEir.jobFileNumber}
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
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
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
              <p className="font-mono font-bold text-lg">{activeOrderForPrint.orderNumber}</p>
              <p className="text-xs">التاريخ: {activeOrderForPrint.dispatchDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mb-6 border p-4">
            <div><strong>رقم ملف العملية:</strong> {activeOrderForPrint.jobFileNumber}</div>
            <div><strong>رقم بوليصة الشحن B/L:</strong> {activeOrderForPrint.blNumber}</div>
            <div><strong>رقم الحاوية:</strong> {activeOrderForPrint.containerNumber} ({activeOrderForPrint.containerType})</div>
            <div><strong>رقم الرصاص الجمركي:</strong> {activeOrderForPrint.sealNumber}</div>
            <div><strong>العميل المستورد:</strong> {activeOrderForPrint.clientName}</div>
            <div><strong>ميناء الخروج:</strong> {activeOrderForPrint.departurePort}</div>
            <div><strong>وجهة التسليم (المصنع):</strong> {activeOrderForPrint.factoryDestination}</div>
            <div><strong>ساحة تسليم الفارغ:</strong> {activeOrderForPrint.emptyReturnYard}</div>
          </div>

          <div className="border p-4 text-xs mb-6">
            <h3 className="font-bold mb-2">بيانات السائق والشاحنة المعتمدة:</h3>
            <div className="grid grid-cols-2 gap-2">
              <div><strong>اسم السائق:</strong> {activeOrderForPrint.driverName}</div>
              <div><strong>هاتف السائق:</strong> {activeOrderForPrint.driverPhone}</div>
              <div><strong>الرقم القومي:</strong> {activeOrderForPrint.driverNationalId}</div>
              <div><strong>لوحات رأس السيارة:</strong> {activeOrderForPrint.truckHeadPlate}</div>
              <div><strong>لوحات المقطورة:</strong> {activeOrderForPrint.trailerPlate}</div>
              <div><strong>شركة النقل:</strong> {activeOrderForPrint.truckingVendor}</div>
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
