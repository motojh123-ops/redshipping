import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, Phone, Mail, Building2, ShieldCheck, Download,
  Search, Eye, Loader2, AlertCircle, Warehouse, Anchor, Bug, ClipboardCheck, Pencil, Power,
  Paperclip, FileText, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { exportToCsv } from '../../utils/exportUtils';
import { api } from '../../services/api';

/** Shape returned by GET/POST /masters/vendors (see Prisma Vendor model — hierarchy + services + registrations) */
interface VendorContact {
  id?: string;
  name: string;
  title?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  isPrimary?: boolean;
  notes?: string | null;
}

interface VendorBranch {
  id?: string;
  code?: string | null;
  name: string;
  address?: string | null;
  city?: string | null;
  countryCode?: string | null;
  phone?: string | null;
  email?: string | null;
  contacts?: VendorContact[];
}

interface Vendor {
  id: string;
  name: string;
  vendorType: 'trucking' | 'clearance' | 'port_services' | 'warehousing' | 'fumigation' | 'inspection';
  taxId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  phone?: string | null;
  commercialReg?: string | null;
  crExpiry?: string | null;
  taxCardNumber?: string | null;
  taxCardExpiry?: string | null;
  services?: string[];
  branches?: VendorBranch[];
  contacts?: VendorContact[];
  isActive: boolean;
}

/** Multi-select service options (spec: خدمات متعددة لكل مورد) */
const SERVICE_OPTIONS = [
  'نقل بري (تريلات)',
  'نقل مبرد',
  'تخليص جمركي',
  'تخزين وخدمات',
  'تبخير شحنات',
  'فحص ومعاينة',
  'مناولة وتشييع',
  'خدمات الميناء',
];

const toInputDate = (iso?: string | null) => (iso ? String(iso).slice(0, 10) : '');

/** Days-remaining chip for expiry dates (feeds the Alarms engine) */
const daysUntil = (iso?: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null);

const ExpiryChip: React.FC<{ label: string; date?: string | null }> = ({ label, date }) => {
  const days = daysUntil(date);
  if (days === null) return null;
  const level =
    days < 0 ? 'bg-red-500/10 text-red-600 border-red-500/30' : days <= 30 ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${level}`}>
      {label}: {new Date(date as string).toLocaleDateString('en-GB')}
      {days < 0 ? ' (منتهي)' : ` (${days} يوم)`}
    </span>
  );
};

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
      { header: 'الخدمات', accessor: (v: Vendor) => (v.services || []).join(' | ') || '—' },
      { header: 'السجل التجاري', accessor: (v: Vendor) => v.commercialReg || '—' },
      { header: 'انتهاء السجل', accessor: (v: Vendor) => toInputDate(v.crExpiry) || '—' },
      { header: 'البطاقة الضريبية', accessor: (v: Vendor) => v.taxCardNumber || '—' },
      { header: 'انتهاء البطاقة', accessor: (v: Vendor) => toInputDate(v.taxCardExpiry) || '—' },
      { header: 'عدد الفروع', accessor: (v: Vendor) => String((v.branches || []).length) },
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
                  <th className="py-3.5 px-4 text-start">الخدمات والاعتمادات</th>
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
                        <div className="space-y-1 max-w-xs">
                          {(v.services || []).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {(v.services || []).slice(0, 4).map((s) => (
                                <span key={s} className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                                  {s}
                                </span>
                              ))}
                              {(v.services || []).length > 4 && (
                                <span className="text-[10px] text-slate-400">+{v.services!.length - 4}</span>
                              )}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1">
                            <ExpiryChip label="سجل" date={v.crExpiry} />
                            <ExpiryChip label="بطاقة" date={v.taxCardExpiry} />
                          </div>
                          {(v.branches || []).length > 0 && (
                            <span className="text-[10px] text-slate-400 block">
                              {(v.branches || []).length} فرع • {((v.branches || []).reduce((acc: number, b) => acc + (b.contacts?.length || 0), 0) + (v.contacts || []).length)} مسؤول
                            </span>
                          )}
                        </div>
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
    address: initial?.address || '',
    phone: initial?.phone || '',
    commercialReg: initial?.commercialReg || '',
    crExpiry: toInputDate(initial?.crExpiry),
    taxCardNumber: initial?.taxCardNumber || '',
    taxCardExpiry: toInputDate(initial?.taxCardExpiry),
  });
  const [services, setServices] = useState<string[]>(initial?.services || []);
  const [customService, setCustomService] = useState('');
  const [branches, setBranches] = useState<VendorBranch[]>(
    (initial?.branches || []).map((b) => ({ ...b, contacts: b.contacts ? [...b.contacts] : [] })),
  );
  const [contacts, setContacts] = useState<VendorContact[]>(
    (initial?.contacts || []).map((c) => ({ ...c })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!initial;

  // ── المرفقات: صور السجل التجاري / البطاقة الضريبية ──
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docCategory, setDocCategory] = useState('commercial_reg');

  const DOC_CATEGORIES: Array<{ value: string; label: string }> = [
    { value: 'commercial_reg', label: 'السجل التجاري' },
    { value: 'tax_card', label: 'البطاقة الضريبية' },
    { value: 'other', label: 'أخرى' },
  ];

  const loadDocs = async () => {
    if (!initial?.id) return;
    try {
      const res: any = await api.get('/masters/documents', {
        params: { entityType: 'vendor', entityId: initial.id },
      });
      setDocs(Array.isArray(res) ? res : res?.data || []);
    } catch {
      setDocs([]);
    }
  };

  useEffect(() => {
    loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

  const handleUploadDoc = async () => {
    if (!docFile || !initial?.id) return;
    setUploading(true);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(docFile);
      });
      await api.post('/masters/documents', {
        entityType: 'vendor',
        entityId: initial.id,
        category: docCategory,
        fileName: docFile.name,
        mimeType: docFile.type || 'application/octet-stream',
        dataBase64,
      });
      setDocFile(null);
      const el = document.getElementById('vendor-doc-file') as HTMLInputElement | null;
      if (el) el.value = '';
      toast.success('تم رفع المرفق بنجاح');
      await loadDocs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'تعذر رفع المرفق');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDoc = async (docId: string) => {
    try {
      const res: any = await api.get(`/masters/documents/${docId}/download`);
      const payload = res?.data || res;
      const binary = atob(payload.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: payload.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = payload.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'تعذر تحميل المرفق');
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm('حذف هذا المرفق؟')) return;
    try {
      await api.delete(`/masters/documents/${docId}`);
      toast.success('تم حذف المرفق');
      await loadDocs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'تعذر حذف المرفق');
    }
  };

  const toggleService = (s: string) =>
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const addCustomService = () => {
    const s = customService.trim();
    if (s && !services.includes(s)) setServices((prev) => [...prev, s]);
    setCustomService('');
  };

  const updBranch = (i: number, patch: Partial<VendorBranch>) =>
    setBranches((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const delBranch = (i: number) => setBranches((prev) => prev.filter((_, idx) => idx !== i));
  const addBranch = () =>
    setBranches((prev) => [...prev, { name: '', code: '', city: '', countryCode: '', phone: '', email: '', address: '', contacts: [] }]);
  const addBranchContact = (i: number) =>
    setBranches((prev) => prev.map((b, idx) => (idx === i ? { ...b, contacts: [...(b.contacts || []), { name: '', title: '', phone: '', mobile: '', email: '' }] } : b)));
  const updBranchContact = (bi: number, ci: number, patch: Partial<VendorContact>) =>
    setBranches((prev) =>
      prev.map((b, idx) =>
        idx === bi ? { ...b, contacts: (b.contacts || []).map((c, jdx) => (jdx === ci ? { ...c, ...patch } : c)) } : b,
      ),
    );
  const delBranchContact = (bi: number, ci: number) =>
    setBranches((prev) => prev.map((b, idx) => (idx === bi ? { ...b, contacts: (b.contacts || []).filter((_, jdx) => jdx !== ci) } : b)));

  const addContact = () => setContacts((prev) => [...prev, { name: '', title: '', phone: '', mobile: '', email: '' }]);
  const updContact = (i: number, patch: Partial<VendorContact>) => setContacts((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const delContact = (i: number) => setContacts((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('اسم المورد مطلوب');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        vendorType: form.vendorType,
        services,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        commercialReg: form.commercialReg.trim() || null,
        crExpiry: form.crExpiry || null,
        taxCardNumber: form.taxCardNumber.trim() || null,
        taxCardExpiry: form.taxCardExpiry || null,
        // Multi-level hierarchy: Branch → Persons in Charge (spec Session 1)
        branches: branches
          .filter((b) => b.name.trim())
          .map((b) => ({
            name: b.name.trim(),
            code: b.code?.trim() || null,
            city: b.city?.trim() || null,
            countryCode: b.countryCode?.trim().toUpperCase() || null,
            phone: b.phone?.trim() || null,
            email: b.email?.trim() || null,
            address: b.address?.trim() || null,
            contacts: (b.contacts || []).filter((c) => c.name.trim()).map((c) => ({
              name: c.name.trim(),
              title: c.title?.trim() || null,
              phone: c.phone?.trim() || null,
              mobile: c.mobile?.trim() || null,
              email: c.email?.trim() || null,
            })),
          })),
        contacts: contacts
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name.trim(),
            title: c.title?.trim() || null,
            phone: c.phone?.trim() || null,
            mobile: c.mobile?.trim() || null,
            email: c.email?.trim() || null,
          })),
      };
      if (form.taxId.trim()) payload.taxId = form.taxId.trim();
      if (form.contactName.trim()) payload.contactName = form.contactName.trim();
      if (form.contactPhone.trim()) payload.contactPhone = form.contactPhone.trim();
      if (form.contactEmail.trim()) payload.contactEmail = form.contactEmail.trim();

      const saved: any = isEdit
        ? await api.patch(`/masters/vendors/${initial!.id}`, payload)
        : await api.post('/masters/vendors', payload);

      // The API returns the full vendor (with branches + contacts) — pass it through
      onSuccess(saved as Vendor);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'تعذر حفظ المورد — حاول مجدداً');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'تعديل بيانات المورد' : 'إضافة مورد لوجستي جديد'}
      subtitle="الخدمات المتعددة + الاعتمادات الرسمية وتواريخ انتهائها + شجرة الفروع والمسؤولين"
      maxWidth="lg"
    >
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

        {/* Multi-select services (spec: خدمات متعددة) */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <span className="font-bold text-slate-800 dark:text-slate-200 block">الخدمات المقدمة (اختيار متعدد)</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SERVICE_OPTIONS.map((s) => {
              const active = services.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleService(s)}
                  className={`px-3 py-2 rounded-xl border text-start font-bold transition ${
                    active
                      ? 'border-[#FF5E1E] bg-orange-500/10 text-[#FF5E1E]'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  {active ? '✓ ' : '+ '}
                  {s}
                </button>
              );
            })}
          </div>
          {services.filter((s) => !SERVICE_OPTIONS.includes(s)).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {services
                .filter((s) => !SERVICE_OPTIONS.includes(s))
                .map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                    {s}
                    <button type="button" onClick={() => toggleService(s)} className="text-red-500 hover:text-red-700">✕</button>
                  </span>
                ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={customService}
              onChange={(e) => setCustomService(e.target.value)}
              placeholder="خدمة أخرى غير موجودة بالقائمة..."
              className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <button
              type="button"
              onClick={addCustomService}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              إضافة
            </button>
          </div>
        </div>
        {/* Official registrations + expiry dates (spec: اعتمادات رسمية + تنبيهات الانتهاء) */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <span className="font-bold text-slate-800 dark:text-slate-200 block">الاعتمادات الرسمية وتواريخ الانتهاء</span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">السجل التجاري</label>
              <input
                type="text"
                dir="ltr"
                placeholder="CR-123456"
                value={form.commercialReg}
                onChange={(e) => setForm({ ...form, commercialReg: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">انتهاء السجل التجاري</label>
              <input
                type="date"
                dir="ltr"
                value={form.crExpiry}
                onChange={(e) => setForm({ ...form, crExpiry: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">البطاقة الضريبية</label>
              <input
                type="text"
                dir="ltr"
                placeholder="TAX-654-321"
                value={form.taxCardNumber}
                onChange={(e) => setForm({ ...form, taxCardNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">انتهاء البطاقة الضريبية</label>
              <input
                type="date"
                dir="ltr"
                value={form.taxCardExpiry}
                onChange={(e) => setForm({ ...form, taxCardExpiry: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">العنوان</label>
              <input
                type="text"
                placeholder="مقر الشركة / المخزن"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">هاتف الشركة</label>
              <input
                type="text"
                dir="ltr"
                placeholder="+20 2 0000 0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          </div>
        </div>
        {/* Branches tree: Branch → Persons in Charge (spec: الهيكل الشجري) */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200">الفروع والمعاملون بالفرع</span>
            <button
              type="button"
              onClick={addBranch}
              className="px-3 py-1.5 rounded-xl bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/30 font-bold hover:bg-[#FF5E1E]/20 transition"
            >
              + إضافة فرع
            </button>
          </div>
          {branches.length === 0 && (
            <p className="text-[11px] text-slate-400">لا توجد فروع — يمكن إبقاء المورد بدون تفريعات</p>
          )}
          {branches.map((b, bi) => (
            <div key={bi} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="اسم الفرع *"
                  value={b.name}
                  onChange={(e) => updBranch(bi, { name: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                />
                <input
                  type="text"
                  placeholder="كود الفرع"
                  value={b.code || ''}
                  onChange={(e) => updBranch(bi, { code: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
                <input
                  type="text"
                  placeholder="المدينة"
                  value={b.city || ''}
                  onChange={(e) => updBranch(bi, { city: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  dir="ltr"
                  maxLength={2}
                  placeholder="كود الدولة (EG)"
                  value={b.countryCode || ''}
                  onChange={(e) => updBranch(bi, { countryCode: e.target.value.toUpperCase() })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
                <input
                  type="text"
                  dir="ltr"
                  placeholder="هاتف الفرع"
                  value={b.phone || ''}
                  onChange={(e) => updBranch(bi, { phone: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
                <input
                  type="email"
                  dir="ltr"
                  placeholder="branch@vendor.com"
                  value={b.email || ''}
                  onChange={(e) => updBranch(bi, { email: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div className="space-y-2 border-t border-dashed border-slate-200 dark:border-slate-700 pt-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">مسؤولو الفرع:</span>
                {(b.contacts || []).map((c, ci) => (
                  <div key={ci} className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 items-center">
                    <input
                      type="text"
                      placeholder="الاسم *"
                      value={c.name}
                      onChange={(e) => updBranchContact(bi, ci, { name: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      placeholder="المسمى"
                      value={c.title || ''}
                      onChange={(e) => updBranchContact(bi, ci, { title: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="هاتف"
                      value={c.phone || ''}
                      onChange={(e) => updBranchContact(bi, ci, { phone: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="موبايل"
                      value={c.mobile || ''}
                      onChange={(e) => updBranchContact(bi, ci, { mobile: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                    <input
                      type="email"
                      dir="ltr"
                      placeholder="بريد"
                      value={c.email || ''}
                      onChange={(e) => updBranchContact(bi, ci, { email: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => delBranchContact(bi, ci)}
                      className="px-2 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold transition"
                      title="حذف المسؤول"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addBranchContact(bi)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-brand-600 border border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition"
                  >
                    + مسؤول بالفرع
                  </button>
                  <button
                    type="button"
                    onClick={() => delBranch(bi)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-500 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                  >
                    حذف الفرع
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Vendor-level persons in charge (outside branches) */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200">الأشخاص المسؤولون (مستوى الشركة)</span>
            <button
              type="button"
              onClick={addContact}
              className="px-3 py-1.5 rounded-xl bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/30 font-bold hover:bg-[#FF5E1E]/20 transition"
            >
              + إضافة مسؤول
            </button>
          </div>
          {contacts.length === 0 && (
            <p className="text-[11px] text-slate-400">لا يوجد مسؤولون على مستوى الشركة — يمكن الاكتفاء بمسؤولي الفروع</p>
          )}
          {contacts.map((c, ci) => (
            <div key={ci} className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 items-center">
              <input
                type="text"
                placeholder="الاسم *"
                value={c.name}
                onChange={(e) => updContact(ci, { name: e.target.value })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                placeholder="المسمى"
                value={c.title || ''}
                onChange={(e) => updContact(ci, { title: e.target.value })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                dir="ltr"
                placeholder="هاتف"
                value={c.phone || ''}
                onChange={(e) => updContact(ci, { phone: e.target.value })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <input
                type="text"
                dir="ltr"
                placeholder="موبايل"
                value={c.mobile || ''}
                onChange={(e) => updContact(ci, { mobile: e.target.value })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <input
                type="email"
                dir="ltr"
                placeholder="بريد"
                value={c.email || ''}
                onChange={(e) => updContact(ci, { email: e.target.value })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <button
                type="button"
                onClick={() => delContact(ci)}
                className="px-2 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold transition"
                title="حذف المسؤول"
              >
                ✕
              </button>
            </div>
          ))}
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

        {isEdit && initial && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0E121A] border border-slate-100 dark:border-[#1E2638] space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-[#FF5E1E]" />
              المرفقات والسجلات الرسمية
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="vendor-doc-file"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                className="flex-1 min-w-52 text-[11px] text-slate-500 dark:text-slate-300 file:ms-2 file:rounded-lg file:border-0 file:px-2.5 file:py-1.5 file:bg-slate-200 dark:file:bg-slate-700 file:text-[11px] file:font-bold file:cursor-pointer"
              />
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold"
              >
                {DOC_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleUploadDoc}
                disabled={uploading || !docFile}
                className="px-3 py-1.5 rounded-lg bg-[#FF5E1E] hover:bg-[#EA580C] disabled:opacity-50 text-white text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                {uploading ? 'جارٍ الرفع...' : 'رفع المرفق'}
              </button>
            </div>
            {docs.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                لا توجد مرفقات — ارفع صورة السجل التجاري أو البطاقة الضريبية (حتى 4 ميجابايت)
              </p>
            ) : (
              <div className="space-y-1.5">
                {docs.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate" dir="ltr">
                        {d.fileName}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {Math.max(1, Math.round((d.fileSize || 0) / 1024))} KB
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 shrink-0">
                        {DOC_CATEGORIES.find((c) => c.value === d.category)?.label || d.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title="تحميل"
                        onClick={() => handleDownloadDoc(d.id)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-sky-500 transition flex items-center justify-center cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        title="حذف"
                        onClick={() => handleDeleteDoc(d.id)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:text-red-500 transition flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
