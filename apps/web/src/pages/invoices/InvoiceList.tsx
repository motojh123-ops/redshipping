import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  Download,
  CheckCircle2,
  Plus,
  Clock,
  AlertCircle,
  FileCheck2,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Wifi,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { exportToCsv } from '../../utils/exportUtils';
import { api } from '../../services/api';

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  clientName: string;
  shipmentFile: string;
  invoiceType: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: 'paid' | 'pending' | 'submitted_eta' | 'draft' | 'overdue';
  etaUuid?: string;
  issueDate: string;
  dueDate: string;
}

export const InvoiceList: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchInvoices = async () => {
    setIsRefreshing(true);
    try {
      const res: any = await api.get('/invoices');
      if (res && Array.isArray(res)) {
        setInvoices(res.map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber || '',
          clientName: inv.client?.name || inv.clientName || '',
          shipmentFile: inv.shipment?.jobFileNumber || inv.shipmentFile || '',
          invoiceType: (inv.invoiceType || 'client_freight').toLowerCase().replace(/_/g, '_'),
          subtotal: inv.subtotal || 0,
          taxAmount: inv.taxAmount || 0,
          total: inv.total || 0,
          currency: inv.currency || 'EGP',
          status: (inv.status || 'draft').toLowerCase() as any,
          etaUuid: inv.etaUuid || (inv.notes?.match(/etaUUID:([A-Za-z0-9-]+)/)?.[1] ?? undefined),
          issueDate: inv.issueDate ? new Date(inv.issueDate).toISOString().split('T')[0] : '',
          dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
        })));
        setIsLiveConnected(true);
      }
    } catch {
      setIsLiveConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.shipmentFile.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
  const totalPending = invoices.filter((i) => i.status === 'pending' || i.status === 'submitted_eta').reduce((sum, inv) => sum + inv.total, 0);
  const totalOverdue = invoices.filter((i) => i.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0);

  const handleInvoiceCreated = (newInv: InvoiceItem) => {
    setInvoices([newInv, ...invoices]);
  };

  const handleExportInvoices = () => {
    exportToCsv('banna_invoices_report', filteredInvoices, [
      { header: 'رقم الفاتورة', accessor: (i) => i.invoiceNumber },
      { header: 'اسم العميل', accessor: (i) => i.clientName },
      { header: 'ملف الشحنة', accessor: (i) => i.shipmentFile },
      { header: 'نوع الفاتورة', accessor: (i) => getInvoiceTypeLabel(i.invoiceType) },
      { header: 'المبلغ قبل الضريبة', accessor: (i) => i.subtotal },
      { header: 'ضريبة القيمة المضافة 14%', accessor: (i) => i.taxAmount },
      { header: 'الإجمالي بالجنيه', accessor: (i) => i.total },
      { header: 'تاريخ الاستحقاق', accessor: (i) => i.dueDate },
      { header: 'الحالة', accessor: (i) => i.status },
      { header: 'كود الفاتورة الإلكترونية ETA', accessor: (i) => i.etaUuid || '—' },
    ]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>مدفوعة</span>
          </span>
        );
      case 'submitted_eta':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>معتمد ETA</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
            <Clock className="w-3.5 h-3.5" />
            <span>قيد التحصيل</span>
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>متأخرة السداد</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <span>مسودة</span>
          </span>
        );
    }
  };

  const getInvoiceTypeLabel = (type: string) => {
    switch (type) {
      case 'client_freight':
        return 'شحن وتخليص';
      case 'demurrage':
        return 'غرامات وتأخير';
      case 'reimbursement':
        return 'مصروفات ونثريات';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-7">
      {/* ── 1. Executive Invoices Command Header ── */}
      <div className="relative rounded-3xl overflow-hidden bg-white/95 dark:bg-[#121620]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-white p-6 sm:p-8 shadow-sm transition-all duration-300">
        {/* Subtle Ambient Brand Glow */}
        <div className="absolute top-0 end-0 w-96 h-96 bg-gradient-to-bl from-[#FF5E1E]/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 start-0 w-80 h-80 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#FF5E1E] text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#FF5E1E] animate-pulse" />
              <span>الفاتورة الإلكترونية المعتمدة • Egyptian Tax Authority (ETA)</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              إدارة الفواتير والمطالبات المالية والمصلحة الضريبية
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              إصدار واعتماد فواتير النولون البحري، خدمات التخليص، وغرامات الأرضيات مع التوليد الفوري لرمز الاستجابة السريعة (QR Code) والتوافق الكامل مع منظومة ETA.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                رمز التحقق الضريبي ETA UUID
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                تسوية المطالبات بالجنيه والدولار
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportInvoices}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>تصدير كشف Excel</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FF5E1E] hover:bg-[#FF7034] text-white text-xs sm:text-sm font-bold shadow-lg shadow-orange-500/25 transition cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>إصدار فاتورة جديدة</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Next-Gen KPI Metric Cards (rounded-3xl + glassmorphism) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Invoiced */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي الفواتير الصادرة</span>
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#FF5E1E] group-hover:scale-110 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
            {(totalInvoiced / 1000).toFixed(1)}K
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5E1E]" />
            <span>ج.م مطالبات الشهر التشغيلي</span>
          </div>
        </div>

        {/* Card 2: Total Paid */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تم تحصيله وسداده</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
            {(totalPaid / 1000).toFixed(1)}K
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ج.م تحصيلات مسددة بالكامل</span>
          </div>
        </div>

        {/* Card 3: Pending Collection */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">مستحق قيد التحصيل</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-mono">
            {(totalPending / 1000).toFixed(1)}K
          </div>
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>ج.م ضمن فترات الائتمان</span>
          </div>
        </div>

        {/* Card 4: Overdue */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-rose-200/80 dark:border-rose-900/40 bg-gradient-to-b from-rose-500/5 to-transparent shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">فواتير متأخرة</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono">
            {(totalOverdue / 1000).toFixed(1)}K
          </div>
          <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>ج.م تجاوزت تاريخ الاستحقاق</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الفاتورة، العميل، ملف الشحنة..."
            className="w-full ps-9 pe-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">جميع الحالات</option>
            <option value="submitted_eta">معتمد ETA</option>
            <option value="pending">قيد التحصيل</option>
            <option value="paid">مدفوعة</option>
            <option value="overdue">متأخرة</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-medium uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 text-start">رقم الفاتورة</th>
                <th className="py-3.5 px-4 text-start">العميل</th>
                <th className="py-3.5 px-4 text-start">ملف الشحنة</th>
                <th className="py-3.5 px-4 text-start">النوع</th>
                <th className="py-3.5 px-4 text-start">المبلغ قبل الضريبة</th>
                <th className="py-3.5 px-4 text-start">ض.ق.م (14%)</th>
                <th className="py-3.5 px-4 text-start">الإجمالي المستحق</th>
                <th className="py-3.5 px-4 text-start">الاستحقاق</th>
                <th className="py-3.5 px-4 text-start">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">لا توجد فواتير مسجلة</p>
                    <p className="text-xs mt-1 text-slate-400">اضغط على زر "إصدار فاتورة جديدة" لإنشاء فاتورة مرتبطة بملف شحنة</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="py-4 px-4 font-bold text-brand-600 dark:text-brand-400 font-mono">
                      {inv.invoiceNumber}
                      {inv.etaUuid && (
                        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                          {inv.etaUuid}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white">
                      {inv.clientName}
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-slate-500">
                      {inv.shipmentFile}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {getInvoiceTypeLabel(inv.invoiceType)}
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {inv.subtotal.toLocaleString()} {inv.currency}
                    </td>
                    <td className="py-4 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                      +{inv.taxAmount.toLocaleString()} {inv.currency}
                    </td>
                    <td className="py-4 px-4 font-bold font-mono text-slate-900 dark:text-white">
                      {inv.total.toLocaleString()} {inv.currency}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">
                      {inv.dueDate}
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(inv.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleInvoiceCreated}
      />
    </div>
  );
};
