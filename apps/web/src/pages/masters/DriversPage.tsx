import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, Phone, Download, Search, Contact, Loader2, AlertCircle,
  Building2, CalendarDays, AlertTriangle, Contact as LicenseIcon
} from 'lucide-react';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { exportToCsv } from '../../utils/exportUtils';
import { api } from '../../services/api';

/** Shape returned by GET/POST /masters/drivers (see Prisma Driver model) */
interface Driver {
  id: string;
  name: string;
  phone?: string | null;
  nationalId?: string | null;
  licenseNumber?: string | null;
  licenseExpiry?: string | null;
  truckPlate?: string | null;
  trailerPlate?: string | null;
  truckType?: string | null;
  vendorId?: string | null;
  vendor?: { id: string; name: string } | null;
  notes?: string | null;
  isActive: boolean;
}

const isLicenseExpiring = (iso?: string | null) => {
  if (!iso) return false;
  const diff = new Date(iso).getTime() - Date.now();
  return diff < 60 * 86400000; // < 60 days
};

export const DriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadDrivers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res: any = await api.get('/masters/drivers');
      const data = Array.isArray(res) ? res : res?.data;
      setDrivers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setLoadError(err?.message || 'تعذر تحميل السائقين من الخادم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
    api.get('/masters/vendors').then((res: any) => {
      const list = Array.isArray(res) ? res : res?.data || [];
      setVendors(list.filter((v: any) => v.vendorType === 'trucking'));
    }).catch(() => {});
  }, []);

  const filtered = drivers.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.phone || '').includes(search) ||
      (d.nationalId || '').includes(search) ||
      (d.truckPlate || '').toLowerCase().includes(q) ||
      (d.licenseNumber || '').toLowerCase().includes(q)
    );
  });

  const vendorName = (id?: string | null) => vendors.find((v) => v.id === id)?.name;

  const handleExport = () => {
    exportToCsv('red_shipping_drivers', filtered, [
      { header: 'اسم السائق', accessor: (d: Driver) => d.name },
      { header: 'رقم الهاتف', accessor: (d: Driver) => d.phone || '—' },
      { header: 'الرقم القومي', accessor: (d: Driver) => d.nationalId || '—' },
      { header: 'رقم الرخصة', accessor: (d: Driver) => d.licenseNumber || '—' },
      { header: 'انتهاء الرخصة', accessor: (d: Driver) => d.licenseExpiry?.slice(0, 10) || '—' },
      { header: 'لوحة الرأس', accessor: (d: Driver) => d.truckPlate || '—' },
      { header: 'لوحة المقطورة', accessor: (d: Driver) => d.trailerPlate || '—' },
      { header: 'نوع الشاحنة', accessor: (d: Driver) => d.truckType || '—' },
      { header: 'شركة النقل', accessor: (d: Driver) => vendorName(d.vendorId) || '—' },
      { header: 'الحالة', accessor: (d: Driver) => (d.isActive ? 'نشط' : 'معطّل') },
    ]);
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="relative rounded-3xl overflow-hidden bg-white/95 dark:bg-[#121620]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-white p-6 sm:p-8 shadow-sm">
        <div className="absolute top-0 end-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/10 via-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>سجل السائقين والشاحنات • Drivers & Fleet Registry</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              سجل السائقين وأسطول النقل البري
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              بيانات السائقين المعتمدين ورخصهم ولوحات الشاحنات — تُستخدم مباشرة في أوامر النقل البري (سحب الحاويات) ببيانات موحدة.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                {drivers.length} سائق معتمد
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                مربوطون بأوامر النقل في لوحة التوزيع
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>تصدير Excel</span>
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FF5E1E] hover:bg-[#FF7034] text-white text-xs sm:text-sm font-bold shadow-lg shadow-orange-500/25 transition cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة سائق</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث باسم السائق، الهاتف، الرقم القومي، أو لوحة الشاحنة..." className="w-full" />
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin" />
          <span className="text-xs font-bold">جارٍ تحميل السائقين...</span>
        </div>
      ) : loadError ? (
        <div className="p-5 rounded-3xl bg-red-500/5 border border-red-500/20 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <div>
            <h3 className="text-sm font-black text-red-600 dark:text-red-400 mb-1">تعذر تحميل البيانات</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{loadError}</p>
            <button onClick={loadDrivers} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer">
              إعادة المحاولة
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Truck} title={search ? 'لا نتائج مطابقة' : 'لا يوجد سائقون'} description={search ? 'جرب كلمة بحث أخرى' : 'أضف سائقي النقل المعتمدين'} actionLabel={search ? undefined : 'إضافة سائق'} onAction={search ? undefined : () => setIsCreateOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((d) => {
            const expiring = isLicenseExpiring(d.licenseExpiry);
            return (
              <div key={d.id} className="p-5 rounded-2xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] shadow-sm hover:border-[#FF5E1E]/40 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  {/* Header */}
                  <div className="flex items-start gap-3.5 mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-md bg-gradient-to-br from-emerald-500 to-teal-600">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{d.name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {d.truckType && <span className="text-[11px] text-slate-400">{d.truckType}</span>}
                        {expiring && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[9px] font-extrabold">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            الرخصة قاربت على الانتهاء
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-[#262E40]">
                    {d.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span dir="ltr">{d.phone}</span>
                      </div>
                    )}
                    {d.nationalId && (
                      <div className="flex items-center gap-2">
                        <Contact className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span dir="ltr" className="font-mono">{d.nationalId}</span>
                      </div>
                    )}
                    {d.licenseNumber && (
                      <div className="flex items-center gap-2">
                        <LicenseIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span dir="ltr" className="font-mono">{d.licenseNumber}</span>
                        {d.licenseExpiry && <span className="text-[10px] text-slate-400">— ينتهي {d.licenseExpiry.slice(0, 10)}</span>}
                      </div>
                    )}
                    {(d.truckPlate || d.trailerPlate) && (
                      <div className="flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono" dir="ltr">{[d.truckPlate, d.trailerPlate].filter(Boolean).join(' / ')}</span>
                      </div>
                    )}
                    {vendorName(d.vendorId) && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{vendorName(d.vendorId)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#262E40] flex items-center justify-between">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    d.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-slate-100 dark:bg-[#1E2536] text-slate-500'
                  }`}>
                    {d.isActive ? 'نشط' : 'معطّل'}
                  </span>
                  {d.phone && (
                    <a
                      href={`https://wa.me/${d.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 transition"
                    >
                      واتساب
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isCreateOpen && (
        <CreateDriverModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          vendors={vendors}
          onSuccess={(d) => setDrivers((prev) => [d, ...prev])}
        />
      )}
    </div>
  );
};

/* ── Create Driver Modal ── */
const CreateDriverModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  vendors: any[];
  onSuccess: (d: Driver) => void;
}> = ({ isOpen, onClose, vendors, onSuccess }) => {
  const [form, setForm] = useState({
    name: '', phone: '', nationalId: '', licenseNumber: '', licenseExpiry: '',
    truckPlate: '', trailerPlate: '', truckType: '', vendorId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, string> = { name: form.name.trim() };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.nationalId.trim()) payload.nationalId = form.nationalId.trim();
      if (form.licenseNumber.trim()) payload.licenseNumber = form.licenseNumber.trim();
      if (form.licenseExpiry) payload.licenseExpiry = form.licenseExpiry;
      if (form.truckPlate.trim()) payload.truckPlate = form.truckPlate.trim();
      if (form.trailerPlate.trim()) payload.trailerPlate = form.trailerPlate.trim();
      if (form.truckType.trim()) payload.truckType = form.truckType.trim();
      if (form.vendorId) payload.vendorId = form.vendorId;

      const created: any = await api.post('/masters/drivers', payload);
      onSuccess({
        id: created?.id || String(Date.now()),
        name: created?.name ?? payload.name,
        phone: created?.phone ?? payload.phone ?? null,
        nationalId: created?.nationalId ?? payload.nationalId ?? null,
        licenseNumber: created?.licenseNumber ?? payload.licenseNumber ?? null,
        licenseExpiry: created?.licenseExpiry ?? payload.licenseExpiry ?? null,
        truckPlate: created?.truckPlate ?? payload.truckPlate ?? null,
        trailerPlate: created?.trailerPlate ?? payload.trailerPlate ?? null,
        truckType: created?.truckType ?? payload.truckType ?? null,
        vendorId: created?.vendorId ?? payload.vendorId ?? null,
        isActive: created?.isActive !== false,
      });
      onClose();
      setForm({ name: '', phone: '', nationalId: '', licenseNumber: '', licenseExpiry: '', truckPlate: '', trailerPlate: '', truckType: '', vendorId: '' });
    } catch (err: any) {
      setError(err?.message || 'تعذر حفظ السائق — حاول مجدداً');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة سائق جديد للسجل" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">اسم السائق *</label>
            <input type="text" required placeholder="مثال: محمود عبد الرحمن" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">رقم الهاتف *</label>
            <input type="tel" required dir="ltr" placeholder="+20 100 000 0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${inputCls} font-mono`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">الرقم القومي</label>
            <input type="text" dir="ltr" placeholder="30101011202345" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">شركة النقل</label>
            <select value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} className={inputCls}>
              <option value="">-- مستقل / بدون شركة --</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">رقم رخصة القيادة</label>
            <input type="text" dir="ltr" placeholder="EG-DL-000000" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">تاريخ انتهاء الرخصة</label>
            <input type="date" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">لوحة الرأس</label>
            <input type="text" placeholder="ق ط ر 1234" value={form.truckPlate} onChange={(e) => setForm({ ...form, truckPlate: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">لوحة المقطورة</label>
            <input type="text" placeholder="ق ط ر 5678" value={form.trailerPlate} onChange={(e) => setForm({ ...form, trailerPlate: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">نوع الشاحنة</label>
            <input type="text" placeholder="رأس دبلو 40 قدم" value={form.truckType} onChange={(e) => setForm({ ...form, truckType: e.target.value })} className={inputCls} />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 transition cursor-pointer">
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#FF5E1E] hover:bg-[#EA580C] disabled:opacity-60 text-white font-bold transition shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{saving ? 'جارٍ الحفظ...' : 'حفظ السائق'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
