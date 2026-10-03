import React, { useEffect, useState, useMemo } from 'react';
import {
  Anchor,
  Plus,
  Search,
  Loader2,
  Edit2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';

/** Item of the logistics-categories library (مكتبة أنواع الموانئ) */
interface CategoryRecord {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string | null;
  isActive: boolean;
}

const EMPTY_FORM = { code: '', nameEn: '', nameAr: '' };

export const PortTypesPage: React.FC = () => {
  const [items, setItems] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/masters/libraries/port-types');
      setItems(Array.isArray(data) ? data : data?.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        (c.nameEn || '').toLowerCase().includes(q) ||
        (c.nameAr || '').includes(search.trim()),
    );
  }, [items, search]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setIsFormOpen(true);
  };

  const openEdit = (c: CategoryRecord) => {
    setEditingId(c.id);
    setForm({ code: c.code, nameEn: c.nameEn, nameAr: c.nameAr || '' });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = form.code.trim().toLowerCase().replace(/\s+/g, '_');
    const nameEn = form.nameEn.trim();
    if (!code || !nameEn) {
      toast.error('الكود والاسم بالإنجليزية مطلوبان');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/masters/libraries/port-types/${editingId}`, {
          nameEn,
          nameAr: form.nameAr.trim() || null,
        });
        toast.success('تم تحديث نوع الميناء');
      } else {
        await api.post('/masters/libraries/port-types', {
          code,
          nameEn,
          nameAr: form.nameAr.trim() || null,
        });
        toast.success('تمت إضافة نوع الميناء');
      }
      setIsFormOpen(false);
      await fetchItems();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'تعذر حفظ النوع');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (c: CategoryRecord) => {
    try {
      await api.patch(`/masters/libraries/port-types/${c.id}`, { isActive: !c.isActive });
      await fetchItems();
    } catch {
      toast.error('تعذر تحديث حالة النوع');
    }
  };

  const handleDelete = async (c: CategoryRecord) => {
    if (!window.confirm(`حذف النوع «${c.nameAr || c.nameEn}»؟`)) return;
    try {
      await api.delete(`/masters/libraries/port-types/${c.id}`);
      toast.success('تم حذف نوع الميناء');
      await fetchItems();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'تعذر حذف النوع (قد تكون مستخدمة في بنود)');
    }
  };

  const activeCount = items.filter((c) => c.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              أنواع الموانئ
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-[#FF5E1E] border border-orange-500/20 flex items-center gap-1">
              <Anchor className="w-3.5 h-3.5" />
              مكتبة ديناميكية
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            المكتبة الشاملة لأنواع الموانئ — كل نوع تضيفها هنا تظهر فوراً في «نوع الحساب» بنماذج البنود
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm">
            الإجمالي: {items.length} | فعّالة: {activeCount}
          </span>
          <button
            type="button"
            onClick={openAdd}
            className="px-4 py-2 rounded-xl bg-[#FF5E1E] hover:bg-[#EA580C] text-white text-xs font-bold transition shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            إضافة نوع
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالكود أو الاسم (عربي/إنجليزي)..."
          className="w-full ps-10 pe-4 py-2.5 rounded-2xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] text-xs font-medium text-slate-900 dark:text-white"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 text-[#FF5E1E] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#121620] rounded-2xl border border-slate-200 dark:border-[#1E2638]">
          <Anchor className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد أنواع مطابقة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-2xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] hover:border-[#FF5E1E]/50 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{c.nameAr || c.nameEn}</h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" dir="ltr">
                    {c.code}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono truncate" dir="ltr">{c.nameEn}</p>
              </div>
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleToggle(c)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    c.isActive
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {c.isActive ? 'فعّال' : 'معطّل'}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="تعديل"
                    onClick={() => openEdit(c)}
                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-[#FF5E1E] transition flex items-center justify-center cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title="حذف"
                    onClick={() => handleDelete(c)}
                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-red-500 transition flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingId ? 'تعديل نوع الميناء' : 'إضافة نوع ميناء جديد'}
        subtitle="النوع يظهر فوراً في قائمة «نوع الميناء» بنافذة إضافة الميناء وأطلس الدول"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                الكود <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                disabled={!!editingId}
                placeholder="sea"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono disabled:opacity-60"
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
                placeholder="Sea Port"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">الاسم بالعربية</label>
              <input
                type="text"
                dir="rtl"
                placeholder="ميناء بحري"
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
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
              <span>{saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة النوع'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
