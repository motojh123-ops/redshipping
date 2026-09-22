import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Plus, CheckCircle, ArrowRight, Download } from 'lucide-react';
import { api } from '../../services/api';
import { CreateQuotationModal } from './CreateQuotationModal';
import { exportToCsv } from '../../utils/exportUtils';

export const QuotationList: React.FC = () => {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchQuotes = async () => {
    try {
      const data: any = await api.get('/quotations');
      setQuotations(data || []);
    } catch (err) {
      console.error('Failed to load quotations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleAccept = async (id: string) => {
    try {
      await api.post(`/quotations/${id}/accept`, {});
      alert('تم قبول عرض السعر وتحويله بنجاح إلى ملف شحنة تشغيلية (Job File)');
      window.location.reload();
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء قبول عرض السعر');
    }
  };

  const handleExportQuotations = () => {
    exportToCsv('banna_quotations_report', quotations, [
      { header: 'رقم عرض السعر', accessor: (q) => q.quotationNumber },
      { header: 'الإصدار', accessor: (q) => `v${q.versionNumber || 1}` },
      { header: 'العميل', accessor: (q) => q.client?.name || 'عميل غير محدد' },
      { header: 'نوع الشحن', accessor: (q) => q.shipmentType?.toUpperCase() },
      { header: 'شرط الشحن (Incoterm)', accessor: (q) => q.incoterm },
      { header: 'التكلفة الإجمالية USD', accessor: (q) => q.totalCost },
      { header: 'سعر البيع USD', accessor: (q) => q.totalSell },
      { header: 'صافي الربح USD', accessor: (q) => q.totalProfit },
      { header: 'الحالة', accessor: (q) => q.status },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">عروض الأسعار والتسعير التجاري</h1>
          <p className="text-sm text-slate-500 mt-1">
            إعداد ومتابعة عروض النولون البحري، مصاريف الموانئ، والتخليص، وحساب هوامش الربحية
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportQuotations}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold transition"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>تصدير كشف Excel</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-md shadow-brand-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء عرض سعر جديد</span>
          </button>
        </div>
      </div>

      <CreateQuotationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchQuotes}
      />

      {/* Quotations Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-medium uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 text-start">رقم العرض والإصدار</th>
                <th className="py-3.5 px-4 text-start">العميل</th>
                <th className="py-3.5 px-4 text-start">نوع الشحن والشرط</th>
                <th className="py-3.5 px-4 text-start">التكلفة (Cost)</th>
                <th className="py-3.5 px-4 text-start">سعر البيع (Sell)</th>
                <th className="py-3.5 px-4 text-start">هامش الربح (Profit)</th>
                <th className="py-3.5 px-4 text-start">الحالة</th>
                <th className="py-3.5 px-4 text-start">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {quotations.length > 0 ? (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4 font-bold text-brand-600">
                      <div>{q.quotationNumber}</div>
                      <div className="text-[11px] font-normal text-slate-400">الإصدار: v{q.versionNumber || 1}</div>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-900 dark:text-white">
                      {q.client?.name || 'عميل غير محدد'}
                    </td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">{q.shipmentType?.toUpperCase()}</span>
                      <span className="text-slate-400 text-xs ms-1.5 font-mono">({q.incoterm})</span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300 font-mono">
                      ${Number(q.totalCost).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900 dark:text-white font-mono">
                      ${Number(q.totalSell).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      +${Number(q.totalProfit).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                        {q.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {q.status !== 'accepted' && (
                        <button
                          onClick={() => handleAccept(q.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>تحويل لشحنة</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">لا توجد عروض أسعار مسجلة</p>
                    <p className="text-xs text-slate-400 mt-1">لم يتم إنشاء أي عروض أسعار حتى الآن في قاعدة البيانات.</p>
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
