import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShieldCheck, Clock, FileText, AlertTriangle, Check,
  ArrowRight, Calendar, Hash, Building2, Package, Truck,
  Upload, FolderArchive, Printer, Download, FileCheck2, Sparkles
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useApi } from '../../hooks/useApi';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import printJS from 'print-js';
import { toast } from 'sonner';

const DEMO_DOSSIER = {
  id: '1',
  dossierNumber: 'CUS-2026-0047',
  acidNumber: 'ACID-8834721093',
  acidIssuedAt: '2026-08-15',
  acidExpiresAt: '2026-11-13', // 90 days from issue
  currentStage: 'inspection',
  shipment: {
    jobFileNumber: 'RED-2026-0001',
    blNumber: 'MSCU8912839',
    client: 'Al-Ahram Food Industries',
  },
  commodity: 'مواد غذائية معلبة — HS Code: 2005.99',
  hsCode: '2005.99',
  destinationPort: 'Alexandria Port (EGALY)',
  customsOffice: 'جمرك الإسكندرية — الدخيلة',
  broker: 'الأمين للتخليص الجمركي',
  estimatedDuty: 45000,
  currency: 'EGP',
  cert46Number: '',
  inspectionDate: '2026-09-20',
  inspectionLocation: 'ساحة الكشف — الدخيلة',
  stages: [
    { key: 'document_review', label: 'مراجعة المستندات', completedAt: '2026-08-18', completedBy: 'أحمد الأمين' },
    { key: 'inspection', label: 'الكشف والتثمين والتحريز', completedAt: null, completedBy: null },
    { key: 'assessment', label: 'التقييم وحساب الرسوم', completedAt: null, completedBy: null },
    { key: 'duty_payment', label: 'سداد الرسوم الجمركية', completedAt: null, completedBy: null },
    { key: 'released_cert46', label: 'الإفراج — شهادة 46', completedAt: null, completedBy: null },
  ],
  documents: [
    { name: 'الفاتورة التجارية (Commercial Invoice)', uploaded: true },
    { name: 'بيان التعبئة (Packing List)', uploaded: true },
    { name: 'شهادة المنشأ (Certificate of Origin)', uploaded: true },
    { name: 'بوليصة الشحن (Bill of Lading)', uploaded: true },
    { name: 'شهادة صحية (Health Certificate)', uploaded: false },
    { name: 'إذن الإفراج (Release Order)', uploaded: false },
  ],
};

const STAGE_ORDER = ['document_review', 'inspection', 'assessment', 'duty_payment', 'released_cert46'];

export const CustomsDossierDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: dossier, loading } = useApi<any>(`/customs/${id}`);

  const d = dossier || DEMO_DOSSIER;

  if (loading) return <LoadingSpinner fullPage label="جاري تحميل ملف التخليص..." />;

  const currentStageIndex = STAGE_ORDER.indexOf(d.currentStage);

  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      setUploadedFiles((prev) => [...prev, file.name]);
    });
    toast.success(`تم استلام ${acceptedFiles.length} مستند جمركي بنجاح`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleDownloadFullDossierZip = async () => {
    try {
      const zip = new JSZip();
      const folder = zip.folder(`Dossier_${d.dossierNumber}`);

      const manifestSummary = `
==================================================
RED SHIPPING CUSTOMS CLEARANCE DOSSIER — الملف الجمركي المعتمد
==================================================
Dossier Number: ${d.dossierNumber}
ACID Number: ${d.acidNumber} (Egyptian Nafeza System)
Client: ${d.shipment.client}
Job File: ${d.shipment.jobFileNumber}
Bill of Lading: ${d.shipment.blNumber}
Destination Port: ${d.destinationPort}
Customs Office: ${d.customsOffice}
Customs Broker: ${d.broker}
Estimated Duty: ${d.estimatedDuty} ${d.currency}
HS Code: ${d.hsCode}
Issue Date: ${d.acidIssuedAt}
Expiry Date: ${d.acidExpiresAt}
Status: ${d.currentStage}
Inspection Date: ${d.inspectionDate || 'Not Scheduled'}
Inspection Location: ${d.inspectionLocation || 'N/A'}
==================================================
Generated via RED SHIPPING ERP Enterprise Platform
`;
      folder?.file('Dossier_Summary_Manifest.txt', manifestSummary);

      // Add documents
      d.documents.forEach((doc: any, i: number) => {
        if (doc.uploaded) {
          folder?.file(`${i + 1}_${doc.name.replace(/[/\\?%*:|"<>]/g, '_')}.txt`, `Verified Customs Document: ${doc.name}\nACID: ${d.acidNumber}\nValidated by RED SHIPPING Clearance Broker.`);
        }
      });

      uploadedFiles.forEach((fileName, i) => {
        folder?.file(`Uploaded_${i + 1}_${fileName}.txt`, `Additional Attached Document: ${fileName}\nACID: ${d.acidNumber}`);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `Customs_Dossier_${d.dossierNumber}_ACID.zip`);
      toast.success('تم تجميع وضغط وتحميل الملف الجمركي كاملاً بصيغة ZIP بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تحميل الملف الجمركي المضغوط');
    }
  };

  const handlePrintClearanceSheet = () => {
    try {
      window.print();
    } catch {
      toast.error('فشل بدء الطباعة');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`ملف تخليص ${d.dossierNumber}`}
        subtitle={`ACID: ${d.acidNumber} — ${d.shipment.client}`}
        breadcrumbs={[
          { label: 'التخليص الجمركي', to: '/customs' },
          { label: d.dossierNumber },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={d.currentStage} />
            <button
              onClick={handleDownloadFullDossierZip}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <FolderArchive className="w-3.5 h-3.5 text-[#FF5E1E]" />
              تحميل الملف كاملاً (ZIP)
            </button>
            <button
              onClick={handlePrintClearanceSheet}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة إذن الكشف
            </button>
          </div>
        }
      />

      {/* ACID Countdown Banner */}
      <AcidCountdown issuedAt={d.acidIssuedAt} expiresAt={d.acidExpiresAt} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stage Timeline */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-500" />
              مراحل التخليص الجمركي
            </h2>
            <div className="space-y-0">
              {d.stages.map((stage: any, idx: number) => {
                const isCompleted = stage.completedAt !== null;
                const isCurrent = stage.key === d.currentStage && !isCompleted;
                const isFuture = idx > currentStageIndex;

                return (
                  <div key={stage.key} className="flex gap-4">
                    {/* Timeline Line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ring-4 ${
                        isCompleted
                          ? 'bg-emerald-500 text-white ring-emerald-100 dark:ring-emerald-950'
                          : isCurrent
                          ? 'bg-brand-600 text-white ring-brand-100 dark:ring-brand-950 animate-pulse'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-400 ring-slate-100 dark:ring-slate-800'
                      }`}>
                        {isCompleted ? <Check className="w-5 h-5" /> : <span className="text-sm font-bold">{idx + 1}</span>}
                      </div>
                      {idx < d.stages.length - 1 && (
                        <div className={`w-0.5 h-16 ${isCompleted ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-slate-200 dark:bg-slate-700'}`} />
                      )}
                    </div>

                    {/* Stage Content */}
                    <div className={`pb-8 flex-1 min-w-0 ${isFuture ? 'opacity-50' : ''}`}>
                      <h3 className={`font-semibold text-sm ${isCurrent ? 'text-brand-600' : isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>
                        {stage.label}
                      </h3>
                      {isCompleted && (
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{stage.completedAt}</span>
                          <span>بواسطة: {stage.completedBy}</span>
                        </div>
                      )}
                      {isCurrent && (
                        <div className="mt-2">
                          <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition">
                            <ArrowRight className="w-3.5 h-3.5" />
                            إتمام هذه المرحلة
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Required Documents */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-500" />
              المستندات المطلوبة
            </h2>
            <div className="space-y-2">
              {d.documents.map((doc: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      doc.uploaded ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {doc.uploaded ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs font-medium ${doc.uploaded ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{doc.name}</span>
                  </div>
                  {!doc.uploaded && (
                    <button className="text-xs text-brand-600 hover:text-brand-500 font-semibold">رفع</button>
                  )}
                </div>
              ))}
            </div>

            {/* Drag & Drop Zone */}
            <div
              {...getRootProps()}
              className={`mt-4 p-5 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer ${
                isDragActive
                  ? 'border-[#FF5E1E] bg-[#FF5E1E]/5'
                  : 'border-slate-200 dark:border-slate-700 hover:border-[#FF5E1E]/50 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-7 h-7 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                اسحب وأفلت مستندات جمركية إضافية هنا، أو انقر للاختيار
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                (فواتير تجارية، شهادات منشأ، إذن تسليم، شهادات صحية، فحص إشعاعي، نموذج 4)
              </p>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <span className="text-[11px] font-semibold text-emerald-600 block">المستندات المرفقة حديثاً:</span>
                {uploadedFiles.map((fn, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 text-xs text-slate-700 dark:text-slate-200 border border-emerald-500/20">
                    <span className="flex items-center gap-2 font-mono text-[11px]">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
                      {fn}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">جاهز للإرفاق</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">بيانات الملف</h3>
            <div className="space-y-3 text-xs">
              <SideRow icon={Hash} label="رقم ACID" value={d.acidNumber} mono />
              <SideRow icon={Calendar} label="تاريخ إصدار ACID" value={d.acidIssuedAt} />
              <SideRow icon={Calendar} label="تاريخ انتهاء ACID" value={d.acidExpiresAt} />
              <SideRow icon={Package} label="السلعة" value={d.commodity} />
              <SideRow icon={Hash} label="HS Code" value={d.hsCode} mono />
              <SideRow icon={Building2} label="جمرك الوصول" value={d.customsOffice} />
              <SideRow icon={Truck} label="المخلص الجمركي" value={d.broker} />
            </div>
          </div>

          {d.inspectionDate && (
            <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                موعد الكشف
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300">{d.inspectionDate}</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">{d.inspectionLocation}</p>
            </div>
          )}

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">الرسوم الجمركية المتوقعة</h3>
            <span className="text-2xl font-bold text-brand-600">{d.estimatedDuty?.toLocaleString()} {d.currency}</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">ملف الشحن المرتبط</h3>
            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
              <p><span className="text-slate-400">رقم الملف: </span><span className="font-semibold text-brand-600">{d.shipment.jobFileNumber}</span></p>
              <p><span className="text-slate-400">B/L: </span><span className="font-mono">{d.shipment.blNumber}</span></p>
              <p><span className="text-slate-400">العميل: </span>{d.shipment.client}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── ACID 90-Day Countdown Component ────────────────────────── */
const AcidCountdown: React.FC<{ issuedAt: string; expiresAt: string }> = ({ issuedAt, expiresAt }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const expiry = new Date(expiresAt);
  const issued = new Date(issuedAt);
  const totalDays = Math.ceil((expiry.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24));
  const remainingMs = expiry.getTime() - now.getTime();
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  const elapsed = totalDays - remainingDays;
  const progress = Math.min(100, (elapsed / totalDays) * 100);

  const isUrgent = remainingDays <= 15;
  const isWarning = remainingDays <= 30 && !isUrgent;

  return (
    <div className={`p-5 rounded-2xl border shadow-sm ${
      isUrgent
        ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30'
        : isWarning
        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30'
        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isUrgent ? 'bg-red-100 dark:bg-red-950/50 text-red-600' : isWarning ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600' : 'bg-brand-50 dark:bg-brand-950/50 text-brand-600'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isUrgent ? 'text-red-900 dark:text-red-200' : isWarning ? 'text-amber-900 dark:text-amber-200' : 'text-slate-900 dark:text-white'}`}>
              عداد رخصة ACID — نافذة (90 يوم)
            </h3>
            <p className="text-[11px] text-slate-500">
              من {issuedAt} إلى {expiresAt}
            </p>
          </div>
        </div>
        <div className="text-end">
          <span className={`text-3xl font-bold ${isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-brand-600'}`}>
            {remainingDays}
          </span>
          <span className={`text-sm font-medium block ${isUrgent ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-slate-500'}`}>يوم متبقي</span>
        </div>
      </div>
      {/* Progress Bar */}
      <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-brand-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
        <span>{elapsed} يوم مضى</span>
        <span>{remainingDays} يوم متبقي من {totalDays}</span>
      </div>
    </div>
  );
};

const SideRow: React.FC<{ icon: React.FC<any>; label: string; value: string; mono?: boolean }> = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-start gap-3 py-1.5">
    <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
    <div className="min-w-0 flex-1">
      <span className="text-slate-400 block text-[10px]">{label}</span>
      <span className={`text-slate-700 dark:text-slate-200 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  </div>
);
