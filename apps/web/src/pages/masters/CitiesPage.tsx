import React, { useEffect, useState, useMemo } from 'react';
import {
  MapPinned,
  Plus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  Loader2,
  Globe2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';
import { exportToCsv } from '../../utils/exportUtils';

/** Shape returned by /masters/cities (Prisma City model — Country Atlas) */
interface CityRecord {
  id: string;
  countryCode: string;
  nameEn: string;
  nameAr: string | null;
  isActive: boolean;
}

/** ISO-3166 alpha-2 → flag emoji (regional indicator symbols) */
const flagOf = (code: string) =>
  /^[a-z]{2}$/i.test(code)
    ? String.fromCodePoint(...[...code.toUpperCase()].map((ch) => 127397 + ch.charCodeAt(0)))
    : '🏳️';

const COMMON_COUNTRIES: Array<{ code: string; nameAr: string }> = [
  { code: 'EG', nameAr: 'مصر' },
  { code: 'SA', nameAr: 'السعودية' },
  { code: 'AE', nameAr: 'الإمارات' },
  { code: 'CN', nameAr: 'الصين' },
  { code: 'TR', nameAr: 'تركيا' },
  { code: 'US', nameAr: 'الولايات المتحدة' },
  { code: 'GB', nameAr: 'بريطانيا' },
  { code: 'DE', nameAr: 'ألمانيا' },
  { code: 'IT', nameAr: 'إيطاليا' },
  { code: 'IN', nameAr: 'الهند' },
  { code: 'SG', nameAr: 'سنغافورة' },
  { code: 'MY', nameAr: 'ماليزيا' },
  { code: 'NL', nameAr: 'هولندا' },
  { code: 'ES', nameAr: 'إسبانيا' },
  { code: 'FR', nameAr: 'فرنسا' },
  { code: 'BE', nameAr: 'بلجيكا' },
  { code: 'JO', nameAr: 'الأردن' },
  { code: 'LB', nameAr: 'لبنان' },
  { code: 'QA', nameAr: 'قطر' },
  { code: 'KW', nameAr: 'الكويت' },
  { code: 'OM', nameAr: 'عُمان' },
  { code: 'BH', nameAr: 'البحرين' },
];

const EMPTY_FORM = { countryCode: 'EG', nameEn: '', nameAr: '' };

export const CitiesPage: React.FC = () => {
  const [cities, setCities] = useState<CityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const fetchCities = async () => {
    setLoading(true);
    try {
      const data: any = await api.get('/masters/cities');
      setCities(Array.isArray(data) ? data : []);
    } catch {
      setCities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  /** Distinct countries present in data + common shipping destinations (merged) */
  const countries = useMemo(() => {
    const map = new Map<string, string>();
    COMMON_COUNTRIES.forEach((c) => map.set(c.code, c.nameAr));
    cities.forEach((c) => {
      if (!map.has(c.countryCode)) map.set(c.countryCode, c.countryCode);
    });
    return Array.from(map.entries()).map(([code, nameAr]) => ({ code, nameAr }));
  }, [cities]);

  const countryLabel = (code: string) => countries.find((c) => c.code === code)?.nameAr || code;

  const filtered = useMemo(() => {
    return cities.filter((ct) => {
      if (countryFilter !== 'all' && ct.countryCode !== countryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const mEn = ct.nameEn.toLowerCase().includes(q);
        const mAr = (ct.nameAr || '').includes(search);
        if (!mEn && !mAr) return false;
      }
      return true;
    });
  }, [cities, search, countryFilter]);

  const handleExport = () => {
    exportToCsv('banna_cities_atlas', filtered, [
      { header: 'كود الدولة', accessor: (c: CityRecord) => c.countryCode },
      { header: 'الدولة', accessor: (c: CityRecord) => countryLabel(c.countryCode) },
      { header: 'المدينة (EN)', accessor: (c: CityRecord) => c.nameEn },
      { header: 'المدينة (AR)', accessor: (c: CityRecord) => c.nameAr || '—' },
    ]);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, countryCode: countryFilter !== 'all' ? countryFilter : 'EG' });
    setIsFormOpen(true);
  };

  const openEdit = (ct: CityRecord) => {
    setEditingId(ct.id);
    setForm({ countryCode: ct.countryCode, nameEn: ct.nameEn, nameAr: ct.nameAr || '' });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const countryCode = form.countryCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      toast.error('كود الدولة يجب أن يكون حرفين إنجليزيين (مثال: EG)');
      return;
    }
    if (!form.nameEn.trim()) {
      toast.error('أدخل اسم المدينة بالإنجليزية');
      return;
    }
    const payload = { countryCode, nameEn: form.nameEn.trim(), nameAr: form.nameAr.trim() || null };
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/masters/cities/${editingId}`, payload);
        toast.success('تم تحديث المدينة بنجاح');
      } else {
        await api.post('/masters/cities', payload);
        toast.success(`تمت إضافة "${payload.nameEn}" إلى أطلس ${countryLabel(countryCode)}`);
      }
      setIsFormOpen(false);
      fetchCities();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر حفظ المدينة — قد تكون موجودة مسبقاً');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ct: CityRecord) => {
    if (!confirm(`حذف مدينة "${ct.nameAr || ct.nameEn}" من الأطلس نهائياً؟`)) return;
    try {
      await api.delete(`/masters/cities/${ct.id}`);
      toast.success('تم حذف المدينة من الأطلس');
      fetchCities();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر حذف المدينة');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <MapPinned className="w-7 h-7 text-brand-600" />
            <span>أطلس الدول — إدارة المدن</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            المكتبة الجغرافية الخاصة بالشركة: أضف المدن التي تتعامل معها فعلياً لتظهر في نماذج الشحنات وعروض الأسعار
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
            إضافة مدينة
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث باسم المدينة بالعربية أو الإنجليزية..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl ps-9 pe-4 py-2 text-xs focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">جميع الدول ({cities.length} مدينة)</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {flagOf(c.code)} {c.nameAr} ({cities.filter((ct) => ct.countryCode === c.code).length})
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Cities Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 text-start">الدولة</th>
                <th className="py-3.5 px-4 text-start">المدينة (English)</th>
                <th className="py-3.5 px-4 text-start">المدينة (عربي)</th>
                <th className="py-3.5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400 text-sm">
                    جاري تحميل المدن من قاعدة البيانات...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <Globe2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      لا توجد مدن بعد — أضف أول مدينة لأطلس الشركة
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((ct) => (
                  <tr key={ct.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-base">{flagOf(ct.countryCode)}</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{ct.countryCode}</span>
                        <span className="text-slate-500 dark:text-slate-400">{countryLabel(ct.countryCode)}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100" dir="ltr">
                      {ct.nameEn}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{ct.nameAr || '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(ct)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/50 transition"
                          title="تعديل المدينة"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(ct)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                          title="حذف المدينة"
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
      {/* ── Create / Edit City Modal ── */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingId ? 'تعديل مدينة' : 'إضافة مدينة للأطلس'}
        subtitle="حدد الدولة بحرفيها الدوليين (ISO 3166-1 alpha-2) واسم المدينة — تصبح متاحة فوراً في نماذج النظام"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                كود الدولة (حرفان) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={2}
                dir="ltr"
                list="city-country-codes"
                placeholder="EG"
                value={form.countryCode}
                onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <datalist id="city-country-codes">
                {COMMON_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.nameAr}
                  </option>
                ))}
              </datalist>
              <p className="mt-1 text-[10px] text-slate-400">
                {flagOf(form.countryCode)} {countryLabel(form.countryCode.toUpperCase())}
              </p>
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                المدينة بالإنجليزية <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder="Ningbo"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">المدينة بالعربية</label>
              <input
                type="text"
                placeholder="نينغبو"
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
              <span>{saving ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة المدينة'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};