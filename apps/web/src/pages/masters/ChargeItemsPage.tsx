import React, { useEffect, useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Check,
  X,
  Search,
  Filter,
  Download,
  Receipt,
  Loader2,
  Edit2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';
import { exportToCsv } from '../../utils/exportUtils';

/** Dynamic library item (units / logistics categories) */
interface LibraryItem {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string | null;
  isActive: boolean;
}

export interface ChargeItemRecord {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  category: string;
  categoryId: string | null;
  unitId: string | null;
  unitLabel?: string | null;
  categoryLabel?: string | null;
  showInPricing: boolean;
  showInQuotation: boolean;
  showInInvoice: boolean;
  showInDisbursement: boolean;
  showInCommission: boolean;
  showInOperations: boolean;
  isActive: boolean;
}

type ContextField =
  | 'showInPricing'
  | 'showInQuotation'
  | 'showInInvoice'
  | 'showInDisbursement'
  | 'showInCommission'
  | 'showInOperations';

const CONTEXT_OPTIONS: Array<{ field: ContextField; label: string; hint: string }> = [
  { field: 'showInPricing', label: 'يظهر في شاشة التسعير ومكتب النولون', hint: 'Pricing' },
  { field: 'showInQuotation', label: 'يظهر في عرض السعر الموجه للعميل', hint: 'Quotation' },
  { field: 'showInInvoice', label: 'ينزل في الفاتورة الضريبية الرسمية', hint: 'Invoice' },
  { field: 'showInDisbursement', label: 'يظهر في سندات الصرف للموردين والخطوط', hint: 'Disbursement' },
  { field: 'showInOperations', label: 'يظهر في شاشات العمليات والتشغيل', hint: 'Operations' },
  { field: 'showInCommission', label: 'يدخل في احتساب عمولة مسؤول المبيعات', hint: 'Sales Commission' },
];

const EMPTY_FORM = {
  code: '',
  nameAr: '',
  nameEn: '',
  categoryId: '',
  unitId: '',
  showInPricing: true,
  showInQuotation: true,
  showInInvoice: true,
  showInDisbursement: false,
  showInCommission: false,
  showInOperations: false,
};

export const ChargeItemsPage: React.FC = () => {
  const [items, setItems] = useState<ChargeItemRecord[]>([]);
  const [units, setUnits] = useState<LibraryItem[]>([]);
  const [cats, setCats] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [libModal, setLibModal] = useState<null | 'units' | 'logistics-categories'>(null);
  const [libDraft, setLibDraft] = useState({ code: '', nameEn: '', nameAr: '' });

  const fetchLibraries = async () => {
    try {
      const [u, c]: any[] = await Promise.all([
        api.get('/masters/libraries/units'),
        api.get('/masters/libraries/logistics-categories'),
      ]);
      setUnits(Array.isArray(u) ? u : []);
      setCats(Array.isArray(c) ? c : []);
    } catch {
      // libraries are optional for rendering — keep empty
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/masters/charge-items');
      if (Array.isArray(data)) {
        setItems(
          data.map((d: any) => ({
            id: d.id,
            code: d.code,
            nameAr: d.nameAr,
            nameEn: d.nameEn,
            category: d.category || 'other',
            categoryId: d.categoryId,
            unitId: d.unitId,
            unitLabel: d.unit?.nameAr || d.unit?.nameEn || null,
            categoryLabel: d.categoryRef?.nameAr || d.categoryRef?.nameEn || null,
            showInPricing: d.showInPricing ?? true,
            showInQuotation: d.showInQuotation ?? true,
            showInInvoice: d.showInInvoice ?? true,
            showInDisbursement: d.showInDisbursement ?? false,
            showInCommission: d.showInCommission ?? false,
            showInOperations: d.showInOperations ?? false,
            isActive: d.isActive ?? true,
          }))
        );
      }
    } catch {
      // honest empty state — data loads only when the API is reachable
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraries();
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
      { header: 'التصنيف', accessor: (i) => i.categoryLabel || i.category },
      { header: 'وحدة الحساب', accessor: (i) => i.unitLabel || '—' },
      ...CONTEXT_OPTIONS.map((o) => ({ header: o.label, accessor: (i: any) => (i[o.field] ? 'نعم' : 'لا') })),
    ]);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setIsFormOpen(true);
  };

  const openEdit = (it: ChargeItemRecord) => {
    setEditingId(it.id);
    setForm({
      code: it.code,
      nameAr: it.nameAr,
      nameEn: it.nameEn,
      categoryId: it.categoryId || '',
      unitId: it.unitId || '',
      showInPricing: it.showInPricing,
      showInQuotation: it.showInQuotation,
      showInInvoice: it.showInInvoice,
      showInDisbursement: it.showInDisbursement,
      showInCommission: it.showInCommission,
      showInOperations: it.showInOperations,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.nameAr.trim()) {
      toast.error('يرجى إدخال كود البند واسم البند بالعربية');
      return;
    }
    const selectedCat = cats.find((c) => c.id === form.categoryId);
    const payload = {
      code: form.code.trim().toUpperCase(),
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn.trim() || form.nameAr.trim(),
      category: selectedCat?.code || 'other',
      categoryId: form.categoryId || null,
      unitId: form.unitId || null,
      showInPricing: form.showInPricing,
      showInQuotation: form.showInQuotation,
      showInInvoice: form.showInInvoice,
      showInDisbursement: form.showInDisbursement,
      showInCommission: form.showInCommission,
      showInOperations: form.showInOperations,
    };
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/masters/charge-items/${editingId}`, payload);
        toast.success(`تم تحديث البند "${payload.nameAr}" بنجاح`);
      } else {
        await api.post('/masters/charge-items', payload);
        toast.success(`تمت إضافة البند "${payload.nameAr}" إلى قاعدة البيانات`);
      }
      setIsFormOpen(false);
      fetchItems();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر حفظ البند — حاول مجدداً');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (it: ChargeItemRecord) => {
    if (!confirm(`حذف البند "${it.nameAr}"؟ (سيتم إيقافه — لا يظهر في القوائم بعد الآن)`)) return;
    try {
      await api.delete(`/masters/charge-items/${it.id}`);
      toast.success('تم إيقاف البند');
      fetchItems();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إيقاف البند');
    }
  };

  const handleAddLibraryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libModal || !libDraft.code.trim() || !libDraft.nameEn.trim()) {
      toast.error('أدخل الكود والاسم الإنجليزي للمكتبة');
      return;
    }
    try {
      await api.post(`/masters/libraries/${libModal}`, libDraft);
      toast.success('تمت الإضافة إلى المكتبة');
      setLibModal(null);
      setLibDraft({ code: '', nameEn: '', nameAr: '' });
      fetchLibraries();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إضافة القيمة للمكتبة');
    }
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
            تعريف نوالين الشحن والرسوم — التسعير مكانه الطبيعي في موديول التسعير، وهنا نحدد ماهية البند ووحدة احتسابه وأماكن انعكاسه
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Download className="w-4 h-4" />
            تصدير CSV
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            إضافة بند جديد
          </button>
        </div>
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
            {cats.filter((c) => c.isActive).map((c) => (
              <option key={c.id} value={c.code}>
                {c.nameAr || c.nameEn}
              </option>
            ))}
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
                <th className="py-3.5 px-4 text-start">التصنيف اللوجستي</th>
                <th className="py-3.5 px-4 text-start">وحدة الحساب</th>
                {CONTEXT_OPTIONS.map((o) => (
                  <th key={o.field} className="py-3.5 px-2 text-center" title={o.label}>
                    {o.hint}
                  </th>
                ))}
                <th className="py-3.5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-400 text-sm">
                    جاري تحميل البنود من قاعدة البيانات...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      لا توجد بنود مطابقة — أضف أول بند من الزر أعلى الصفحة
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">{it.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">{it.nameAr}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400" dir="ltr">{it.nameEn}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                        {it.categoryLabel || it.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">{it.unitLabel || '—'}</td>
                    {CONTEXT_OPTIONS.map((o) => (
                      <td key={o.field} className="py-3 px-2 text-center">
                        {(it[o.field] as boolean) ? (
                          <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                        )}
                      </td>
                    ))}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(it)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/50 transition"
                          title="تعديل البند"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(it)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                          title="إيقاف البند"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit Charge Item Modal ── */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingId ? 'تعديل البند' : 'إضافة بند جديد'}
        subtitle="حدد هوية البند ووحدة احتسابه وأماكن انعكاسه — المكتبات ديناميكية ويمكن إضافة قيم جديدة فوراً"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                كود البند <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder="OCEAN_FREIGHT"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                الاسم بالعربية <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="نولون بحري"
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">الاسم بالإنجليزية</label>
              <input
                type="text"
                dir="ltr"
                placeholder="Ocean Freight"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-600 dark:text-slate-300 font-bold">التصنيف اللوجستي</label>
                <button
                  type="button"
                  onClick={() => {
                    setLibDraft({ code: '', nameEn: '', nameAr: '' });
                    setLibModal('logistics-categories');
                  }}
                  className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:text-brand-500 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة تصنيف
                </button>
              </div>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500"
              >
                <option value="">— بدون تصنيف —</option>
                {cats.filter((c) => c.isActive).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr || c.nameEn} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-600 dark:text-slate-300 font-bold">وحدة الحساب</label>
                <button
                  type="button"
                  onClick={() => {
                    setLibDraft({ code: '', nameEn: '', nameAr: '' });
                    setLibModal('units');
                  }}
                  className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:text-brand-500 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة وحدة
                </button>
              </div>
              <select
                value={form.unitId}
                onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500"
              >
                <option value="">— بدون وحدة —</option>
                {units.filter((u) => u.isActive).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nameAr || u.nameEn} ({u.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-4 space-y-1.5">
            <p className="font-bold text-slate-700 dark:text-slate-200 mb-2">أماكن ظهور البند في النظام</p>
            {CONTEXT_OPTIONS.map((o) => (
              <label
                key={o.field}
                className="flex items-start gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-white dark:hover:bg-slate-900 transition"
              >
                <input
                  type="checkbox"
                  checked={form[o.field]}
                  onChange={(e) => setForm({ ...form, [o.field]: e.target.checked } as typeof EMPTY_FORM)}
                  className="mt-0.5 w-4 h-4 accent-[#FF5E1E] cursor-pointer"
                />
                <span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 block leading-tight">{o.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                    {o.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#FF5E1E] hover:bg-[#EA580C] disabled:opacity-60 text-white font-bold transition shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'حفظ البند'}</span>
            </button>
          </div>
        </form>
      </Modal>
      {/* ── Dynamic Library Add Modal ── */}
      <Modal
        isOpen={Boolean(libModal)}
        onClose={() => setLibModal(null)}
        title={libModal === 'units' ? 'إضافة وحدة احتساب جديدة' : 'إضافة تصنيف لوجستي جديد'}
        subtitle="تُحفظ في المكتبة المركزية وتظهر فوراً في كافة القوائم"
      >
        <form onSubmit={handleAddLibraryItem} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
              الكود (إنجليزي مختصر) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              dir="ltr"
              placeholder={libModal === 'units' ? 'cbm' : 'freight'}
              value={libDraft.code}
              onChange={(e) => setLibDraft({ ...libDraft, code: e.target.value.toLowerCase().trim() })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
              الاسم بالإنجليزية <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              dir="ltr"
              placeholder={libModal === 'units' ? 'Per CBM' : 'Ocean Freight'}
              value={libDraft.nameEn}
              onChange={(e) => setLibDraft({ ...libDraft, nameEn: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">الاسم بالعربية</label>
            <input
              type="text"
              placeholder={libModal === 'units' ? 'بالمتر المكعب' : 'نولون بحري'}
              value={libDraft.nameAr}
              onChange={(e) => setLibDraft({ ...libDraft, nameAr: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setLibModal(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#FF5E1E] hover:bg-[#EA580C] text-white font-bold transition shadow-md shadow-orange-500/20 cursor-pointer"
            >
              إضافة للمكتبة
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};