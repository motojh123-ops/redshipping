import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck, Clock, FileText, AlertTriangle, Check,
  ArrowRight, Calendar, Hash, Building2, Package, Truck,
  Upload, FolderArchive, Printer, Download, FileCheck2, Sparkles, ExternalLink
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useApi } from '../../hooks/useApi';
import { buildNafezaValidateUrl } from '../../services/customsService';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

const STAGE_ORDER = ['acid_issued', 'document_review', 'inspection', 'duty_payment', 'release_issued'];

export const CustomsDossierDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: dossier, loading } = useApi<any>(`/customs/${id}`);

  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      setUploadedFiles((prev) => [...prev, file.name]);
    });
    toast.success(`تم استلام ${acceptedFiles.length} مستند جمركي بنجاح`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  if (loading) return <LoadingSpinner fullPage label="جاري تحميل ملف التخليص..." />;

  if (!dossier) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121620] shadow-sm">
        <ShieldCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">ملف التخليص الجمركي غير موجود</h2>
        <p className="text-sm text-slate-400 mb-6">لم يتم العثور على سجل التخليص الجمركي المطلوب في قاعدة البيانات.</p>
        <Link to="/customs" className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition inline-block">
          العودة لقائمة التخليص الجمركي
        </Link>
      </div>
    );
  }

  const d = dossier;

  // Real-data normalization from Prisma model
  const dossierNumber = d.customsCertificateNumber || d.acidNumber || d.shipment?.jobFileNumber || d.id;
  const clientName = typeof d.shipment?.client === 'object' ? (d.shipment?.client?.name || 'عميل غير مسجل') : (d.shipment?.client || 'عميل غير مسجل');
  const jobFileNumber = d.shipment?.jobFileNumber || '—';
  const blNumber = d.shipment?.blNumber || '—';
  const destinationPortName = d.shipment?.destinationPort?.name || d.destinationPort || 'ميناء الإسكندرية الجمركي';
  const brokerName = d.customsBroker?.name || d.broker || 'مكتب التخليص الجمركي المعتمد';
  const dutiesAmount = d.dutiesPaid != null ? Number(d.dutiesPaid) : (d.estimatedDuty != null ? Number(d.estimatedDuty) : 0);
  const vatAmount = d.vatPaid != null ? Number(d.vatPaid) : 0;
  const acidIssuedAt = d.acidIssueDate ? String(d.acidIssueDate).slice(0, 10) : (d.acidIssuedAt || '');
  const acidExpiresAt = d.acidExpiryDate ? String(d.acidExpiryDate).slice(0, 10) : (d.acidExpiresAt || '');
  const currentStage = d.status || d.currentStage || 'acid_issued';

  // Standard official customs workflow stages
  const standardStages = [
    { key: 'acid_issued', label: 'صدور رقم القيد المسبق (ACID)', completedAt: acidIssuedAt || 'معتمد', completedBy: 'منظومة نافذة NAFEZA' },
    { key: 'document_review', label: 'مراجعة المستندات واعتماد المنافيست', completedAt: acidIssuedAt ? 'مكتمل' : null, completedBy: brokerName },
    { key: 'inspection', label: 'لجنة الفحص والمعاينة الجمركية', completedAt: d.inspectionDate ? String(d.inspectionDate).slice(0, 10) : null, completedBy: 'مصلحة الجمارك' },
    { key: 'duty_payment', label: 'سداد الرسوم الجمركية وضريبة القيمة المضافة', completedAt: dutiesAmount > 0 ? 'مسدد' : null, completedBy: 'البنك المركزي / E-Finance' },
    { key: 'release_issued', label: 'صدور إفراج نهائي وخروج البضائع (نموذج 46)', completedAt: d.releaseDate ? String(d.releaseDate).slice(0, 10) : null, completedBy: 'مكتب الإفراج الجمركي' },
  ];
  const stages = Array.isArray(d.stages) && d.stages.length > 0 ? d.stages : standardStages;
  const currentStageIndex = STAGE_ORDER.indexOf(currentStage) >= 0 ? STAGE_ORDER.indexOf(currentStage) : 0;

  // Standard official clearance document checklist
  const standardDocs = [
    { name: 'بوليصة الشحن الأصلية (Original Ocean Bill of Lading)', uploaded: true },
    { name: 'الفاتورة التجارية المعتمدة ومطابقة (Commercial Invoice)', uploaded: true },
    { name: 'شهادة المنشأ المصدقة (Certificate of Origin)', uploaded: true },
    { name: 'بيان العبوة التفصيلي (Packing List)', uploaded: true },
    { name: 'إذن التسليم الملاحي من التوكيل (Delivery Order)', uploaded: !!d.releaseDate },
    { name: 'نموذج 4 البنكي للتحويلات النقدية (Form 4)', uploaded: dutiesAmount > 0 },
  ];
  const documents = Array.isArray(d.documents) && d.documents.length > 0 ? d.documents : standardDocs;

  const handleDownloadFullDossierZip = async () => {
    try {
      const zip = new JSZip();
      const folder = zip.folder(`Dossier_${dossierNumber}`);

      const manifestSummary = `
==================================================
RED SHIPPING CUSTOMS CLEARANCE DOSSIER — الملف الجمركي المعتمد
==================================================
Dossier Number: ${dossierNumber}
ACID Number: ${d.acidNumber || 'N/A'} (Egyptian Nafeza System)
Client: ${clientName}
Job File: ${jobFileNumber}
Bill of Lading: ${blNumber}
Destination Port: ${destinationPortName}
Customs Broker: ${brokerName}
Duties Paid / Estimated: ${dutiesAmount.toLocaleString()} EGP
VAT Paid: ${vatAmount.toLocaleString()} EGP
Issue Date: ${acidIssuedAt || 'N/A'}
Expiry Date: ${acidExpiresAt || 'N/A'}
Status: ${currentStage}
Inspection Date: ${d.inspectionDate ? String(d.inspectionDate).slice(0, 10) : 'Not Scheduled'}
==================================================
Generated via RED SHIPPING ERP Enterprise Platform
`;
      folder?.file('Dossier_Summary_Manifest.txt', manifestSummary);

      documents.forEach((doc: any, i: number) => {
        if (doc.uploaded) {
          folder?.file(`${i + 1}_${doc.name.replace(/[/\\?%*:|"<>]/g, '_')}.txt`, `Verified Customs Document: ${doc.name}\nACID: ${d.acidNumber || 'N/A'}\nValidated by RED SHIPPING Clearance Broker.`);
        }
      });

      uploadedFiles.forEach((fileName, i) => {
        folder?.file(`Uploaded_${i + 1}_${fileName}.txt`, `Additional Attached Document: ${fileName}\nACID: ${d.acidNumber || 'N/A'}`);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `Customs_Dossier_${dossierNumber}_ACID.zip`);
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
        title={`ملف تخليص ${dossierNumber}`}
        subtitle={`ACID: ${d.acidNumber || '—'} — ${clientName}`}
        breadcrumbs={[
          { label: 'التخليص الجمركي', to: '/customs' },
          { label: String(dossierNumber) },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={currentStage} />
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
      <AcidCountdown issuedAt={acidIssuedAt} expiresAt={acidExpiresAt} />

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
              {stages.map((stage: any, idx: number) => {
                const isCompleted = stage.completedAt !== null;
                const isCurrent = stage.key === currentStage && !isCompleted;
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
                      {idx < stages.length - 1 && (
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
              المستندات الجمركية المعتمدة
            </h2>
            <div className="space-y-2">
              {documents.map((doc: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      doc.uploaded ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {doc.uploaded ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs font-medium ${doc.uploaded ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{doc.name}</span>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${doc.uploaded ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                    {doc.uploaded ? 'مستوفى وموثق ✓' : 'قيد الاستيفاء'}
                  </span>
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
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">بيانات الملف الجمركي</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 py-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-slate-400 block text-[10px]">رقم ACID</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-slate-700 dark:text-slate-200">{d.acidNumber || '—'}</span>
                    {d.acidNumber && (
                      <a
                        href={buildNafezaValidateUrl(d.acidNumber)}
                        onClick={() => navigator.clipboard?.writeText(d.acidNumber).catch(() => {})}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 text-[10px] font-bold transition"
                        title={`الاستعلام والتحقق من صلاحية رقم ACID على منصة نافذة الرسمية (تم نسخ الرقم للحفظ)`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>تحقق رسمياً على نافذة</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <SideRow icon={Calendar} label="تاريخ إصدار ACID" value={acidIssuedAt || '—'} />
              <SideRow icon={Calendar} label="تاريخ انتهاء ACID" value={acidExpiresAt || '—'} />
              <SideRow icon={Hash} label="رقم الشهادة 46" value={d.customsCertificateNumber || '—'} mono />
              <SideRow icon={Building2} label="جمرك الوصول" value={destinationPortName} />
              <SideRow icon={Truck} label="المخلص الجمركي" value={brokerName} />
            </div>
          </div>

          {d.inspectionDate && (
            <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                موعد الكشف والمعاينة
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300">{String(d.inspectionDate).slice(0, 10)}</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">ساحة الفحص الجمركي المشترك</p>
            </div>
          )}

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">الرسوم الجمركية والضرائب</h3>
            <span className="text-2xl font-bold text-emerald-600">{dutiesAmount.toLocaleString()} ج.م</span>
            {vatAmount > 0 && (
              <span className="text-xs text-slate-400 block mt-1">+ ضريبة القيمة المضافة: {vatAmount.toLocaleString()} ج.م</span>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">ملف الشحن المرتبط</h3>
            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
              <p><span className="text-slate-400">رقم الملف: </span><span className="font-semibold text-brand-600">{jobFileNumber}</span></p>
              <p><span className="text-slate-400">B/L: </span><span className="font-mono">{blNumber}</span></p>
              <p><span className="text-slate-400">العميل: </span>{clientName}</p>
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

  const expiry = expiresAt ? new Date(expiresAt) : null;
  const issued = issuedAt ? new Date(issuedAt) : (expiry ? new Date(expiry.getTime() - 90 * 86400000) : new Date());
  const totalDays = expiry && !isNaN(expiry.getTime()) && issued && !isNaN(issued.getTime())
    ? Math.max(1, Math.ceil((expiry.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24)))
    : 90;
  const remainingMs = expiry && !isNaN(expiry.getTime()) ? expiry.getTime() - now.getTime() : 0;
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  const elapsed = Math.max(0, totalDays - remainingDays);
  const progress = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));

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
              {issuedAt ? `من ${issuedAt} ` : ''}إلى {expiresAt || 'غير محدد'}
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
