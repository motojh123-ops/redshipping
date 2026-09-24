import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, Phone, Mail, Building2, ShieldCheck, Download,
  Search, Eye, Loader2, AlertCircle, Warehouse, Anchor, Bug, ClipboardCheck, Pencil, Power
} from 'lucide-react';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { exportToCsv } from '../../utils/exportUtils';
import { api } from '../../services/api';

/** Shape returned by GET/POST /masters/vendors (see Prisma Vendor model) */
interface Vendor {
  id: string;
  name: string;
  vendorType: 'trucking' | 'clearance' | 'port_services' | 'warehousing' | 'fumigation' | 'inspection';
  taxId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  isActive: boolean;
}

const VENDOR_TYPE_META: Record<Vendor['vendorType'], { label: string; icon: React.FC<any>; classes: string }> = {
  trucking: { label: 'نقل بري', icon: Truck, classes: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 ring-1 ring-brand-200 dark:ring-brand-800' },
  clearance: { label: 'تخليص جمركي', icon: ShieldCheck, classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800' },
  port_services: { label: 'خدمات ميناء', icon: Anchor, classes: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 ring-1 ring-sky-200 dark:ring-sky-800' },
  warehousing: { label: 'تخزين', icon: Warehouse, classes: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800' },
  fumigation: { label: 'تبخير', icon: Bug, classes: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 ring-1 ring-purple-200 dark:ring-purple-800' },
  inspection: { label: 'فحص', icon: ClipboardCheck, classes: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800' },
};

const TYPE_ICONS: Record<Vendor['vendorType'], string> = {
  trucking: '🚚',
  clearance: '🛃',
  port_services: '⚓',
  warehousing: '🏭',
  fumigation: '🧪',
  inspection: '🔍',
};

export const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | Vendor['vendorType']>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadVendors = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res: any = await api.get('/masters/vendors', { params: { includeInactive: 'true' } });
      const data = Array.isArray(res) ? res : res?.data;
      setVendors(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setLoadError(err?.message || 'تعذر تحميل الموردين من الخادم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const filtered = vendors.filter((v) => {
    const matchesSearch =
      !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.taxId || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.contactName || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.contactPhone || '').includes(search);

    const matchesType = typeFilter === 'all' || v.vendorType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleExportVendors = () => {
    exportToCsv('red_shipping_vendors', filtered, [
      { header: 'اسم المورد / الشركة', accessor: (v: Vendor) => v.name },
      { header: 'نوع الخدمة', accessor: (v: Vendor) => VENDOR_TYPE_META[v.vendorType]?.label || v.vendorType },
      { header: 'مسؤول الاتصال', accessor: (v: Vendor) => v.contactName || '—' },
      { header: 'الهاتف', accessor: (v: Vendor) => v.contactPhone || '—' },
      { header: 'البريد الإلكتروني', accessor: (v: Vendor) => v.contactEmail || '—' },
      { header: 'الرقم الضريبي', accessor: (v: Vendor) => v.taxId || '—' },
      { header: 'الحالة', accessor: (v: Vendor) => (v.isActive ? 'نشط' : 'معطّل') },
    ]);
  };

  return (
    <div className="space-y-7">
      {/* ── Header ── */}
      <div className="relative rounded-3xl overflow-hidden bg-white/95 dark:bg-[#121620]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-white p-6 sm:p-8 shadow-sm transition-all duration-300">
        <div className="absolute top-0 end-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/10 via-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 start-0 w-80 h-80 bg-gradient-to-tr from-[#FF5E1E]/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>شبكة الموردين ومقدمي الخدمات • Verified Logistics Partners</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              إدارة الموردين ومقدمي الخدمات اللوجستية
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              دليل شركات النقل البري وتريلات الحاويات، مكاتب التخليص الجمركي بالموانئ، وخدمات المناولة والتخزين والتبخير والفحص.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                {vendors.length} مورد معتمد
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                نقل بري وتخليص جمركي وخدمات مساندة
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportVendors}
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
              <span>إضافة مورد جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="بحث باسم المورد، الرقم الضريبي، أو مسؤول التواصل..."
          className="flex-1 w-full"
        />

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold shrink-0 overflow-x-auto">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${typeFilter === 'all' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
          >
            الكل ({vendors.length})
          </button>
          {(Object.keys(VENDOR_TYPE_META) as Vendor['vendorType'][]).map((t) => {
            const meta = VENDOR_TYPE_META[t];
            const Icon = meta.icon;
            const count = vendors.filter((v) => v.vendorType === t).length;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 whitespace-nowrap ${typeFilter === t ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {meta.label}
                {count > 0 && <span className="text-[10px] text-slate-400">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin" />
          <span className="text-xs font-bold">جارٍ تحميل الموردين...</span>
        </div>
      ) : loadError ? (
        <div className="p-5 rounded-3xl bg-red-500/5 border border-red-500/20 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <div>
            <h3 className="text-sm font-black text-red-600 dark:text-red-400 mb-1">تعذر تحميل البيانات</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{loadError}</p>
            <button
              onClick={loadVendors}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Truck} title={search || typeFilter !== 'all' ? 'لا نتائج مطابقة' : 'لا يوجد موردين'} description={search || typeFilter !== 'all' ? 'جرب تغيير البحث أو الفلتر' : 'أضف الموردين والشركات الخدمية المتعامل معها'} actionLabel={search || typeFilter !== 'all' ? undefined : 'إضافة مورد'} onAction={search || typeFilter !== 'all' ? undefined : () => setIsCreateOpen(true)} />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 text-start">المورد</th>
                  <th className="py-3.5 px-4 text-start">نوع الخدمة</th>
                  <th className="py-3.5 px-4 text-start">مسؤول الاتصال</th>
                  <th className="py-3.5 px-4 text-start">الرقم الضريبي</th>
                  <th className="py-3.5 px-4 text-start">الحالة</th>
                  <th className="py-3.5 px-4 text-start">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filtered.map((v) => {
                  const meta = VENDOR_TYPE_META[v.vendorType] || { label: v.vendorType, icon: Truck, classes: 'bg-slate-100 text-slate-600' };
                  const Icon = meta.icon;
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">
                            {TYPE_ICONS[v.vendorType] || '🏢'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block text-sm">{v.name}</span>
                            {v.contactEmail && <span className="text-[11px] text-slate-400 font-mono" dir="ltr">{v.contactEmail}</span>}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${meta.classes}`}>
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {v.contactName ? (
                          <div className="text-xs space-y-0.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">{v.contactName}</span>
                            {v.contactPhone && <span className="text-[11px] text-slate-400 font-mono" dir="ltr">{v.contactPhone}</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-xs font-mono">
                        {v.taxId ? <span className="font-semibold text-slate-800 dark:text-slate-200">{v.taxId}</span> : <span className="text-slate-400">—</span>}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          v.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {v.isActive ? 'نشط' : 'معطّل'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          {v.contactPhone && (
                            <a
                              href={`tel:${v.contactPhone}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
                              title="اتصال مباشر"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                          {v.contactEmail && (
                            <a
                              href={`mailto:${v.contactEmail}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="مراسلة"
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => setEditingVendor(v)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#FF5E1E] hover:bg-orange-50 dark:hover:bg-orange-950/30 transition cursor-pointer"
                            title="تعديل بيانات المورد"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              setBusyId(v.id);
                              try {
                                await api.patch(`/masters/vendors/${v.id}`, { isActive: !v.isActive });
                                setVendors((prev) => prev.map((x) => (x.id === v.id ? { ...x, isActive: !v.isActive } : x)));
                              } catch (err: any) {
                                alert(err?.message || 'تعذر تغيير حالة المورد');
                              } finally {
                                setBusyId(null);
                              }
                            }}
                            disabled={busyId === v.id}
                            className={`p-1.5 rounded-lg transition cursor-pointer disabled:opacity-50 ${
                              v.isActive ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            }`}
                            title={v.isActive ? 'إيقاف المورد (لن يظهر في قوائم الاختيار)' : 'إعادة تفعيل المورد'}
                          >
                            <Power className={`w-4 h-4 ${busyId === v.id ? 'animate-pulse' : ''}`} />
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
      )}

      {/* Create/Edit Vendor Modal */}
      {isCreateOpen && (
        <CreateVendorModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(newV) => setVendors((prev) => [newV, ...prev])}
        />
      )}

      {editingVendor && (
        <CreateVendorModal
          isOpen={!!editingVendor}
          onClose={() => setEditingVendor(null)}
          initial={editingVendor}
          onSuccess={(v) => setVendors((prev) => prev.map((x) => (x.id === v.id ? v : x)))}
        />
      )}
    </div>
  );
};

/* ── Create Vendor Modal (posts to /masters/vendors) ─────────── */
const CreateVendorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initial?: Vendor | null;
  onSuccess: (v: Vendor) => void;
}> = ({ isOpen, onClose, initial, onSuccess }) => {
  const [form, setForm] = useState({
    name: initial?.name || '',
    vendorType: (initial?.vendorType || 'trucking') as Vendor['vendorType'],
    taxId: initial?.taxId || '',
    contactName: initial?.contactName || '',
    contactPhone: initial?.contactPhone || '',
    contactEmail: initial?.contactEmail || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!initial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        name: form.name.trim(),
        vendorType: form.vendorType,
      };
      if (form.taxId.trim()) payload.taxId = form.taxId.trim();
      if (form.contactName.trim()) payload.contactName = form.contactName.trim();
      if (form.contactPhone.trim()) payload.contactPhone = form.contactPhone.trim();
      if (form.contactEmail.trim()) payload.contactEmail = form.contactEmail.trim();

      const saved: any = isEdit
        ? await api.patch(`/masters/vendors/${initial!.id}`, payload)
        : await api.post('/masters/vendors', payload);

      onSuccess({
        id: saved?.id || initial?.id || String(Date.now()),
        name: saved?.name ?? payload.name,
        vendorType: saved?.vendorType ?? payload.vendorType,
        taxId: saved?.taxId ?? payload.taxId ?? null,
        contactName: saved?.contactName ?? payload.contactName ?? null,
        contactPhone: saved?.contactPhone ?? payload.contactPhone ?? null,
        contactEmail: saved?.contactEmail ?? payload.contactEmail ?? null,
        isActive: saved?.isActive !== false,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'تعذر حفظ المورد — حاول مجدداً');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة مورد لوجستي جديد" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">اسم المورد أو الشركة *</label>
          <input
            type="text"
            required
            placeholder="مثال: شركة السلام للنقل والتخليص"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </div>

        {/* Vendor type — single select from the real enum */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <span className="font-bold text-slate-800 dark:text-slate-200 block">نوع الخدمة *</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(VENDOR_TYPE_META) as Vendor['vendorType'][]).map((t) => {
              const meta = VENDOR_TYPE_META[t];
              const Icon = meta.icon;
              return (
                <label
                  key={t}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer font-bold transition ${
                    form.vendorType === t
                      ? 'border-[#FF5E1E] bg-orange-500/10 text-[#FF5E1E]'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="vendorType"
                    checked={form.vendorType === t}
                    onChange={() => setForm({ ...form, vendorType: t })}
                    className="sr-only"
                  />
                  <Icon className="w-4 h-4" />
                  {meta.label}
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">الرقم الضريبي</label>
            <input
              type="text"
              placeholder="EG-TAX-000-000"
              value={form.taxId}
              onChange={(e) => setForm({ ...form, taxId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">مسؤول الاتصال</label>
            <input
              type="text"
              placeholder="اسم الشخص المسؤول"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">هاتف المسؤول</label>
            <input
              type="text"
              dir="ltr"
              placeholder="+20 100 000 0000"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              placeholder="vendor@company.com"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
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
            <span>{saving ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'حفظ المورد'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
