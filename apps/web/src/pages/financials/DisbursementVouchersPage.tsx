import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import {
  Receipt,
  Plus,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  Building2,
  Truck,
  Ship,
  ShieldCheck,
  Search,
  ExternalLink,
  ChevronDown,
  Printer,
  XCircle,
  Calendar,
  CreditCard,
  Banknote,
  ArrowUpRight,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Modal } from '../../components/ui/Modal';
import { exportToCsv } from '../../utils/exportUtils';

interface DisbursementVoucher {
  id: string;
  voucherNumber: string;
  shipmentId: string;
  shipmentNumber: string;
  vendorName: string;
  vendorCategory: 'shipping_line' | 'trucking' | 'clearance' | 'overseas_agent' | 'port_authority';
  chargeItem: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'EGP';
  exchangeRate: number;
  amountEgp: number;
  paymentMethod: 'bank_transfer' | 'cheque' | 'petty_cash' | 'custody';
  treasury: string;
  requestedBy: string;
  approvedBy?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid' | 'rejected';
  requestDate: string;
  paymentDate?: string;
  receiptNumber?: string;
  notes?: string;
}

const DEMO_VOUCHERS: DisbursementVoucher[] = [
  {
    id: '1',
    voucherNumber: 'PV-2026-0104',
    shipmentId: '1',
    shipmentNumber: 'SHP-2026-001',
    vendorName: 'ميرسك مصر المحدودة (Maersk Egypt)',
    vendorCategory: 'shipping_line',
    chargeItem: 'نولون بحري وارد (Ocean Freight Import)',
    amount: 3200,
    currency: 'USD',
    exchangeRate: 48.75,
    amountEgp: 156000,
    paymentMethod: 'bank_transfer',
    treasury: 'البنك التجاري الدولي (CIB - USD)',
    requestedBy: 'أحمد الأمين (العمليات)',
    approvedBy: 'سامي كمال (المدير المالي)',
    status: 'paid',
    requestDate: '2026-09-14',
    paymentDate: '2026-09-16',
    receiptNumber: 'SWIFT-9284710',
    notes: 'سداد نولون الحاويات 2x40HC بوليصة MSK9823471',
  },
  {
    id: '2',
    voucherNumber: 'PV-2026-0105',
    shipmentId: '1',
    shipmentNumber: 'SHP-2026-001',
    vendorName: 'الشركة المصرية الدولية للنقل السريع',
    vendorCategory: 'trucking',
    chargeItem: 'نقل بري داخلي (Inland Trucking)',
    amount: 18500,
    currency: 'EGP',
    exchangeRate: 1,
    amountEgp: 18500,
    paymentMethod: 'cheque',
    treasury: 'بنك مصر (حساب الشركات)',
    requestedBy: 'أحمد الأمين (العمليات)',
    approvedBy: 'سامي كمال (المدير المالي)',
    status: 'approved',
    requestDate: '2026-09-16',
    notes: 'نقل من ميناء الإسكندرية إلى مصنع العميل بالعاشر من رمضان - 2 تريلا',
  },
  {
    id: '3',
    voucherNumber: 'PV-2026-0106',
    shipmentId: '2',
    shipmentNumber: 'SHP-2026-002',
    vendorName: 'مكتب الرضوان للتخليص والخدمات الجمركية',
    vendorCategory: 'clearance',
    chargeItem: 'أتعاب تخليص ومصاريف كشف جمركي (Customs Brokerage)',
    amount: 7200,
    currency: 'EGP',
    exchangeRate: 1,
    amountEgp: 7200,
    paymentMethod: 'petty_cash',
    treasury: 'عهدة فرع الإسكندرية',
    requestedBy: 'محمود طارق (التخليص)',
    status: 'pending_approval',
    requestDate: '2026-09-17',
    notes: 'رسوم كشف وموازين واستخراج إذن تسليم جمركي شحنة كيماويات',
  },
  {
    id: '4',
    voucherNumber: 'PV-2026-0107',
    shipmentId: '3',
    shipmentNumber: 'SHP-2026-003',
    vendorName: 'هيئة ميناء دمياط (DPA)',
    vendorCategory: 'port_authority',
    chargeItem: 'رسوم تفريغ ورصيف وموازين (THC / Port Dues)',
    amount: 12400,
    currency: 'EGP',
    exchangeRate: 1,
    amountEgp: 12400,
    paymentMethod: 'custody',
    treasury: 'عهدة دمياط المستديمة',
    requestedBy: 'محمود طارق (التخليص)',
    approvedBy: 'سامي كمال (المدير المالي)',
    status: 'paid',
    requestDate: '2026-09-15',
    paymentDate: '2026-09-15',
    receiptNumber: 'DPA-E-99120',
    notes: 'سداد إلكتروني عبر منظومة الدفع الموحد لميناء دمياط',
  },
  {
    id: '5',
    voucherNumber: 'PV-2026-0108',
    shipmentId: '4',
    shipmentNumber: 'SHP-2026-004',
    vendorName: 'Apex Global Logistics Ningbo',
    vendorCategory: 'overseas_agent',
    chargeItem: 'أتعاب وكيل الخارج ومصاريف أصل (Origin Handling Charges)',
    amount: 1150,
    currency: 'USD',
    exchangeRate: 48.75,
    amountEgp: 56062.5,
    paymentMethod: 'bank_transfer',
    treasury: 'البنك التجاري الدولي (CIB - USD)',
    requestedBy: 'أحمد الأمين (العمليات)',
    status: 'draft',
    requestDate: '2026-09-18',
    notes: 'مطالبة وكيل نينغبو لإصدار بوالص الشحن BL الأصلية',
  },
];

const VENDOR_CATEGORY_CONFIG = {
  shipping_line: { label: 'خط ملاحي', icon: Ship, color: 'text-[#FF5E1E] bg-orange-500/10 dark:bg-orange-500/15' },
  trucking: { label: 'شركة نقل بري', icon: Truck, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50' },
  clearance: { label: 'مكتب تخليص', icon: ShieldCheck, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50' },
  overseas_agent: { label: 'وكيل خارجي', icon: Building2, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50' },
  port_authority: { label: 'هيئة الميناء', icon: Receipt, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50' },
};

const STATUS_CONFIG = {
  draft: { label: 'مسودة', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  pending_approval: { label: 'بانتظار الاعتماد', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
  approved: { label: 'معتمد للصرف', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' },
  paid: { label: 'تم الصرف ✅', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300' },
};

export const DisbursementVouchersPage: React.FC = () => {
  const { t } = useTranslation();
  const [vouchers, setVouchers] = useState<DisbursementVoucher[]>(DEMO_VOUCHERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<DisbursementVoucher | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api.get('/masters/vendors'),
      api.get('/shipments'),
    ]).then(([vRes]) => {
      if (vRes.status === 'fulfilled' && vRes.value) {
        setIsLiveConnected(true);
      }
    }).catch(() => setIsLiveConnected(false));
  }, []);

  // New Voucher Form state
  const [formData, setFormData] = useState({
    shipmentNumber: 'SHP-2026-001',
    vendorName: '',
    vendorCategory: 'shipping_line' as DisbursementVoucher['vendorCategory'],
    chargeItem: 'نولون بحري وارد (Ocean Freight Import)',
    amount: '',
    currency: 'USD' as 'USD' | 'EUR' | 'EGP',
    exchangeRate: '48.75',
    paymentMethod: 'bank_transfer' as DisbursementVoucher['paymentMethod'],
    treasury: 'البنك التجاري الدولي (CIB)',
    notes: '',
  });

  // Financial Stats
  const totalPaidEgp = vouchers
    .filter((v) => v.status === 'paid')
    .reduce((sum, v) => sum + v.amountEgp, 0);

  const pendingApprovalCount = vouchers.filter((v) => v.status === 'pending_approval').length;
  const approvedUnpaidEgp = vouchers
    .filter((v) => v.status === 'approved')
    .reduce((sum, v) => sum + v.amountEgp, 0);

  const shippingLinesShareEgp = vouchers
    .filter((v) => v.vendorCategory === 'shipping_line')
    .reduce((sum, v) => sum + v.amountEgp, 0);

  const filteredVouchers = vouchers.filter((v) => {
    const matchesSearch =
      v.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.shipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.chargeItem.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || v.vendorCategory === categoryFilter;
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount) || 0;
    const rateNum = parseFloat(formData.exchangeRate) || 1;
    const amountEgp = formData.currency === 'EGP' ? amountNum : amountNum * rateNum;

    const newV: DisbursementVoucher = {
      id: String(Date.now()),
      voucherNumber: `PV-2026-0${109 + vouchers.length}`,
      shipmentId: '1',
      shipmentNumber: formData.shipmentNumber,
      vendorName: formData.vendorName || 'المورد المختار',
      vendorCategory: formData.vendorCategory,
      chargeItem: formData.chargeItem,
      amount: amountNum,
      currency: formData.currency,
      exchangeRate: rateNum,
      amountEgp,
      paymentMethod: formData.paymentMethod,
      treasury: formData.treasury,
      requestedBy: 'عمر السيد (أدمن)',
      status: 'pending_approval',
      requestDate: new Date().toISOString().split('T')[0],
      notes: formData.notes,
    };

    setVouchers([newV, ...vouchers]);
    setShowCreateModal(false);
  };

  const handleApprove = (id: string) => {
    setVouchers((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, status: 'approved', approvedBy: 'سامي كمال (المدير المالي)' }
          : v,
      ),
    );
  };

  const handleMarkPaid = (id: string) => {
    setVouchers((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              status: 'paid',
              paymentDate: new Date().toISOString().split('T')[0],
              receiptNumber: `RCP-${Math.floor(100000 + Math.random() * 900000)}`,
            }
          : v,
      ),
    );
  };

  const handleExport = () => {
    exportToCsv<DisbursementVoucher>(
      'disbursement_vouchers',
      filteredVouchers,
      [
        { header: 'رقم الإذن', accessor: (v) => v.voucherNumber },
        { header: 'الشحنة', accessor: (v) => v.shipmentNumber },
        { header: 'المورد', accessor: (v) => v.vendorName },
        { header: 'الفئة', accessor: (v) => VENDOR_CATEGORY_CONFIG[v.vendorCategory].label },
        { header: 'البند', accessor: (v) => v.chargeItem },
        { header: 'القيمة', accessor: (v) => v.amount },
        { header: 'العملة', accessor: (v) => v.currency },
        { header: 'المعادل بالجنيه', accessor: (v) => v.amountEgp },
        { header: 'طريقة الدفع', accessor: (v) => v.paymentMethod },
        { header: 'الخزينة/البنك', accessor: (v) => v.treasury },
        { header: 'الحالة', accessor: (v) => STATUS_CONFIG[v.status].label },
        { header: 'تاريخ الطلب', accessor: (v) => v.requestDate },
      ],
    );
  };

  return (
    <div className="space-y-7">
      {/* ── 1. Executive Financials Command Header ── */}
      <div className="relative rounded-3xl overflow-hidden bg-white/95 dark:bg-[#121620]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-white p-6 sm:p-8 shadow-sm transition-all duration-300">
        {/* Subtle Ambient Emerald/Gold Glow */}
        <div className="absolute top-0 end-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 start-0 w-80 h-80 bg-gradient-to-tr from-sky-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-start">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>الرقابة المالية والمصروفات • Financial Disbursements</span>
              </div>
              {isLiveConnected && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync: Connected
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              أذون صرف ونفقات الموردين والخطوط الملاحية
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              إدارة واعتماد أذون الصرف للخطوط الملاحية (Maersk, MSC, CMA)، شركات النقل البري، ومكاتب التخليص الجمركي مع التدقيق المحاسبي ومطابقة الخزائن.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                تسوية فواتير الخطوط الملاحية
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                دورة اعتماد محاسبية معتمدة
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>تصدير كشف الصرف</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FF5E1E] hover:bg-[#FF7034] text-white text-xs sm:text-sm font-bold shadow-lg shadow-orange-500/25 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء إذن صرف جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Next-Gen KPI Metric Cards (rounded-3xl + glassmorphism) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Paid */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي المصروفات المسددة</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
            {(totalPaidEgp / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ج.م تم التحويل والسداد</span>
          </div>
        </div>

        {/* Card 2: Approved Unpaid */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">معتمد بانتظار الصرف</span>
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
            {(approvedUnpaidEgp / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K
          </div>
          <div className="mt-2 text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            <span>جاهز للصرف من البنوك والخزائن</span>
          </div>
        </div>

        {/* Card 3: Pending Approval */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-b from-amber-500/5 to-transparent shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">أذون تتطلب الاعتماد</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-700 dark:text-amber-300 tracking-tight">
            {pendingApprovalCount}
          </div>
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>في انتظار مراجعة الإدارة المالية</span>
          </div>
        </div>

        {/* Card 4: Shipping Lines Share */}
        <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">مدفوعات الخطوط الملاحية</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Ship className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
            {(shippingLinesShareEgp / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <span>نوالين بحرية بالعملات الأجنبية</span>
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Search ── */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-4 h-4 absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث برقم الإذن، المورد، رقم الشحنة أو البند..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pe-9 ps-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">فئة المورد:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="all">كل الفئات</option>
              <option value="shipping_line">خطوط ملاحية</option>
              <option value="trucking">نقل بري</option>
              <option value="clearance">مكاتب تخليص</option>
              <option value="overseas_agent">وكلاء الخارج</option>
              <option value="port_authority">هيئات الموانئ</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">حالة الإذن:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="all">كل الحالات</option>
              <option value="pending_approval">بانتظار الاعتماد</option>
              <option value="approved">معتمد للصرف</option>
              <option value="paid">تم الصرف</option>
              <option value="draft">مسودة</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 text-start">رقم الإذن</th>
                <th className="py-3 px-4 text-start">الشحنة المرتبطة</th>
                <th className="py-3 px-4 text-start">المورد والفئة</th>
                <th className="py-3 px-4 text-start">البند ومصدر الصرف</th>
                <th className="py-3 px-4 text-start">القيمة والعملة</th>
                <th className="py-3 px-4 text-start">المعادل (EGP)</th>
                <th className="py-3 px-4 text-start">الحالة</th>
                <th className="py-3 px-4 text-start">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredVouchers.map((v) => {
                const cat = VENDOR_CATEGORY_CONFIG[v.vendorCategory];
                const CatIcon = cat.icon;
                const status = STATUS_CONFIG[v.status];

                return (
                  <tr key={v.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white font-mono text-xs">
                      {v.voucherNumber}
                      <span className="block text-[11px] font-normal text-slate-400 font-sans mt-0.5">{v.requestDate}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 font-mono">
                        {v.shipmentNumber}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cat.color}`}>
                          <CatIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white text-xs">{v.vendorName}</p>
                          <span className="text-[11px] text-slate-400">{cat.label}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{v.chargeItem}</p>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <CreditCard className="w-3 h-3" />
                        {v.treasury}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white text-xs">
                      {v.amount.toLocaleString()} {v.currency}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {v.amountEgp.toLocaleString()} ج.م
                      {v.currency !== 'EGP' && (
                        <span className="block text-[10px] font-normal text-slate-400">سعر: {v.exchangeRate}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {v.status === 'pending_approval' && (
                          <button
                            onClick={() => handleApprove(v.id)}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition"
                            title="اعتماد الصرف"
                          >
                            اعتماد
                          </button>
                        )}
                        {v.status === 'approved' && (
                          <button
                            onClick={() => handleMarkPaid(v.id)}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition"
                            title="تأكيد الصرف الفعلي"
                          >
                            صرف
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedVoucher(v)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="عرض وتفاصيل الإذن"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedVoucher && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedVoucher(null)}
          title={`إذن صرف نقدية — ${selectedVoucher.voucherNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-5 p-1">
            {/* Header Voucher Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">ملف الشحنة المرتبط</span>
                <span className="text-base font-bold text-brand-600 font-mono">{selectedVoucher.shipmentNumber}</span>
              </div>
              <div className="text-end">
                <span className="text-xs text-slate-400 block">إجمالي القيمة المطلوب صرفها</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                  {selectedVoucher.amount.toLocaleString()} {selectedVoucher.currency}
                </span>
                <span className="block text-xs text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                  (ما يعادل {selectedVoucher.amountEgp.toLocaleString()} ج.م)
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 block">المورد / الجهة المستفيدة</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{selectedVoucher.vendorName}</span>
                <span className="text-slate-500 block">({VENDOR_CATEGORY_CONFIG[selectedVoucher.vendorCategory].label})</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block">بند المصروف</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{selectedVoucher.chargeItem}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block">طريقة السداد / الصرف</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{selectedVoucher.paymentMethod}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block">الخزينة أو الحساب البنكي</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{selectedVoucher.treasury}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block">طالب الإذن</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{selectedVoucher.requestedBy}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block">المعتمد المالي</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{selectedVoucher.approvedBy || 'قيد الانتظار'}</span>
              </div>

              {selectedVoucher.receiptNumber && (
                <div className="col-span-2 space-y-1 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold block">رقم إيصال / مرجع التحويل البنكي:</span>
                  <span className="font-mono text-emerald-800 dark:text-emerald-200 font-bold">{selectedVoucher.receiptNumber}</span>
                  <span className="block text-[11px] text-slate-500 mt-1">تاريخ السداد: {selectedVoucher.paymentDate}</span>
                </div>
              )}

              {selectedVoucher.notes && (
                <div className="col-span-2 space-y-1 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg">
                  <span className="text-slate-400 block">ملاحظات:</span>
                  <p className="text-slate-700 dark:text-slate-300">{selectedVoucher.notes}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Printer className="w-4 h-4" />
                طباعة إذن الصرف
              </button>

              <div className="flex items-center gap-2">
                {selectedVoucher.status === 'pending_approval' && (
                  <button
                    onClick={() => {
                      handleApprove(selectedVoucher.id);
                      setSelectedVoucher(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition"
                  >
                    اعتماد الصرف
                  </button>
                )}
                {selectedVoucher.status === 'approved' && (
                  <button
                    onClick={() => {
                      handleMarkPaid(selectedVoucher.id);
                      setSelectedVoucher(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                  >
                    تأكيد الصرف وإرفاق الإيصال
                  </button>
                )}
                <button
                  onClick={() => setSelectedVoucher(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Voucher Modal */}
      {showCreateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCreateModal(false)}
          title="إنشاء إذن صرف جديد (Disbursement Voucher)"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateVoucher} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">ملف الشحنة المرتبط *</label>
                <select
                  value={formData.shipmentNumber}
                  onChange={(e) => setFormData({ ...formData, shipmentNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="SHP-2026-001">SHP-2026-001 — الأهرام للصناعات (حاوية وارد)</option>
                  <option value="SHP-2026-002">SHP-2026-002 — مصر للكيماويات (تخليص دمياط)</option>
                  <option value="SHP-2026-003">SHP-2026-003 — القاهرة لتصنيع الزجاج</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">فئة المورد المستفيد *</label>
                <select
                  value={formData.vendorCategory}
                  onChange={(e) => setFormData({ ...formData, vendorCategory: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="shipping_line">خط ملاحي (Shipping Line)</option>
                  <option value="trucking">شركة نقل بري (Trucking)</option>
                  <option value="clearance">مكتب تخليص جمركي (Customs Broker)</option>
                  <option value="overseas_agent">وكيل شحن خارجي (Overseas Agent)</option>
                  <option value="port_authority">هيئة الميناء / المستودعات (Port / Depot)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">اسم المورد / الجهة المستفيدة *</label>
              <input
                type="text"
                required
                placeholder="مثال: ميرسك مصر / شركة الأمل للنقل / مكتب الرضوان للتخليص"
                value={formData.vendorName}
                onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">البند المحاسبي (Charge Item) *</label>
              <select
                value={formData.chargeItem}
                onChange={(e) => setFormData({ ...formData, chargeItem: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="نولون بحري وارد (Ocean Freight Import)">نولون بحري وارد (Ocean Freight Import)</option>
                <option value="نولون بحري صادر (Ocean Freight Export)">نولون بحري صادر (Ocean Freight Export)</option>
                <option value="نقل بري داخلي (Inland Haulage)">نقل بري داخلي (Inland Haulage)</option>
                <option value="أتعاب تخليص ومصروفات كشف (Customs Brokerage)">أتعاب تخليص ومصروفات كشف (Customs Brokerage)</option>
                <option value="رسوم تفريغ ورصيف THC">رسوم تفريغ ورصيف THC</option>
                <option value="أتعاب بوليصة أصل B/L Fee">أتعاب بوليصة أصل B/L Fee</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">القيمة *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">العملة *</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="EGP">EGP</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">سعر الصرف لـ EGP</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.exchangeRate}
                  onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                  disabled={formData.currency === 'EGP'}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">طريقة السداد المقترحة *</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="bank_transfer">تحويل بنكي (Bank Wire / Transfer)</option>
                  <option value="cheque">شيك مصرفي (Cheque)</option>
                  <option value="petty_cash">عهدة نقدية (Petty Cash)</option>
                  <option value="custody">حساب عهدة الميناء (Port Custody)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">الخزينة أو الحساب البنكي *</label>
                <select
                  value={formData.treasury}
                  onChange={(e) => setFormData({ ...formData, treasury: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="البنك التجاري الدولي (CIB - USD)">البنك التجاري الدولي (CIB - USD)</option>
                  <option value="البنك التجاري الدولي (CIB - EGP)">البنك التجاري الدولي (CIB - EGP)</option>
                  <option value="بنك مصر (حساب الشركات EGP)">بنك مصر (حساب الشركات EGP)</option>
                  <option value="عهدة فرع الإسكندرية">عهدة فرع الإسكندرية (نقدي)</option>
                  <option value="عهدة ميناء دمياط المستديمة">عهدة ميناء دمياط المستديمة</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">ملاحظات وسبب الصرف</label>
              <textarea
                rows={2}
                placeholder="أرقام الحاويات، رقم بوليصة الشحن، أو أي تفاصيل إضافية..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/20 transition"
              >
                إرسال للاعتماد المالي
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
