import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COUNTRIES = [
  { code: 'EG', nameAr: 'مصر' },
  { code: 'SA', nameAr: 'السعودية' },
  { code: 'AE', nameAr: 'الإمارات' },
  { code: 'TR', nameAr: 'تركيا' },
  { code: 'CN', nameAr: 'الصين' },
  { code: 'IN', nameAr: 'الهند' },
  { code: 'JO', nameAr: 'الأردن' },
  { code: 'LB', nameAr: 'لبنان' },
];

/** الإضافة السريعة الموحدة (وثيقة العملاء والعمليات §1/§2) —
 *  كل إدخال يبدأ «مستهدف (Prospect)» بدون سجل تجاري أو بطاقة ضريبية،
 *  والترقية إلى «عميل فعلي» تتم تلقائياً عند قبول أول عرض سعر. */
export const CreateClientModal: React.FC<CreateClientModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [companyTypes, setCompanyTypes] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: '', nameAr: '', companyTypeId: '', industrySectorId: '',
    countryCode: 'EG', cityId: '', cityManual: '',
    phone: '', email: '', website: '', personInCharge: '', personMobile: '', notes: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const rTypes: any = await api.get('/masters/libraries/company-types');
        if (!cancelled) {
          const list = Array.isArray(rTypes) ? rTypes : rTypes?.data || [];
          setCompanyTypes(list);
        }
      } catch {
        // non-blocking
      }
      try {
        const rSectors: any = await api.get('/masters/libraries/industry-sectors');
        if (!cancelled) {
          const list = Array.isArray(rSectors) ? rSectors : rSectors?.data || [];
          setSectors(list);
        }
      } catch {
        // non-blocking
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    setCities([]);
    if (!isOpen) return;
    api.get('/masters/cities', { params: { countryCode: form.countryCode } })
      .then((r: any) => setCities(Array.isArray(r) ? r : r?.data || []))
      .catch(() => {});
  }, [form.countryCode, isOpen]);

  const reset = () => setForm({
    name: '', nameAr: '', companyTypeId: '', industrySectorId: '',
    countryCode: 'EG', cityId: '', cityManual: '',
    phone: '', email: '', website: '', personInCharge: '', personMobile: '', notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNameEn = form.name.trim();
    const cleanNameAr = form.nameAr.trim();
    if (!cleanNameEn && !cleanNameAr) {
      toast.error('يرجى إدخال اسم الشركة (بالعربية أو الإنجليزية)');
      return;
    }
    if (companyTypes.length > 0 && !form.companyTypeId) {
      toast.error('يرجى اختيار نوع الشركة');
      return;
    }
    if (sectors.length > 0 && !form.industrySectorId) {
      toast.error('يرجى اختيار قطاع / نوع النشاط');
      return;
    }
    setLoading(true);
    try {
      const selectedType = companyTypes.find((t: any) => t.id === form.companyTypeId);
      const selectedSector = sectors.find((s: any) => s.id === form.industrySectorId);
      const categoryLabel = [selectedType?.nameAr || selectedType?.nameEn, selectedSector?.nameAr || selectedSector?.nameEn]
        .filter(Boolean)
        .join(' — ');

      await api.post('/clients', {
        name: cleanNameEn || cleanNameAr,
        nameAr: cleanNameAr || cleanNameEn,
        tradeName: cleanNameAr && cleanNameEn ? cleanNameAr : undefined,
        companyTypeId: form.companyTypeId || undefined,
        industrySectorId: form.industrySectorId || undefined,
        category: categoryLabel || undefined,
        countryCode: form.countryCode,
        cityId: form.cityId || undefined,
        city: form.cityId ? undefined : (form.cityManual.trim() || undefined),
        country: COUNTRIES.find((c) => c.code === form.countryCode)?.nameAr,
        phone: form.phone || undefined,
        email: form.email || undefined,
        website: form.website || undefined,
        personInCharge: form.personInCharge || undefined,
        contactName: form.personInCharge || undefined,
        contactMobile: form.personMobile || undefined,
        notes: form.notes || undefined,
        type: 'lead',
      });
      toast.success('تم تسجيل العميل بنجاح');
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || err?.response?.data?.message || 'تعذر حفظ العميل — حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white';
  const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إضافة عميل / ليد جديد"
      subtitle="الإدخال السريع الموحد — بدون سجل تجاري أو بطاقة ضريبية، ويُرقّى تلقائياً إلى «عميل فعلي» عند قبول أول عرض سعر"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>اسم الشركة (عربي) <span className="text-red-500">*</span></label>
            <input dir="rtl" placeholder="شركة دلتا للصناعات الغذائية" value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>اسم الشركة (إنجليزي) <span className="text-slate-400 font-normal text-[10px]">(اختياري إذا أُدخل بالعربي)</span></label>
            <input dir="ltr" placeholder="Delta Food Industries" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>نوع الشركة <span className="text-red-500">*</span></label>
            <select value={form.companyTypeId} onChange={(e) => setForm({ ...form, companyTypeId: e.target.value })} className={inputCls}>
              <option value="">— اختر النوع —</option>
              {companyTypes.filter((t: any) => t.isActive !== false).map((t: any) => (
                <option key={t.id} value={t.id}>{t.nameAr || t.nameEn}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>قطاع / نوع النشاط <span className="text-red-500">*</span></label>
            <select value={form.industrySectorId} onChange={(e) => setForm({ ...form, industrySectorId: e.target.value })} className={inputCls}>
              <option value="">— اختر النشاط —</option>
              {sectors.filter((s: any) => s.isActive !== false).map((s: any) => (
                <option key={s.id} value={s.id}>{s.nameAr || s.nameEn}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>البلد</label>
            <select value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value, cityId: '' })} className={inputCls}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.nameAr}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>المحافظة / المدينة</label>
            {cities.length > 0 ? (
              <select value={form.cityId} onChange={(e) => setForm({ ...form, cityId: e.target.value })} className={inputCls}>
                <option value="">— اختر المدينة —</option>
                {cities.map((ct: any) => <option key={ct.id} value={ct.id}>{ct.nameAr || ct.nameEn}</option>)}
              </select>
            ) : (
              <input dir="rtl" placeholder="مثال: مدينة 6 أكتوبر / الجيزة" value={form.cityManual}
                onChange={(e) => setForm({ ...form, cityManual: e.target.value })} className={inputCls} />
            )}
          </div>
          <div>
            <label className={labelCls}>رقم التليفون</label>
            <input dir="ltr" placeholder="+20 100 000 0000" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>البريد الإلكتروني</label>
            <input type="email" dir="ltr" placeholder="info@company.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>الموقع الإلكتروني</label>
            <input dir="ltr" placeholder="www.company.com" value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>اسم المسؤول (Person in Charge)</label>
            <input dir="rtl" placeholder="مثال: أ. أحمد عبد الله" value={form.personInCharge}
              onChange={(e) => setForm({ ...form, personInCharge: e.target.value })} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>موبايل المسؤول</label>
            <input dir="ltr" placeholder="+20 122 000 0000" value={form.personMobile}
              onChange={(e) => setForm({ ...form, personMobile: e.target.value })} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>ملاحظات / نوع البضاعة والاهتمام اللوجستي</label>
          <textarea rows={2} placeholder="مثال: مهتم بشحن 5 حاويات 40HQ من ميناء نينغبو إلى السخنة مع التخليص"
            value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
            سيُسجَّل العميل ضمن «المستهدفون (Prospects)» — تُستكمل بياناته الرسمية في المرجعيات بعد قبول أول عرض.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition cursor-pointer">
            إلغاء
          </button>
          <button type="submit" disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition disabled:opacity-50 cursor-pointer">
            <Check className="w-4 h-4" />
            <span>{loading ? 'جاري الحفظ...' : 'تسجيل العميل المستهدف'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
