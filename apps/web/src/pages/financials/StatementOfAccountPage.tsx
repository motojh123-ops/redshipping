import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../../services/api';
import {
  FileText,
  Search,
  Building2,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Printer,
  Receipt,
  FileSpreadsheet,
  Plus,
  CreditCard,
  ArrowDownLeft,
  Filter,
} from 'lucide-react';
import { exportToCsv } from '../../utils/exportUtils';

interface InvoiceLedgerEntry {
  id: string;
  invoiceNumber: string;
  jobFileNumber: string;
  blNumber: string;
  clientId: string;
  clientName: string;
  invoiceType: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  currency: string;
  status: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'UNPAID';
}

export const StatementOfAccountPage: React.FC = () => {
  const [entries, setEntries] = useState<InvoiceLedgerEntry[]>([]);
  const [liveClients, setLiveClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api.get('/invoices'),
      api.get('/clients'),
    ]).then(([invRes, clRes]) => {
      if (clRes.status === 'fulfilled') {
        const cVal: any = clRes.value;
        const cList = Array.isArray(cVal) ? cVal : (Array.isArray(cVal?.data) ? cVal.data : []);
        setLiveClients(cList);
      }
      if (invRes.status === 'fulfilled') {
        const res: any = invRes.value;
        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.items) ? res.items : []));
        setIsLiveConnected(true);
        if (list.length > 0) {
          const mappedEntries: InvoiceLedgerEntry[] = list.map((inv: any, idx: number) => {
            const total = Number(inv.totalAmount ?? inv.total ?? inv.amount ?? 0);
            const paid = inv.status === 'paid' ? total : (inv.status === 'partial' || inv.status === 'partially_paid' ? Number(inv.paidAmount ?? 0) : 0);
            const stat = inv.status === 'paid' ? 'PAID' : (inv.status === 'partial' || inv.status === 'partially_paid' ? 'PARTIAL' : (inv.status === 'overdue' ? 'OVERDUE' : 'UNPAID'));
            return {
              id: `inv-live-${inv.id || idx}`,
              invoiceNumber: inv.invoiceNumber || `—`,
              jobFileNumber: inv.shipment?.jobFileNumber || inv.jobFileNumber || '—',
              blNumber: inv.shipment?.blNumber || inv.blNumber || '—',
              clientId: inv.client?.id || inv.clientId || `client-${idx + 1}`,
              clientName: inv.client?.nameAr || inv.client?.name || inv.clientName || '—',
              invoiceType: inv.type === 'client_invoice' ? 'فاتورة خدمات لوجستية وتخليص' : 'نولون شحن بحري دولي',
              issueDate: inv.issueDate ? String(inv.issueDate).slice(0, 10) : (inv.issuedAt ? String(inv.issuedAt).slice(0, 10) : '—'),
              dueDate: inv.dueDate ? String(inv.dueDate).slice(0, 10) : '—',
              amount: total,
              paidAmount: paid,
              currency: inv.currency || 'USD',
              status: stat as InvoiceLedgerEntry['status'],
            };
          });
          setEntries(mappedEntries);
        } else {
          setEntries([]);
        }
      }
    }).catch(() => setIsLiveConnected(false));
  }, []);

  // Payment Recording Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeInvoiceForPayment, setActiveInvoiceForPayment] = useState<InvoiceLedgerEntry | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cheque' | 'cash'>('bank_transfer');
  const [paymentRef, setPaymentRef] = useState('');

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesClient = selectedClient === 'ALL' || e.clientId === selectedClient;
      const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
      const matchesSearch =
        e.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.jobFileNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.blNumber.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesClient && matchesStatus && matchesSearch;
    });
  }, [entries, selectedClient, statusFilter, searchTerm]);

  // Financial KPIs
  const totalInvoicedUSD = useMemo(() => {
    return filteredEntries
      .filter((e) => e.currency === 'USD')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredEntries]);

  const totalPaidUSD = useMemo(() => {
    return filteredEntries
      .filter((e) => e.currency === 'USD')
      .reduce((sum, e) => sum + e.paidAmount, 0);
  }, [filteredEntries]);

  const totalOutstandingUSD = totalInvoicedUSD - totalPaidUSD;

  // Debt Aging Calculation
  const agingSummary = useMemo(() => {
    const now = new Date().getTime();
    let current = 0; // 0-30 days
    let days31to60 = 0;
    let days61to90 = 0;
    let over90 = 0;

    filteredEntries
      .filter((e) => e.currency === 'USD')
      .forEach((e) => {
        const remaining = e.amount - e.paidAmount;
        if (remaining <= 0) return;

        const dueTime = new Date(e.dueDate).getTime();
        const diffDays = Math.floor((now - dueTime) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          current += remaining;
        } else if (diffDays <= 30) {
          days31to60 += remaining;
        } else if (diffDays <= 60) {
          days61to90 += remaining;
        } else {
          over90 += remaining;
        }
      });

    return { current, days31to60, days61to90, over90 };
  }, [filteredEntries]);

  const handleOpenPayment = (inv: InvoiceLedgerEntry) => {
    setActiveInvoiceForPayment(inv);
    setPaymentAmount(inv.amount - inv.paidAmount);
    setPaymentRef(`TXN-${Date.now().toString().slice(-6)}`);
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoiceForPayment) return;

    const newPaid = activeInvoiceForPayment.paidAmount + Number(paymentAmount);
    const newStatus = newPaid >= activeInvoiceForPayment.amount ? 'PAID' : 'PARTIAL';

    setEntries((prev) =>
      prev.map((item) =>
        item.id === activeInvoiceForPayment.id
          ? {
              ...item,
              paidAmount: Math.min(newPaid, item.amount),
              status: newStatus,
            }
          : item,
      ),
    );

    setIsPaymentModalOpen(false);
    setActiveInvoiceForPayment(null);
  };

  const handleExport = () => {
    exportToCsv(
      'redshipping_customer_statement_of_account',
      filteredEntries,
      [
        { header: 'رقم الفاتورة', accessor: (e) => e.invoiceNumber },
        { header: 'العميل', accessor: (e) => e.clientName },
        { header: 'ملف العملية', accessor: (e) => e.jobFileNumber },
        { header: 'رقم البوليصة B/L', accessor: (e) => e.blNumber },
        { header: 'نوع المطالبة', accessor: (e) => e.invoiceType },
        { header: 'تاريخ الإصدار', accessor: (e) => e.issueDate },
        { header: 'تاريخ الاستحقاق', accessor: (e) => e.dueDate },
        { header: 'القيمة الإجمالية', accessor: (e) => e.amount },
        { header: 'المدفوع', accessor: (e) => e.paidAmount },
        { header: 'المتبقي', accessor: (e) => e.amount - e.paidAmount },
        { header: 'العملة', accessor: (e) => e.currency },
        {
          header: 'حالة السداد',
          accessor: (e) =>
            e.status === 'PAID'
              ? 'تم السداد'
              : e.status === 'PARTIAL'
              ? 'سداد جزئي'
              : e.status === 'OVERDUE'
              ? 'متأخرة السداد'
              : 'غير مسددة',
        },
      ],
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-7">
      {/* ── 1. Executive Statement of Account (SOA) Command Header ── */}
      <div className="relative rounded-3xl overflow-hidden bg-white/95 dark:bg-[#121620]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-white p-6 sm:p-8 shadow-sm transition-all duration-300">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 end-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-orange-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 start-0 w-80 h-80 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-start">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#FF5E1E] text-xs font-bold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#FF5E1E] animate-pulse" />
                <span>كشف حساب العملاء والمديونيات • Statement of Account (SOA)</span>
              </div>
              {isLiveConnected && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync: /invoices
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              متابعة مديونيات العملاء والتحصيلات وأعمار الديون
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              متابعة دقيقة لاستحقاقات فواتير النولون والتخليص الجمركي، تحليل أعمار الديون (Aging Matrix)، وتوثيق الدفعات البنكية والنقدية وتنزيلها لحظياً.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                تسوية المطالبات بالدولار والجنيه
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                تحليل تلقائي للأرصدة المتأخرة
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>تصدير إكسيل</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FF5E1E] hover:bg-[#FF7034] text-white text-xs sm:text-sm font-bold shadow-lg shadow-orange-500/25 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف معتمد</span>
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
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
            ${totalInvoicedUSD.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5E1E]" />
            <span>USD مطالبات معتمدة للعملاء</span>
          </div>
        </div>

        {/* Card 2: Total Paid Collections */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي التحصيلات (المسدد)</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
            ${totalPaidUSD.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>تحويلات بنكية وشيكات مقبوضة</span>
          </div>
        </div>

        {/* Card 3: Outstanding Debt */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">صافي المديونية القائمة</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-mono">
            ${totalOutstandingUSD.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>مطلوب تحصيلها من العملاء</span>
          </div>
        </div>

        {/* Card 4: Overdue Debt */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-rose-200/80 dark:border-rose-900/40 bg-gradient-to-b from-rose-500/5 to-transparent shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">متأخرات تجاوزت الأجل</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono">
            ${(agingSummary.days31to60 + agingSummary.days61to90 + agingSummary.over90).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>فواتير تجاوزت 30 يوماً</span>
          </div>
        </div>
      </div>

      {/* Debt Aging Analysis Bar */}
      <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FF5E1E]" />
            تحليل أعمار الديون والائتمان (Aging Analysis)
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">شروط الائتمان القياسية: 30 يوماً من تاريخ الفاتورة</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50 dark:bg-[#0E121A] border border-emerald-500/30 rounded-xl p-3">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold block">ضمن المهلة (Current 1-30 يوم)</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white mt-1 block">${agingSummary.current.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500">حسابات نشطة غير متأخرة</span>
          </div>

          <div className="bg-slate-50 dark:bg-[#0E121A] border border-amber-500/30 rounded-xl p-3">
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold block">تأخير 31 - 60 يوم</span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1 block">${agingSummary.days31to60.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500">متابعة قسم التحصيل</span>
          </div>

          <div className="bg-slate-50 dark:bg-[#0E121A] border border-orange-500/30 rounded-xl p-3">
            <span className="text-[11px] text-orange-700 dark:text-orange-400 font-semibold block">تأخير 61 - 90 يوم</span>
            <span className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-1 block">${agingSummary.days61to90.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500">إشعار إيقاف الحجز المؤقت</span>
          </div>

          <div className="bg-slate-50 dark:bg-[#0E121A] border border-red-500/30 rounded-xl p-3">
            <span className="text-[11px] text-red-700 dark:text-red-400 font-semibold block">أكثر من 90 يوم (حرج)</span>
            <span className="text-lg font-bold text-red-600 dark:text-red-400 mt-1 block">${agingSummary.over90.toLocaleString()}</span>
            <span className="text-[10px] text-red-600 dark:text-red-400">تجميد حساب العميل بالكامل</span>
          </div>
        </div>
      </div>

      {/* Filter and Client Selector */}
      <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] p-4 rounded-2xl shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Client Selector */}
          <div>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]"
            >
              <option value="ALL">جميع العملاء (All Clients)</option>
              {liveClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr || c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]"
            >
              <option value="ALL">جميع الحالات (All Statuses)</option>
              <option value="OVERDUE">متأخرة السداد (Overdue)</option>
              <option value="PARTIAL">سداد جزئي (Partial)</option>
              <option value="UNPAID">غير مسددة (Unpaid)</option>
              <option value="PAID">مسددة بالكامل (Paid)</option>
            </select>
          </div>

          {/* Search bar */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث برقم الفاتورة، البوليصة، أو اسم العميل..."
              className="w-full bg-slate-50 dark:bg-[#0E121A] border border-slate-200 dark:border-[#1E2638] rounded-xl py-2 ps-9 pe-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E] transition"
            />
          </div>
        </div>
      </div>

      {/* Invoices Ledger Table */}
      <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-[#0E121A] border-b border-slate-200 dark:border-[#1E2638] text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">رقم الفاتورة</th>
                <th className="py-3 px-4 text-start">العميل</th>
                <th className="py-3 px-4 text-start">ملف العملية / البوليصة</th>
                <th className="py-3 px-4 text-start">تاريخ الإصدار / الاستحقاق</th>
                <th className="py-3 px-4 text-start">إجمالي الفاتورة</th>
                <th className="py-3 px-4 text-start">المسدد</th>
                <th className="py-3 px-4 text-start">المتبقي</th>
                <th className="py-3 px-4 text-center">حالة السداد</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#FF5E1E]" />
                    <p className="font-semibold text-slate-700 dark:text-slate-200">لا توجد حركات أو فواتير مسجلة في كشف الحساب</p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((inv) => {
                const remaining = inv.amount - inv.paidAmount;

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-[#181D2A] transition">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white font-mono">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{inv.clientName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{inv.invoiceType}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#FF5E1E]">{inv.jobFileNumber}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block">B/L: {inv.blNumber}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <div>إصدار: {inv.issueDate}</div>
                      <div className={`text-[10px] font-medium ${inv.status === 'OVERDUE' ? 'text-red-500' : 'text-slate-400'}`}>
                        استحقاق: {inv.dueDate}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {inv.amount.toLocaleString()} {inv.currency}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      {inv.paidAmount.toLocaleString()} {inv.currency}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400">
                      {remaining.toLocaleString()} {inv.currency}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                            : inv.status === 'PARTIAL'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                            : inv.status === 'OVERDUE'
                            ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {inv.status === 'PAID'
                          ? 'مسددة بالكامل'
                          : inv.status === 'PARTIAL'
                          ? 'سداد جزئي'
                          : inv.status === 'OVERDUE'
                          ? 'متأخرة السداد'
                          : 'غير مسددة'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {remaining > 0 ? (
                        <button
                          onClick={() => handleOpenPayment(inv)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 mx-auto transition cursor-pointer"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          تسجيل دفعة
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          خالصة السداد
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && activeInvoiceForPayment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">تسجيل دفعة سداد عميل</h3>
                  <span className="text-xs text-slate-400">{activeInvoiceForPayment.invoiceNumber}</span>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>العميل:</span>
                  <span className="font-medium text-white truncate max-w-[200px]">{activeInvoiceForPayment.clientName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>إجمالي الفاتورة:</span>
                  <span className="font-bold text-white">{activeInvoiceForPayment.amount} {activeInvoiceForPayment.currency}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>المسدد سابقاً:</span>
                  <span className="font-medium text-emerald-400">{activeInvoiceForPayment.paidAmount} {activeInvoiceForPayment.currency}</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                  <span>المبلغ المتبقي:</span>
                  <span className="font-bold text-amber-400">
                    {activeInvoiceForPayment.amount - activeInvoiceForPayment.paidAmount} {activeInvoiceForPayment.currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">المبلغ المراد سداده</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={activeInvoiceForPayment.amount - activeInvoiceForPayment.paidAmount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-sm font-bold text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">طريقة الدفع</label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                >
                  <option value="bank_transfer">تحويل بنكي (Bank Swift / Transfer)</option>
                  <option value="cheque">شيك مصرفي معتمد (Bank Cheque)</option>
                  <option value="cash">نقداً بخزينة الشركة (Cash Deposit)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">رقم الإشعار البنكي / رقم الشيك</label>
                <input
                  type="text"
                  required
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/25 cursor-pointer"
                >
                  تأكيد سداد المبلغ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
