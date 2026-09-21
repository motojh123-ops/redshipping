import React, { useEffect, useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Check,
  X,
  Search,
  Filter,
  Download,
  DollarSign,
  Percent,
  Receipt,
  FileSpreadsheet,
  TrendingUp,
  CreditCard,
  Edit2,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';
import { exportToCsv } from '../../utils/exportUtils';
import { StatCard } from '../../components/ui/StatCard';

export interface ChargeItemRecord {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  category: 'freight' | 'terminal_thc' | 'inland_trucking' | 'customs_clearance' | 'port_dues' | 'insurance';
  defaultCurrency: 'USD' | 'EUR' | 'EGP';
  defaultPrice?: number;
  unit: 'container' | 'shipment' | 'ton' | 'cbm';
  showInPricing: boolean;
  showInQuotation: boolean;
  showInInvoice: boolean;
  showInDisbursement: boolean;
  showInCommission: boolean;
  isActive: boolean;
}

const INITIAL_CHARGE_ITEMS: ChargeItemRecord[] = [
  {
    id: 'ci-1',
    code: 'OFR-FCL',
    nameAr: 'نولون شحن بحري حاويات (FCL)',
    nameEn: 'Ocean Freight (FCL Container)',
    category: 'freight',
    defaultCurrency: 'USD',
    defaultPrice: 2200,
    unit: 'container',
    showInPricing: true,
    showInQuotation: true,
    showInInvoice: true,
    showInDisbursement: true,
    showInCommission: true,
    isActive: true,
  },
  {
    id: 'ci-2',
    code: 'THC-DEST',
    nameAr: 'مصاريف تفريغ ومناولة الميناء (THC الوصول)',
    nameEn: 'Destination Terminal Handling Charges (THC)',
    category: 'terminal_thc',
    defaultCurrency: 'USD',
    defaultPrice: 280,
    unit: 'container',
    showInPricing: true,
    showInQuotation: true,
    showInInvoice: true,
    showInDisbursement: true,
    showInCommission: false,
    isActive: true,
  },
  {
    id: 'ci-3',
    code: 'THC-ORIG',
    nameAr: 'مصاريف تحميل ومناولة ميناء الشحن (THC المنشأ)',
    nameEn: 'Origin Terminal Handling Charges (THC)',
    category: 'terminal_thc',
    defaultCurrency: 'USD',
    defaultPrice: 180,
    unit: 'container',
    showInPricing: true,
    showInQuotation: true,
    showInInvoice: true,
    showInDisbursement: true,
    showInCommission: false,
    isActive: true,
  },
  {
    id: 'ci-4',
    code: 'INL-TRK',
    nameAr: 'نولون نقل بري (الميناء إلى المصنع / المخزن)',
    nameEn: 'Inland Haulage & Container Trucking',
    category: 'inland_trucking',
    defaultCurrency: 'EGP',
    defaultPrice: 14000,
    unit: 'container',
    showInPricing: true,
    showInQuotation: true,
    showInInvoice: true,
    showInDisbursement: true,
    showInCommission: true,
    isActive: true,
  },
  {
    id: 'ci-5',
    code: 'CUS-CLR',
    nameAr: 'أتعاب التخليص الجمركي وإصدار نموذج 46',
    nameEn: 'Customs Clearance Brokerage Fee',
    category: 'customs_clearance',
    defaultCurrency: 'EGP',
    defaultPrice: 4500,
    unit: 'shipment',
    showInPricing: true,
    showInQuotation: true,
    showInInvoice: true,
    showInDisbursement: true,
    showInCommission: true,
    isActive: true,
  },
  {
    id: 'ci-6',
    code: 'ACID-REG',
    nameAr: 'رسوم تسجيل شحنة القيد المسبق نافذة (ACID)',
    nameEn: 'NAFEZA ACID Filing & Verification Fee',
    category: 'customs_clearance',
    defaultCurrency: 'EGP',
    defaultPrice: 1500,
    unit: 'shipment',
    showInPricing: true,
    showInQuotation: true,
    showInInvoice: true,
    showInDisbursement: true,
    showInCommission: false,
    isActive: true,
  },
  {
    id: 'ci-7',
    code: 'BL-ISS',
    nameAr: 'مصاريف إصدار وإذن تسليم البوليصة (B/L Fee)',
    nameEn: 'Bill of Lading & Delivery Order Fee',
    category: 'port_dues',
    defaultCurrency: 'USD',
    defaultPrice: 85,
    unit: 'shipment',
    showInPricing: true,
    showInQuotation: true,
    showInInvoice: true,
    showInDisbursement: true,
    showInCommission: false,
    isActive: true,
  },
  {
    id: 'ci-8',
    code: 'CARGO-INS',
    nameAr: 'تأمين بحري ضد مخاطر النقل (Marine Insurance)',
    nameEn: 'Marine Cargo Transit Insurance',
    category: 'insurance',
    defaultCurrency: 'USD',
    defaultPrice: 350,
    unit: 'shipment',
    showInPricing: true,
    showInQuotation: true,
    showInInvoice: true,
    showInDisbursement: true,
    showInCommission: true,
    isActive: true,
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  freight: 'نولون شحن',
  terminal_thc: 'مناولة موانئ (THC)',
  inland_trucking: 'نقل وتوزيع بري',
  customs_clearance: 'تخليص جمركي',
  port_dues: 'رسوم بوالص وموانئ',
  insurance: 'تأمين بضائع',
};

const UNIT_LABELS: Record<string, string> = {
  container: 'لكل حاوية',
  shipment: 'لكل شحنة / بوليصة',
  ton: 'لكل طن',
  cbm: 'لكل متر مكعب (CBM)',
};

export const ChargeItemsPage: React.FC = () => {
  const [items, setItems] = useState<ChargeItemRecord[]>(INITIAL_CHARGE_ITEMS);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Modal Form State
  const [code, setCode] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState<ChargeItemRecord['category']>('freight');
  const [defaultCurrency, setDefaultCurrency] = useState<'USD' | 'EUR' | 'EGP'>('USD');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [unit, setUnit] = useState<ChargeItemRecord['unit']>('container');
  const [showInPricing, setShowInPricing] = useState(true);
  const [showInQuotation, setShowInQuotation] = useState(true);
  const [showInInvoice, setShowInInvoice] = useState(true);
  const [showInDisbursement, setShowInDisbursement] = useState(true);
  const [showInCommission, setShowInCommission] = useState(false);

  const fetchItems = async () => {
    try {
      const data: any = await api.get('/masters/charge-items');
      if (Array.isArray(data) && data.length > 0) {
        const existingCodes = new Set(data.map((d: any) => d.code));
        const merged = [
          ...data.map((d: any) => ({
            id: d.id,
            code: d.code,
            nameAr: d.nameAr,
            nameEn: d.nameEn,
            category: d.category || 'freight',
            defaultCurrency: d.defaultCurrency || 'USD',
            defaultPrice: d.defaultPrice,
            unit: d.unit || 'container',
            showInPricing: d.showInPricing ?? true,
            showInQuotation: d.showInQuotation ?? true,
            showInInvoice: d.showInInvoice ?? true,
            showInDisbursement: d.showInDisbursement ?? true,
            showInCommission: d.showInCommission ?? false,
            isActive: d.isActive ?? true,
          })),
          ...INITIAL_CHARGE_ITEMS.filter((i) => !existingCodes.has(i.code)),
        ];
        setItems(merged);
      }
    } catch {
      // Fallback state
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (categoryFilter !== 'all' && it.category !== categoryFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const mCode = it.code.toLowerCase().includes(term);
        const mAr = it.nameAr.toLowerCase().includes(term);
        const mEn = it.nameEn.toLowerCase().includes(term);
        if (!mCode && !mAr && !mEn) return false;
      }
      return true;
    });
  }, [items, searchTerm, categoryFilter]);

  const handleExport = () => {
    exportToCsv('banna_charge_items', filteredItems, [
      { header: 'كود البند', accessor: (i) => i.code },
      { header: 'الاسم بالعربية', accessor: (i) => i.nameAr },
      { header: 'الاسم بالإنجليزية', accessor: (i) => i.nameEn },
      { header: 'التصنيف', accessor: (i) => CATEGORY_LABELS[i.category] || i.category },
      { header: 'العملة الافتراضية', accessor: (i) => i.defaultCurrency },
      { header: 'السعر التقديري', accessor: (i) => i.defaultPrice || 0 },
      { header: 'الوحدة', accessor: (i) => UNIT_LABELS[i.unit] || i.unit },
      { header: 'يسمع في التسعير', accessor: (i) => (i.showInPricing ? 'نعم' : 'لا') },
      { header: 'يسمع في عرض السعر', accessor: (i) => (i.showInQuotation ? 'نعم' : 'لا') },
      { header: 'يسمع في الفاتورة', accessor: (i) => (i.showInInvoice ? 'نعم' : 'لا') },
      { header: 'يسمع في سندات الصرف', accessor: (i) => (i.showInDisbursement ? 'نعم' : 'لا') },
      { header: 'يسمع في العمولة', accessor: (i) => (i.showInCommission ? 'نعم' : 'لا') },
    ]);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !nameAr.trim()) {
      alert('يرجى إدخال كود البند واسم البند بالعربية');
      return;
    }

    const newItem: ChargeItemRecord = {
      id: `ci-${Date.now()}`,
      code: code.trim().toUpperCase(),
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim() || nameAr.trim(),
      category,
      defaultCurrency,
      defaultPrice: defaultPrice ? Number(defaultPrice) : undefined,
      unit,
      showInPricing,
      showInQuotation,
      showInInvoice,
      showInDisbursement,
      showInCommission,
      isActive: true,
    };

    setItems([newItem, ...items]);
    setIsCreateOpen(false);

    // Reset Form
    setCode('');
    setNameAr('');
    setNameEn('');
    setDefaultPrice('');
  };

  const toggleItemActive = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isActive: !it.isActive } : it)),
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Tag className="w-7 h-7 text-brand-600" />
            <span>دليل البنود والخدمات اللوجستية (Universal Charge Items)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            تعريف نوالين الشحن والرسوم وتحديد أين ينعكس البند (في التسعير، عروض الأسعار، الفواتير، سندات الصرف، وعمولات المبيعات)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
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
            <span>إضافة بند جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي البنود المعرفة"
          value={items.length.toString()}
          icon={Tag}
          iconColor="text-[#FF5E1E]"
          iconBg="bg-orange-500/10 dark:bg-orange-500/15"
          trend="قابلة للاستدعاء التلقائي"
        />
        <StatCard
          title="بنود نولون وبحرية"
          value={items.filter((i) => i.category === 'freight' || i.category === 'terminal_thc').length.toString()}
          icon={TrendingUp}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10 dark:bg-amber-500/15"
          trend="مرتبطة بخطوط الملاحة"
        />
        <StatCard
          title="بنود تخليص ونقل بري"
          value={items.filter((i) => i.category === 'customs_clearance' || i.category === 'inland_trucking').length.toString()}
          icon={CreditCard}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
          trend="تسمع في سندات الصرف"
        />
        <StatCard
          title="بنود تدخل في عمولة السيلز"
          value={items.filter((i) => i.showInCommission).length.toString()}
          icon={Percent}
          iconColor="text-purple-600"
          iconBg="bg-purple-50 dark:bg-purple-950/50"
          trend="حساب ربح المندوب"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بكود البند أو الاسم بالعربية أو الإنجليزية..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl ps-9 pe-4 py-2 text-xs focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">جميع التصنيفات اللوجستية</option>
            <option value="freight">نولون شحن بحري</option>
            <option value="terminal_thc">مناولة موانئ (THC)</option>
            <option value="inland_trucking">نقل وتوزيع بري</option>
            <option value="customs_clearance">تخليص جمركي ونافذة</option>
            <option value="port_dues">رسوم بوالص وموانئ</option>
            <option value="insurance">تأمين بضائع</option>
          </select>
        </div>
      </div>

      {/* Charge Items Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 text-start">كود البند</th>
                <th className="py-3.5 px-4 text-start">اسم البند (عربي)</th>
                <th className="py-3.5 px-4 text-start">الاسم الإنجليزي</th>
                <th className="py-3.5 px-4 text-start">التصنيف</th>
                <th className="py-3.5 px-4 text-start">السعر والوحدة</th>
                <th className="py-3.5 px-2 text-center" title="يسمع في مكتب التسعير">التسعير</th>
                <th className="py-3.5 px-2 text-center" title="يسمع في عرض السعر للعميل">عرض السعر</th>
                <th className="py-3.5 px-2 text-center" title="يسمع في الفاتورة الرسمية">الفاتورة</th>
                <th className="py-3.5 px-2 text-center" title="يسمع في سند صرف الموردين">سند الصرف</th>
                <th className="py-3.5 px-2 text-center" title="يدخل في عمولة المبيعات">عمولة السيلز</th>
                <th className="py-3.5 px-4 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredItems.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-brand-600 font-mono">{it.code}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">{it.nameAr}</td>
                  <td className="py-3.5 px-4 text-slate-500 font-medium">{it.nameEn}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                      {CATEGORY_LABELS[it.category] || it.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {it.defaultPrice ? `${it.defaultCurrency} ${it.defaultPrice.toLocaleString()}` : '—'}
                    <span className="text-[10px] text-slate-400 font-normal block">{UNIT_LABELS[it.unit]}</span>
                  </td>

                  {/* 5 Reflection Indicators */}
                  <td className="py-3.5 px-2 text-center">
                    {it.showInPricing ? (
                      <span className="inline-flex w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex w-5 h-5 rounded-full bg-slate-100 text-slate-300 dark:bg-slate-800 items-center justify-center">
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    {it.showInQuotation ? (
                      <span className="inline-flex w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex w-5 h-5 rounded-full bg-slate-100 text-slate-300 dark:bg-slate-800 items-center justify-center">
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    {it.showInInvoice ? (
                      <span className="inline-flex w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex w-5 h-5 rounded-full bg-slate-100 text-slate-300 dark:bg-slate-800 items-center justify-center">
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    {it.showInDisbursement ? (
                      <span className="inline-flex w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex w-5 h-5 rounded-full bg-slate-100 text-slate-300 dark:bg-slate-800 items-center justify-center">
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    {it.showInCommission ? (
                      <span className="inline-flex w-5 h-5 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex w-5 h-5 rounded-full bg-slate-100 text-slate-300 dark:bg-slate-800 items-center justify-center">
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => toggleItemActive(it.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${
                        it.isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}
                    >
                      {it.isActive ? 'نشط' : 'معطل'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Charge Item Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="إضافة بند تكلفة / خدمة لوجستية جديد"
        subtitle="تحديد خصائص البند وأين ينعكس في دورة العمليات والفواتير والعمولات"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                كود البند المختصر *
              </label>
              <input
                type="text"
                placeholder="مثال: OFR-SP, THC-ALEX"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-mono uppercase focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                تصنيف البند اللوجستي
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500"
              >
                <option value="freight">نولون شحن بحري</option>
                <option value="terminal_thc">مناولة موانئ (THC)</option>
                <option value="inland_trucking">نقل وتوزيع بري</option>
                <option value="customs_clearance">تخليص جمركي ونافذة</option>
                <option value="port_dues">رسوم بوالص وموانئ</option>
                <option value="insurance">تأمين بضائع</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم البند باللغة العربية *
              </label>
              <input
                type="text"
                placeholder="مثال: رسوم فحص وتثمين جمركي"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم البند باللغة الإنجليزية
              </label>
              <input
                type="text"
                placeholder="مثال: Customs Physical Inspection Fee"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  العملة الافتراضية
                </label>
                <select
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EGP">EGP (جنيه)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  السعر الافتراضي
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-mono focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                وحدة احتساب البند
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500"
              >
                <option value="container">لكل حاوية (Per Container)</option>
                <option value="shipment">لكل شحنة كاملة (Per Shipment)</option>
                <option value="ton">لكل طن متري (Per Ton)</option>
                <option value="cbm">لكل متر مكعب (Per CBM)</option>
              </select>
            </div>
          </div>

          {/* Reflection Checkboxes (As stressed in Audio Note) */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-brand-600 dark:text-brand-400 mb-2">
              أين ينعكس ويسمع هذا البند في المنظومة؟ (Audio Domain Blueprint)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInPricing}
                  onChange={(e) => setShowInPricing(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>يسمع في شاشة التسعير ومكتب النولون</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInQuotation}
                  onChange={(e) => setShowInQuotation(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>يظهر في عرض السعر الموجه للعميل (Offer)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInInvoice}
                  onChange={(e) => setShowInInvoice(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>ينزل في الفاتورة الضريبية الرسمية (Invoice)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInDisbursement}
                  onChange={(e) => setShowInDisbursement(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>يسمع في سندات الصرف للموردين والخطوط</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer sm:col-span-2">
                <input
                  type="checkbox"
                  checked={showInCommission}
                  onChange={(e) => setShowInCommission(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span className="text-purple-600 dark:text-purple-400 font-bold">
                  يدخل في احتساب عمولة مسؤول المبيعات (Sales Commission)
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>حفظ البند الجديد</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
