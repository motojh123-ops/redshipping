import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Ship,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  ShieldCheck,
  Receipt,
  Calendar,
  MapPin,
  Anchor,
  User,
  FolderOpen,
  FileCheck,
  UploadCloud,
  Eye,
  Download,
  FileText,
  Trash2,
  PenTool,
  Printer,
  QrCode,
  FolderArchive,
  Check,
  RotateCcw,
  ExternalLink,
  Scale,
  FileBadge,
} from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';
import { ShipmentStage } from '@banna/shared-types';
import SignatureCanvas from 'react-signature-canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { validateContainerIso6346, getCarrierTrackingUrl, calculateDemurrageDetention, calculatePortTerminalStorage } from '../../utils/maritime';
import { useAuthStore } from '../../store/authStore';

export const ShipmentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'containers' | 'financials' | 'customs' | 'events' | 'documents'>('containers');

  // Modals state
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [nextStage, setNextStage] = useState<string>('in_transit');
  const [stageNotes, setStageNotes] = useState('');

  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [costDescription, setCostDescription] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [costCurrency, setCostCurrency] = useState('USD');

  const [isContainerModalOpen, setIsContainerModalOpen] = useState(false);
  const [containerNumber, setContainerNumber] = useState('');
  const [containerType, setContainerType] = useState('40HQ');
  const [sealNumber, setSealNumber] = useState('');

  // Proof of Delivery (POD) & E-Signature state
  const [isPodModalOpen, setIsPodModalOpen] = useState(false);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [signedPodDataUrl, setSignedPodDataUrl] = useState<string | null>(null);
  const sigCanvasRef = useRef<any>(null);

  // Delivery Order (D/O) modal state
  const [isDoModalOpen, setIsDoModalOpen] = useState(false);
  const [doNumber, setDoNumber] = useState('');
  const [doExpiryDate, setDoExpiryDate] = useState('');

  // Documents Dossier state
  const [documents, setDocuments] = useState<any[]>([]);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('BL');
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const handleDownloadDocumentsZip = async () => {
    try {
      const zip = new JSZip();
      const folder = zip.folder(`Job_${shipment?.jobFileNumber || 'RED-2026'}_Dossier`);
      folder?.file('README_MANIFEST.txt', `RED SHIPPING CARGO DOSSIER\nJob: ${shipment?.jobFileNumber}\nB/L: ${shipment?.blNumber}\nClient: ${shipment?.client?.name}\nVessel: ${shipment?.vesselName}`);

      documents.forEach((doc, i) => {
        folder?.file(`${i + 1}_${doc.category}_${doc.name.replace(/[/\\?%*:|"<>]/g, '_')}.txt`, `Document Content for: ${doc.name}\nCategory: ${doc.categoryLabel}`);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `Shipment_${shipment?.jobFileNumber || 'RED'}_Dossier.zip`);
      toast.success('تم تحميل حزمة المستندات بالكامل بصيغة ZIP بنجاح');
    } catch {
      toast.error('فشل تجميع ملفات الشحنة');
    }
  };

  const handleSaveSignature = () => {
    if (sigCanvasRef.current?.isEmpty()) {
      toast.error('برجاء التوقيع أولاً في المربع المحدد');
      return;
    }
    const dataUrl = sigCanvasRef.current?.toDataURL();
    setSignedPodDataUrl(dataUrl);
    setIsPodModalOpen(false);
    toast.success('تم اعتماد وتوثيق توقيع إذن التسليم (POD) بنجاح');
  };

  const fetchShipment = async () => {
    try {
      setLoading(true);
      const data: any = await api.get(`/shipments/${id}`);
      setShipment(data || null);
      if (data?.currentStage) {
        setNextStage(getNextStageDefault(data.currentStage));
      }
    } catch (err) {
      console.error('Failed to load shipment details from database', err);
      setShipment(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchShipment();
  }, [id]);

  const getNextStageDefault = (current: string) => {
    const sequence = [
      'booking_confirmed',
      'cargo_received',
      'customs_submitted',
      'acid_issued',
      'in_transit',
      'arrived_destination',
      'clearance_in_progress',
      'release_issued',
      'out_for_delivery',
      'delivered',
      'closed',
    ];
    const idx = sequence.indexOf(current);
    return idx >= 0 && idx < sequence.length - 1 ? sequence[idx + 1] : current;
  };

  const handleUpdateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch(`/shipments/${id}/stage`, {
        stage: nextStage,
        notes: stageNotes,
      });
      setIsStageModalOpen(false);
      setStageNotes('');
      fetchShipment();
    } catch (err: any) {
      alert(err?.message || 'فشل في تحديث مرحلة الشحنة');
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/shipments/${id}/costs`, {
        description: costDescription,
        currency: costCurrency,
        estimatedCost: Number(costAmount),
        actualCost: Number(costAmount),
        isReconciled: true,
      });
      setIsCostModalOpen(false);
      setCostDescription('');
      setCostAmount('');
      fetchShipment();
    } catch (err: any) {
      alert(err?.message || 'فشل في إضافة المصروف التشغيلي');
    }
  };

  const handleAddContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/shipments/${id}/containers`, {
        containerNumber: containerNumber.toUpperCase(),
        containerType,
        sealNumber,
        status: 'booked',
      });
      setIsContainerModalOpen(false);
      setContainerNumber('');
      setSealNumber('');
      fetchShipment();
    } catch (err: any) {
      alert(err?.message || 'فشل في إضافة الحاوية');
    }
  };

  const handleUpdateDeliveryOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const isExpired = doExpiryDate ? new Date(doExpiryDate) < new Date() : false;
    setShipment({
      ...shipment,
      deliveryOrderNumber: doNumber.trim() || undefined,
      deliveryOrderExpiryDate: doExpiryDate ? new Date(doExpiryDate).toISOString() : undefined,
      deliveryOrderStatus: isExpired ? 'EXPIRED' : 'VALID',
    });
    setIsDoModalOpen(false);
    toast.success('تم تحديث بيانات إذن التسليم الملاحي وصلاحيته بنجاح');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="text-slate-400 text-sm font-medium animate-pulse">جاري تحميل بيانات الشحنة...</span>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">ملف الشحنة غير موجود</h2>
        <Link to="/shipments" className="mt-3 inline-block text-sm text-brand-600 font-semibold">
          ← العودة إلى قائمة الشحنات
        </Link>
      </div>
    );
  }

  const stagesList = [
    { key: 'booking_confirmed', label: 'تأكيد الحجز' },
    { key: 'cargo_received', label: 'استلام البضاعة' },
    { key: 'acid_issued', label: 'صدور نافذة ACID' },
    { key: 'in_transit', label: 'في البحر (In Transit)' },
    { key: 'arrived_destination', label: 'وصول الميناء' },
    { key: 'clearance_in_progress', label: 'التخليص الجمركي' },
    { key: 'delivered', label: 'تم التسليم' },
  ];

  const currentStageIdx = stagesList.findIndex((s) => s.key === shipment.currentStage);

  // ─── Live Maritime Calculations (D&D, VGM, Currency) ───
  const containersWithDD = useMemo(() => {
    if (!shipment?.containers) return [];
    return shipment.containers.map((c: any) => {
      if (!c.dischargedAt) {
        return {
          ...c,
          dd: null,
          remainingDays: null,
          statusCategory: 'pending_discharge',
        };
      }
      const dd = calculateDemurrageDetention({
        containerNumber: c.containerNumber || '',
        containerType: c.containerType || '40HQ',
        shippingLine: shipment?.shippingLine?.name || '',
        dischargedAt: c.dischargedAt,
        gatedOutAt: c.emptyReturnedAt,
        agreedFreeDays: shipment?.freeDaysAllowed || 14,
        egpExchangeRate: 51.50,
      });
      const remainingDays = dd.freeDays - dd.totalDaysInPort;
      let statusCategory: 'safe' | 'warning' | 'overdue' = 'safe';
      if (dd.isOverdue) statusCategory = 'overdue';
      else if (remainingDays <= 2) statusCategory = 'warning';

      return {
        ...c,
        dd,
        remainingDays,
        statusCategory,
      };
    });
  }, [shipment]);

  const totalDemurrageUsd = useMemo(() => {
    return containersWithDD.reduce((sum: number, c: any) => sum + (c.dd?.totalDemurrageUsd || 0), 0);
  }, [containersWithDD]);

  const totalDemurrageEgp = useMemo(() => {
    return containersWithDD.reduce((sum: number, c: any) => sum + (c.dd?.totalDemurrageEgp || 0), 0);
  }, [containersWithDD]);

  const overdueCount = useMemo(() => {
    return containersWithDD.filter((c: any) => c.statusCategory === 'overdue').length;
  }, [containersWithDD]);

  const warningCount = useMemo(() => {
    return containersWithDD.filter((c: any) => c.statusCategory === 'warning').length;
  }, [containersWithDD]);

  // ─── Port Terminal Yard Storage (أرضيات محطة الحاويات بهيئة الميناء) ───
  const terminalStorageSummary = useMemo(() => {
    if (!shipment?.containers) return { totalStorageEgp: 0, overdueContainers: 0 };
    let totalEgp = 0;
    let overdueCount = 0;
    shipment.containers.forEach((c: any) => {
      if (c.dischargedAt) {
        const res = calculatePortTerminalStorage({
          containerNumber: c.containerNumber,
          containerType: c.containerType || '40HQ',
          terminalName: shipment?.destinationPort?.nameEn ? `رصيف ${shipment.destinationPort.nameEn}` : undefined,
          dischargedAt: c.dischargedAt,
          gatedOutAt: c.emptyReturnedAt,
        });
        totalEgp += res.totalStorageEgp;
        if (res.isOverdue) overdueCount++;
      }
    });
    return { totalStorageEgp: totalEgp, overdueContainers: overdueCount };
  }, [shipment]);

  const isDoExpired = useMemo(() => {
    if (!shipment?.deliveryOrderExpiryDate) return false;
    return new Date(shipment.deliveryOrderExpiryDate) < new Date();
  }, [shipment]);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/shipments')}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {shipment.jobFileNumber}
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300">
                {shipment.currentStage}
              </span>
              {/* Delivery Order Interactive Badge */}
              <button
                onClick={() => {
                  setDoNumber(shipment.deliveryOrderNumber || '');
                  setDoExpiryDate(shipment.deliveryOrderExpiryDate ? shipment.deliveryOrderExpiryDate.split('T')[0] : '');
                  setIsDoModalOpen(true);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${
                  isDoExpired
                    ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800 animate-pulse'
                    : shipment.deliveryOrderNumber
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
                title="انقر لتعديل وإدارة إذن التسليم الملاحي وصلاحيته"
              >
                <FileBadge className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {shipment.deliveryOrderNumber
                    ? `إذن تسليم (D/O): ${shipment.deliveryOrderNumber} ${isDoExpired ? '(منتهي الصلاحية ⚠️)' : '(ساري ✓)'}`
                    : 'تسجيل إذن تسليم ملاحي (D/O)'}
                </span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              العميل: <span className="font-semibold text-slate-800 dark:text-slate-200">{shipment.client?.name || '—'}</span> | بوليصة B/L: <span className="font-mono text-slate-800 dark:text-slate-200">{shipment.blNumber || '—'}</span> | الخط: <span className="font-semibold text-slate-800 dark:text-slate-200">{shipment.shippingLine?.name || '—'}</span>
              {shipment.overseasAgent ? (
                <span> | وكيل الخارج: <span className="font-semibold text-slate-800 dark:text-slate-200">{shipment.overseasAgent.name}{shipment.overseasAgent.city ? ` (${shipment.overseasAgent.city})` : ''}</span></span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsPodModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition cursor-pointer"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>{signedPodDataUrl ? 'توقيع POD معتمد ✓' : 'توقيع إذن التسليم (POD)'}</span>
          </button>
          <button
            onClick={handleDownloadDocumentsZip}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <FolderArchive className="w-3.5 h-3.5 text-[#FF5E1E]" />
            <span>تحميل المستندات (ZIP)</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </button>
          <button
            onClick={() => setIsStageModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>تحديث مرحلة التشغيل</span>
          </button>
        </div>
      </div>

      {/* D/O Expiry Critical Alert */}
      {isDoExpired && (
        <div className="p-4 rounded-2xl bg-rose-600 text-white flex items-center justify-between gap-4 shadow-lg shadow-rose-600/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-white shrink-0 animate-bounce" />
            <div className="text-sm">
              <span className="font-extrabold block">
                🚨 تنبيه تشغيلي حرج: إذن التسليم الملاحي (D/O #{shipment.deliveryOrderNumber}) منتهي الصلاحية بتاريخ {new Date(shipment.deliveryOrderExpiryDate).toLocaleDateString()}!
              </span>
              <span className="text-xs text-rose-100 block mt-0.5">
                توقف استلام الحاويات من ساحة الميناء. يجب التنسيق الفوري مع التوكيل الملاحي لسداد غرامات التأخير وتجديد إذن التسليم.
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setDoNumber(shipment.deliveryOrderNumber || '');
              setDoExpiryDate(shipment.deliveryOrderExpiryDate ? shipment.deliveryOrderExpiryDate.split('T')[0] : '');
              setIsDoModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold transition shrink-0 cursor-pointer shadow"
          >
            تجديد إذن التسليم الآن
          </button>
        </div>
      )}

      {/* Dynamic Demurrage & Terminal Storage Banner (الفصل الدقيق بين غرامات الخط وأرضيات الميناء) */}
      {overdueCount > 0 ? (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <div className="text-sm">
              <span className="font-bold text-rose-900 dark:text-rose-200">
                🚨 غرامات تأخير وأرضيات مستحقة: {overdueCount} حاوية تجاوزت فترة السماح الممنوحة ({shipment.freeDaysAllowed || 14} يوم)!
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-rose-200 dark:border-rose-900/60 text-xs">
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-rose-200/80 dark:border-rose-800">
              <span className="text-slate-500 block">1. عوائد تأخير الحاوية للتوكيل الملاحي (Carrier Demurrage):</span>
              <span className="font-mono font-black text-rose-600 text-sm mt-0.5 block">
                ${totalDemurrageUsd.toLocaleString()} USD (~{totalDemurrageEgp.toLocaleString()} ج.م)
              </span>
              <span className="text-[10px] text-slate-400 block">مستحقة لـ {shipment.shippingLine?.name || 'التوكيل الملاحي'}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-rose-200/80 dark:border-rose-800">
              <span className="text-slate-500 block">2. غرامات أرضيات ساحة ورصيف الميناء (Terminal Storage):</span>
              <span className="font-mono font-black text-amber-600 text-sm mt-0.5 block">
                {terminalStorageSummary.totalStorageEgp.toLocaleString()} EGP
              </span>
              <span className="text-[10px] text-slate-400 block">مستحقة لمحطة الحاويات بهيئة الميناء بعد 8 أيام سماح</span>
            </div>
          </div>
        </div>
      ) : warningCount > 0 ? (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-sm">
              <span className="font-bold text-amber-900 dark:text-amber-200">
                ⚠️ تنبيه اقتراب انتهاء السماح: {warningCount} حاوية متبقي لها أقل من 48 ساعة قبل بدء فرض غرامات التأخير!
              </span>
              <span className="text-xs text-amber-800 dark:text-amber-300 block mt-0.5">
                فترة السماح الممنوحة: <span className="font-mono font-bold">{shipment.freeDaysAllowed || 14} يوم</span>. يُرجى سرعة الإفراج الجمركي ورد الحاويات فارغة لمستودع الخط الملاحي لتفادي غرامات الـ Demurrage والأرضيات.
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-sm">
              <span className="font-bold text-emerald-900 dark:text-emerald-200">
                فترة السماح الممنوحة: {shipment.freeDaysAllowed || 14} يوم — سارية وآمنة لجميع الحاويات.
              </span>
              <span className="text-xs text-emerald-800 dark:text-emerald-300 block mt-0.5">
                لا توجد أي غرامات تأخير بالدولار أو أرضيات بالجنيه مستحقة حتى اليوم. الخط الملاحي: {shipment.shippingLine?.name || 'MSC'}.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stage Stepper Progress */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[650px] relative">
          {stagesList.map((st, idx) => {
            const isCompleted = idx <= currentStageIdx;
            const isCurrent = idx === currentStageIdx;

            return (
              <div key={st.key} className="flex flex-col items-center relative z-10">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCurrent
                      ? 'bg-brand-600 text-white ring-4 ring-brand-500/20 shadow-lg'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span
                  className={`text-[11px] mt-2 font-medium ${
                    isCurrent
                      ? 'font-bold text-brand-600 dark:text-brand-400'
                      : isCompleted
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400'
                  }`}
                >
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('containers')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'containers'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          الحاويات والتتبع ({shipment.containers?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('financials')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'financials'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          الماليات والأرباح (P&L)
        </button>
        <button
          onClick={() => setActiveTab('customs')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'customs'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          التخليص ونافذة (ACID)
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'events'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          سجل العمليات ({shipment.events?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'documents'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          المستندات والأرشيف الإلكتروني ({documents.length})
        </button>
      </div>

      {/* Tab 1: Containers */}
      {activeTab === 'containers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">الحاويات المسجلة على الشحنة</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                متابعة أوزان VGM المعتمدة، تواريخ التفريغ، وعداد فترات السماح وغرامات الأرضيات والتأخير (D&D).
              </p>
            </div>
            <button
              onClick={() => setIsContainerModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة حاوية</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-medium uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 text-start">رقم الحاوية</th>
                  <th className="py-3 px-4 text-start">النوع / الحجم</th>
                  <th className="py-3 px-4 text-start">الرصاص (Seal)</th>
                  <th className="py-3 px-4 text-start">وزن VGM المعتمد</th>
                  <th className="py-3 px-4 text-start">حالة الحاوية</th>
                  <th className="py-3 px-4 text-start">تاريخ التفريغ</th>
                  <th className="py-3 px-4 text-start">عداد فترة السماح (D&D)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {containersWithDD.length > 0 ? (
                  containersWithDD.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-brand-600 block">{c.containerNumber || '—'}</span>
                        {c.containerNumber && (
                          <a
                            href={getCarrierTrackingUrl(shipment?.shippingLine?.name || '', c.containerNumber)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-[#FF5E1E] hover:underline font-bold mt-0.5"
                            title="استعلام مباشر لدى الخط الملاحي"
                          >
                            <span>تتبع الخط المباشر</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">{c.containerType || '—'}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-xs">{c.sealNumber || '—'}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {c.vgmWeightKg
                              ? `${c.vgmWeightKg.toLocaleString()} كجم`
                              : (c.cargoWeightKg || c.tareWeightKg)
                                ? `${((c.cargoWeightKg || 0) + (c.tareWeightKg || 0)).toLocaleString()} كجم`
                                : '—'}
                          </span>
                        </div>
                        {c.vgmWeightKg && (
                          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                            VGM SOLAS معتمد ✓
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {c.dischargedAt ? new Date(c.dischargedAt).toLocaleDateString() : 'لم تفرغ بعد'}
                      </td>
                      <td className="py-3.5 px-4">
                        {c.statusCategory === 'overdue' ? (
                          <div className="space-y-1">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 inline-flex items-center gap-1 animate-pulse">
                              🚨 متجاوز {Math.abs(c.remainingDays)} يوم
                            </span>
                            <span className="text-[11px] font-mono font-bold text-rose-600 block">
                              غرامة: ${c.dd?.totalDemurrageUsd} (~{c.dd?.totalDemurrageEgp.toLocaleString()} ج.م)
                            </span>
                          </div>
                        ) : c.statusCategory === 'warning' ? (
                          <div className="space-y-1">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 inline-flex items-center gap-1">
                              ⚠️ متبقي {c.remainingDays} يوم فقط!
                            </span>
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 block">
                              اقتراب بدء احتساب الغرامات
                            </span>
                          </div>
                        ) : c.statusCategory === 'safe' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 inline-flex items-center gap-1">
                            🟢 متبقي {c.remainingDays} يوم سماح
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            في انتظار وصول السفينة
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                      لا توجد حاويات مسجلة حالياً
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Financials (P&L) */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          {/* Dual Currency Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-start">
              <span className="text-xs text-slate-400 block">إجمالي المفوتر للعميل (Revenue)</span>
              <div className="mt-1">
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white block">
                  ${(shipment.financialSummary?.invoicedUsd ?? 0).toLocaleString()} USD
                </span>
                <span className="text-xs font-mono text-slate-500">
                  + {(shipment.financialSummary?.invoicedEgp ?? 0).toLocaleString()} EGP
                </span>
              </div>
              <span className="text-[10px] text-brand-600 dark:text-brand-400 block mt-1">
                إجمالي موحد: ~${(shipment.financialSummary?.consolidatedRevUsd ?? 0).toLocaleString()} USD
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-start">
              <span className="text-xs text-slate-400 block">التكاليف والمصروفات الفعلية (Costs)</span>
              <div className="mt-1">
                <span className="text-lg font-bold font-mono text-rose-600 block">
                  ${(shipment.financialSummary?.actualCostUsd ?? 0).toLocaleString()} USD
                </span>
                <span className="text-xs font-mono text-slate-500">
                  + {(shipment.financialSummary?.actualCostEgp ?? 0).toLocaleString()} EGP
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                نولون التوكيل + مصاريف تخليص ونقل
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-start">
              <span className="text-xs text-slate-400 block">صافي أرباح العملية (Net Profit)</span>
              <div className="mt-1">
                <span className={`text-lg font-black font-mono block ${(shipment.financialSummary?.netProfitUsd ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {(shipment.financialSummary?.netProfitUsd ?? 0) >= 0 ? '+' : ''}${(shipment.financialSummary?.netProfitUsd ?? 0).toLocaleString()} USD
                </span>
                <span className={`text-xs font-mono font-bold ${(shipment.financialSummary?.netProfitEgp ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ~{(shipment.financialSummary?.netProfitEgp ?? 0) >= 0 ? '+' : ''}{(shipment.financialSummary?.netProfitEgp ?? 0).toLocaleString()} EGP
                </span>
              </div>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                {(shipment.financialSummary?.netProfitUsd ?? 0) >= 0 ? 'شحنة رابحة ✓' : 'تكلفة تتجاوز الإيراد'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-start">
              <span className="text-xs text-slate-400 block">هامش الربحية الصافي (Margin)</span>
              <span className="text-2xl font-black font-mono text-brand-600 mt-1 block">
                {shipment.financialSummary?.profitMarginPercent ?? 0}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                بسعر صرف البنك المركزي (51.50 ج.م)
              </span>
            </div>
          </div>

          {/* Costs Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">المصروفات التشغيلية والتكاليف المسجلة</h3>
              <button
                onClick={() => setIsCostModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مصروف تشغيلي</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-sm text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-medium uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 text-start">بيان المصروف</th>
                    <th className="py-3 px-4 text-start">المورد / الجهة</th>
                    <th className="py-3 px-4 text-start">القيمة الفعلية</th>
                    <th className="py-3 px-4 text-start">العملة</th>
                    <th className="py-3 px-4 text-start">التسوية (Reconciled)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {shipment.costs && shipment.costs.length > 0 ? (
                    shipment.costs.map((cost: any) => (
                      <tr key={cost.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{cost.description}</td>
                        <td className="py-3 px-4 text-slate-500">{cost.vendor?.name || 'الخط الملاحي'}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          ${Number(cost.actualCost).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{cost.currency}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                            مُسوى
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                        لا توجد مصروفات مسجلة بعد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Customs & ACID */}
      {activeTab === 'customs' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs text-slate-400 block font-bold uppercase">رقم القيد المسبق للشحنة (ACID)</span>
              <span className="text-xl font-extrabold text-brand-600 font-mono">
                {shipment.customsDossier?.acidNumber || '— غير مسجل —'}
              </span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
              {shipment.customsDossier?.status || 'لم يبدأ'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">رقم الشهادة الجمركية 46</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white mt-1 block">
                {shipment.customsDossier?.customsCertificateNumber || '—'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">الرسوم الجمركية المسددة</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white mt-1 block">
                {shipment.customsDossier?.dutiesPaid ? `EGP ${Number(shipment.customsDossier.dutiesPaid).toLocaleString()}` : '—'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">ضريبة القيمة المضافة (14%)</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white mt-1 block">
                {shipment.customsDossier?.vatPaid ? `EGP ${Number(shipment.customsDossier.vatPaid).toLocaleString()}` : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Events Timeline */}
      {activeTab === 'events' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="space-y-6 relative before:absolute before:top-2 before:bottom-2 before:start-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {shipment.events && shipment.events.length > 0 ? (
              shipment.events.map((ev: any) => (
                <div key={ev.id} className="relative flex items-start gap-4 ps-8">
                  <div className="absolute start-1.5 top-1.5 w-4 h-4 rounded-full bg-brand-600 ring-4 ring-white dark:ring-slate-900" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        انتقال إلى: {ev.toStage}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(ev.eventAt).toLocaleString()}
                      </span>
                    </div>
                    {ev.notes && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{ev.notes}</p>}
                    <span className="text-[11px] text-slate-400 block mt-1">
                      بواسطة: {ev.changedBy?.name || 'مسؤول العمليات'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">لا يوجد سجل أحداث مسجل</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Digital Documents & Archive */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-[#121620] rounded-2xl border border-slate-200 dark:border-[#1E2638] shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-brand-500" />
                الأرشيف والمستندات الرقمية للشحنة
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                حفظ وأرشفة بوالص الشحن، الفواتير التجارية، استمارات 46 نافذة، وشهادات المنشأ مع تدقيق الامتثال الجمركي
              </p>
            </div>
            <button
              onClick={() => {
                setNewDocName('');
                setIsDocModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FF5E1E] hover:bg-[#E04D10] text-white text-xs font-semibold shadow-md shadow-orange-500/20 transition cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              رفع مستند جديد للأرشيف
            </button>
          </div>

          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-4 transition flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20">
                        {doc.categoryLabel}
                      </span>
                      {doc.isVerified && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          مطابق ومعتمد
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-2.5 mt-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={doc.name}>
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          <span>{doc.fileSize}</span>
                          <span>•</span>
                          <span>{doc.uploadedAt}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-[10px] text-slate-500">بواسطة: {doc.uploadedBy}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                        title="معاينة المستند"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => alert(`جاري تحميل ملف ${doc.name}`)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                        title="تحميل"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDocuments(documents.filter((d) => d.id !== doc.id))}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد مستندات مرفوعة بعد</h4>
              <p className="text-xs text-slate-400 mt-1">يمكنك رفع البوالص الملاحية، الفواتير التجارية، وشهادات المنشأ للأرشيف الرقمي</p>
            </div>
          )}
        </div>
      )}

      {/* Upload Document Modal */}
      {isDocModalOpen && (
        <Modal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
          title="رفع مستند جديد للشحنة"
          subtitle="أرشفة المستندات الرسمية لملف الشحنة وتوثيقها"
          maxWidth="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const categoryMap: any = {
                BL: 'بوليصة شحن بحري (B/L)',
                INVOICE: 'فاتورة تجارية معتمدة',
                PACKING_LIST: 'بيان العبوة والأوزان',
                FORM_46: 'استمارة 46 إفراج جمركي',
                CERT_ORIGIN: 'شهادة المنشأ الرسمية',
                DELIVERY_ORDER: 'إذن تسليم ملاحي',
              };
              const createdDoc = {
                id: `doc-${Date.now()}`,
                name: newDocName || 'Scan_Document.pdf',
                category: newDocCategory as any,
                categoryLabel: categoryMap[newDocCategory] || 'مستند رسمي',
                fileSize: '1.2 MB',
                uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
                uploadedBy: user?.name || 'مستخدم النظام',
                isVerified: true,
              };
              setDocuments([createdDoc, ...documents]);
              setIsDocModalOpen(false);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                نوع المستند *
              </label>
              <select
                value={newDocCategory}
                onChange={(e) => setNewDocCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="BL">بوليصة الشحن البحري (Bill of Lading - B/L)</option>
                <option value="INVOICE">الفاتورة التجارية المعتمدة (Commercial Invoice)</option>
                <option value="PACKING_LIST">بيان العبوة ومحتويات الحاوية (Packing List)</option>
                <option value="FORM_46">إشعار نافذة واستمارة 46 إفراج (Form 46 Release)</option>
                <option value="CERT_ORIGIN">شهادة المنشأ الرسمية (Certificate of Origin / EUR.1)</option>
                <option value="DELIVERY_ORDER">إذن تسليم التوكيل الملاحي (Delivery Order)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                اسم الملف أو الوصف *
              </label>
              <input
                type="text"
                required
                placeholder="مثال: Final_Bill_of_Lading_Stamped.pdf"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center bg-slate-50 dark:bg-slate-950/40">
              <UploadCloud className="w-8 h-8 text-brand-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800 dark:text-white">اسحب الملف هنا أو انقر للتصفح</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">يدعم PDF, Excel, JPG, PNG حتى 25 ميجابايت</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/25"
              >
                تأكيد الرفع والأرشفة
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Preview Document Modal */}
      {previewDoc && (
        <Modal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={`معاينة المستند: ${previewDoc.name}`}
          subtitle={`التصنيف: ${previewDoc.categoryLabel} • الحجم: ${previewDoc.fileSize}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center relative overflow-hidden min-h-[260px] flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mb-3">
                <FileCheck className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">{previewDoc.name}</h4>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                تم التحقق من صحة المستند ومطابقته لمنظومة الجمارك المصرية NAFEZA والخط الملاحي
              </p>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>مستند رسمي معتمد وموثق رقمياً</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>تاريخ الرفع: {previewDoc.uploadedAt}</span>
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Advance Stage Modal */}
      <Modal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        title="تحديث مرحلة تشغيل الشحنة"
        subtitle="تسجيل التغير في دورة حياة الشحنة مع إضافة الملاحظات وتحديث سجل العمليات"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateStage} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              المرحلة الجديدة *
            </label>
            <select
              value={nextStage}
              onChange={(e) => setNextStage(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500"
            >
              <option value="booking_confirmed">تأكيد الحجز (Booking Confirmed)</option>
              <option value="cargo_received">استلام البضاعة (Cargo Received)</option>
              <option value="customs_submitted">تقديم مستندات نافذة (Customs Submitted)</option>
              <option value="acid_issued">صدور رقم ACID</option>
              <option value="in_transit">في البحر (In Transit)</option>
              <option value="arrived_destination">وصول ميناء المقصد (Arrived POD)</option>
              <option value="clearance_in_progress">قيد التخليص الجمركي (Customs Clearance)</option>
              <option value="release_issued">صدور إذن الإفراج (Release Issued)</option>
              <option value="out_for_delivery">خرج للتسليم (Out for Delivery)</option>
              <option value="delivered">تم التسليم للمستورد (Delivered)</option>
              <option value="closed">إغلاق الملف التشغيلي (Closed)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ملاحظات التشغيل (اختياري)
            </label>
            <textarea
              rows={3}
              placeholder="مثال: تم شحن الحاويات على متن السفينة، أو تم سداد الرسوم الجمركية في انتظار الكشف..."
              value={stageNotes}
              onChange={(e) => setStageNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsStageModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md transition"
            >
              تأكيد التحديث
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Cost Modal */}
      <Modal
        isOpen={isCostModalOpen}
        onClose={() => setIsCostModalOpen(false)}
        title="إضافة مصروف تشغيلي على الشحنة"
        subtitle="تسجيل تكاليف النولون، تفريغ الميناء، النقل الداخلي، أو أتعاب الكشف"
        maxWidth="md"
      >
        <form onSubmit={handleAddCost} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              بيان المصروف *
            </label>
            <input
              type="text"
              placeholder="مثال: مصاريف تفريغ ميناء دمياط، نقل بري 6 أكتوبر..."
              value={costDescription}
              onChange={(e) => setCostDescription(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                القيمة *
              </label>
              <input
                type="number"
                placeholder="250"
                value={costAmount}
                onChange={(e) => setCostAmount(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm font-mono focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                العملة
              </label>
              <select
                value={costCurrency}
                onChange={(e) => setCostCurrency(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EGP">EGP (ج.م)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCostModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold shadow-md transition"
            >
              حفظ المصروف
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Container Modal */}
      <Modal
        isOpen={isContainerModalOpen}
        onClose={() => setIsContainerModalOpen(false)}
        title="إضافة حاوية إلى الشحنة"
        subtitle="تسجيل رقم الحاوية والمقاس ورقم السيل الجمركي"
        maxWidth="md"
      >
        <form onSubmit={handleAddContainer} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              رقم الحاوية (ISO 6346) *
            </label>
            <input
              type="text"
              placeholder="مثال: MSCU8192018"
              value={containerNumber}
              onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
              required
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm font-mono uppercase focus:ring-2 focus:ring-brand-500"
            />
            {containerNumber.trim() && (() => {
              const check = validateContainerIso6346(containerNumber);
              return (
                <div className={`mt-1.5 p-2 rounded-lg text-[11px] flex items-center gap-2 ${
                  check.isValid
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {check.isValid
                      ? `رقم سليم ومطابق لمعايير ISO 6346 (المالك: ${check.ownerCode})`
                      : check.errorMessage || 'الرقم غير مطابق للمعايير الدولية'}
                  </span>
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                نوع الحاوية
              </label>
              <select
                value={containerType}
                onChange={(e) => setContainerType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500"
              >
                <option value="40HQ">40' High Cube</option>
                <option value="20GP">20' General Purpose</option>
                <option value="40GP">40' General Purpose</option>
                <option value="40RF">40' Reefer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                رقم الرصاص (Seal #)
              </label>
              <input
                type="text"
                placeholder="SL-1892"
                value={sealNumber}
                onChange={(e) => setSealNumber(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-sm font-mono focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsContainerModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold shadow-md transition"
            >
              حفظ الحاوية
            </button>
          </div>
        </form>
      </Modal>

      {/* Proof of Delivery (POD) Digital Signature Modal */}
      <Modal
        isOpen={isPodModalOpen}
        onClose={() => setIsPodModalOpen(false)}
        title="توقيع إذن استلام وتسليم البضاعة (POD)"
        subtitle="توقيع السائق والعميل الرقمي المعتمد لإثبات تسليم الحاوية"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المستلم أو السائق:</label>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="أحمد محمد الشريف"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف / الرقم القومي:</label>
              <input
                type="text"
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
                placeholder="+20 100 871 2291"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                التوقيع بالقلم أو الإصبع في المربع أدناه:
              </label>
              <button
                type="button"
                onClick={() => sigCanvasRef.current?.clear()}
                className="text-[11px] text-slate-500 hover:text-red-500 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                مسح التوقيع
              </button>
            </div>
            <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden shadow-inner">
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor="#0F172A"
                canvasProps={{ className: 'w-full h-40 cursor-crosshair' }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              يتم حفظ التوقيع الرقمي مشفراً ومربوطاً بملف الشحنة {shipment.jobFileNumber} وتاريخ التسليم.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsPodModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveSignature}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>اعتماد وتثبيت التوقيع (POD)</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Delivery Order (D/O) Update & Validity Modal */}
      <Modal
        isOpen={isDoModalOpen}
        onClose={() => setIsDoModalOpen(false)}
        title="إدارة وتوثيق إذن التسليم الملاحي (Delivery Order - D/O)"
        subtitle="توثيق رقم إذن التسليم الصادر من التوكيل الملاحي وتاريخ صلاحيته لتفادي غرامات التجديد"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateDeliveryOrder} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              رقم إذن التسليم الملاحي (D/O Number) *
            </label>
            <input
              type="text"
              required
              value={doNumber}
              onChange={(e) => setDoNumber(e.target.value)}
              placeholder="مثال: DO-MAE-2026-0891 أو DO-MSC-99210"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 font-mono text-sm font-bold focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              تاريخ انتهاء صلاحية إذن التسليم (Expiry Date) *
            </label>
            <input
              type="date"
              required
              value={doExpiryDate}
              onChange={(e) => setDoExpiryDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 font-mono text-sm focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              ملاحظة ملاحية: ينتهي إذن التسليم عادة بعد 7 إلى 14 يوماً من تاريخ صدوره. انقضاء هذا التاريخ يمنع استلام البضاعة من ساحة الميناء ويفرض رسوم تجديد إذن تسليم وغرامات تأخير للتوكيل الملاحي.
            </span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 space-y-1 text-[11px]">
            <span className="font-bold block">التوكيل الملاحي المصدر:</span>
            <span>{shipment?.shippingLine?.name || 'التوكيل الملاحي الناقل'} — ميناء الوصول: {shipment?.destinationPort?.nameEn || 'Alexandria Port'}</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsDoModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-md shadow-brand-600/20 transition cursor-pointer"
            >
              حفظ وتثبيت إذن التسليم
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
