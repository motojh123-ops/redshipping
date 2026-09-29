import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Ship, Plus, ExternalLink, Phone, Globe, Download, TrendingUp,
  Compass, Mail, ChevronDown, User, Search, Pencil, Loader2, CheckCircle2, AlertCircle, X, Power, Building2
} from 'lucide-react';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { exportToCsv } from '../../utils/exportUtils';
import { api } from '../../services/api';

/** Shape returned by GET/POST /masters/shipping-lines (see Prisma ShippingLine model — hierarchy included) */
interface LineContact {
  id?: string;
  name: string;
  title?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  isPrimary?: boolean;
}

interface LineBranch {
  id?: string;
  code?: string | null;
  name: string;
  address?: string | null;
  city?: string | null;
  countryCode?: string | null;
  phone?: string | null;
  email?: string | null;
  contacts?: LineContact[];
}

interface ShippingLine {
  id: string;
  name: string;
  scac?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  branches?: LineBranch[];
  contacts?: LineContact[];
  isActive: boolean;
}

const LINE_COLORS = ['#006CB7', '#FF5E1E', '#0F766E', '#7C3AED', '#DC2626', '#0369A1', '#B45309', '#047857'];

export const ShippingLinesPage: React.FC = () => {
  const [lines, setLines] = useState<ShippingLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<ShippingLine | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadLines = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res: any = await api.get('/masters/shipping-lines', { params: { includeInactive: 'true' } });
      const data = Array.isArray(res) ? res : res?.data;
      setLines(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setLoadError(err?.message || 'تعذر تحميل الخطوط الملاحية من الخادم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLines();
  }, []);

  const filtered = lines.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      (l.scac || '').toLowerCase().includes(q) ||
      (l.contactName || '').toLowerCase().includes(q) ||
      (l.contactEmail || '').toLowerCase().includes(q)
    );
  });

  const handleExportLines = () => {
    exportToCsv('red_shipping_lines', filtered, [
      { header: 'اسم الخط الملاحي', accessor: (l: ShippingLine) => l.name },
      { header: 'الكود (SCAC)', accessor: (l: ShippingLine) => l.scac || '—' },
      { header: 'مسؤول الاتصال', accessor: (l: ShippingLine) => l.contactName || '—' },
      { header: 'البريد الإلكتروني', accessor: (l: ShippingLine) => l.contactEmail || '—' },
      { header: 'رقم الهاتف', accessor: (l: ShippingLine) => l.contactPhone || '—' },
      { header: 'الموقع الإلكتروني', accessor: (l: ShippingLine) => l.website || '—' },
      { header: 'عدد المكاتب/الفروع', accessor: (l: ShippingLine) => String((l.branches || []).length) },
      { header: 'عدد المسؤولين', accessor: (l: ShippingLine) => String(((l.branches || []).reduce((acc: number, b) => acc + (b.contacts?.length || 0), 0) + (l.contacts || []).length)) },
      { header: 'الحالة', accessor: (l: ShippingLine) => (l.isActive ? 'نشط' : 'غير نشط') },
    ]);
  };

  return (
    <div className="space-y-7">
      {/* ── Header ── */}
      <div className="relative rounded-3xl overflow-hidden bg-white/95 dark:bg-[#121620]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-white p-6 sm:p-8 shadow-sm transition-all duration-300">
        <div className="absolute top-0 end-0 w-96 h-96 bg-gradient-to-bl from-[#FF5E1E]/10 via-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 start-0 w-80 h-80 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#FF5E1E] text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#FF5E1E] animate-pulse" />
              <span>الخطوط والتوكيلات الملاحية العالمية • Ocean Carriers</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              إدارة خطوط الملاحة البحرية والتوكيلات
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              دليل التوكيلات الملاحية (MSC, Maersk, CMA CGM, Hapag-Lloyd, ONE, COSCO)، مسؤولي الحجوزات والمبيعات، الربط المباشر مع جداول الإبحار وتتبع الحاويات.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                {lines.length} خط ملاحي وتوكيل معتمد
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                متابعة أذون التسليم D/O والمهل المجانية
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportLines}
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
              <span>إضافة خط ملاحي</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث باسم الخط الملاحي، الكود، أو مسؤول الاتصال..." className="w-full" />
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin" />
          <span className="text-xs font-bold">جارٍ تحميل الخطوط الملاحية...</span>
        </div>
      ) : loadError ? (
        <div className="p-5 rounded-3xl bg-red-500/5 border border-red-500/20 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <div>
            <h3 className="text-sm font-black text-red-600 dark:text-red-400 mb-1">تعذر تحميل البيانات</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{loadError}</p>
            <button
              onClick={loadLines}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Ship} title={search ? 'لا نتائج مطابقة للبحث' : 'لا توجد خطوط ملاحة'} description={search ? 'جرب كلمة بحث أخرى' : 'أضف خطوط الملاحة المتعامل معها'} actionLabel={search ? undefined : 'إضافة خط'} onAction={search ? undefined : () => setIsCreateOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((line, idx) => (
            <div key={line.id} className="p-5 rounded-2xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] shadow-sm hover:border-[#FF5E1E]/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-start gap-3.5 mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md"
                    style={{ backgroundColor: LINE_COLORS[idx % LINE_COLORS.length] }}
                  >
                    {(line.scac || line.name).slice(0, 4)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{line.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono font-bold text-[#FF5E1E]">{line.scac || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Company details — only fields that exist in the database */}
                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-[#262E40]">
                  {line.contactName && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{line.contactName}</span>
                    </div>
                  )}
                  {line.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate" dir="ltr">{line.contactEmail}</span>
                    </div>
                  )}
                  {line.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span dir="ltr">{line.contactPhone}</span>
                    </div>
                  )}
                  {line.website && (
                    <a
                      href={line.website.startsWith('http') ? line.website : `https://${line.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[#FF5E1E] hover:underline transition"
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate" dir="ltr">{line.website.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}
                  {(line.branches || []).length > 0 && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {(line.branches || []).length} مكتب/فرع •{' '}
                        {((line.branches || []).reduce((acc: number, b) => acc + (b.contacts?.length || 0), 0) + (line.contacts || []).length)} مسؤول
                      </span>
                    </div>
                  )}
                  {!line.contactName && !line.contactEmail && !line.contactPhone && !line.website && (line.branches || []).length === 0 && (
                    <span className="text-[11px] text-slate-400">لا توجد بيانات اتصال مسجلة — أضفها من زر التعديل.</span>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#262E40] flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  line.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-slate-100 dark:bg-[#1E2536] text-slate-500'
                }`}>
                  {line.isActive ? 'نشط' : 'غير نشط'}
                </span>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/pricing?carrier=${line.scac || ''}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#FF5E1E] bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/20 transition"
                    title="استعراض أسعار ونوالين الشحن المتاحة لهذا الخط"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>مصفوفة النولون</span>
                  </Link>

                  <Link
                    to={`/tracking?carrier=${line.scac || ''}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#22293A] transition"
                    title="تتبع حاويات هذا الخط"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>تتبع</span>
                  </Link>

                  <button
                    onClick={() => setEditingLine(line)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#FF5E1E] hover:bg-orange-500/10 transition cursor-pointer"
                    title="تعديل بيانات الخط"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={async () => {
                      setBusyId(line.id);
                      try {
                        await api.patch(`/masters/shipping-lines/${line.id}`, { isActive: !line.isActive });
                        setLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, isActive: !line.isActive } : x)));
                      } catch (err: any) {
                        alert(err?.message || 'تعذر تغيير حالة الخط الملاحي');
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    disabled={busyId === line.id}
                    className={`p-1.5 rounded-lg transition cursor-pointer disabled:opacity-50 ${
                      line.isActive ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                    }`}
                    title={line.isActive ? 'إيقاف الخط (لن يظهر في قوائم الاختيار)' : 'إعادة تفعيل الخط'}
                  >
                    <Power className={`w-3.5 h-3.5 ${busyId === line.id ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Shipping Line Modal */}
      {isCreateOpen && (
        <CreateShippingLineModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(newLine) => setLines((prev) => [newLine, ...prev])}
        />
      )}

      {editingLine && (
        <CreateShippingLineModal
          isOpen={!!editingLine}
          onClose={() => setEditingLine(null)}
          initial={editingLine}
          onSuccess={(l) => setLines((prev) => prev.map((x) => (x.id === l.id ? l : x)))}
        />
      )}
    </div>
  );
};

/* ── Create/Edit Shipping Line Modal (posts/patches /masters/shipping-lines) ── */
const CreateShippingLineModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initial?: ShippingLine | null;
  onSuccess: (line: ShippingLine) => void;
}> = ({ isOpen, onClose, initial, onSuccess }) => {
  const [form, setForm] = useState({
    name: initial?.name || '',
    scac: initial?.scac || '',
    contactName: initial?.contactName || '',
    contactEmail: initial?.contactEmail || '',
    contactPhone: initial?.contactPhone || '',
    website: initial?.website || '',
  });
  const [branches, setBranches] = useState<LineBranch[]>(
    (initial?.branches || []).map((b) => ({ ...b, contacts: b.contacts ? [...b.contacts] : [] })),
  );
  const [contacts, setContacts] = useState<LineContact[]>((initial?.contacts || []).map((c) => ({ ...c })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!initial;

  const updBranch = (i: number, patch: Partial<LineBranch>) =>
    setBranches((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const delBranch = (i: number) => setBranches((prev) => prev.filter((_, idx) => idx !== i));
  const addBranch = () =>
    setBranches((prev) => [...prev, { name: '', code: '', city: '', countryCode: '', phone: '', email: '', address: '', contacts: [] }]);
  const addBranchContact = (i: number) =>
    setBranches((prev) => prev.map((b, idx) => (idx === i ? { ...b, contacts: [...(b.contacts || []), { name: '', title: '', phone: '', mobile: '', email: '' }] } : b)));
  const updBranchContact = (bi: number, ci: number, patch: Partial<LineContact>) =>
    setBranches((prev) =>
      prev.map((b, idx) =>
        idx === bi ? { ...b, contacts: (b.contacts || []).map((c, jdx) => (jdx === ci ? { ...c, ...patch } : c)) } : b,
      ),
    );
  const delBranchContact = (bi: number, ci: number) =>
    setBranches((prev) => prev.map((b, idx) => (idx === bi ? { ...b, contacts: (b.contacts || []).filter((_, jdx) => jdx !== ci) } : b)));
  const addContact = () => setContacts((prev) => [...prev, { name: '', title: '', phone: '', mobile: '', email: '' }]);
  const updContact = (i: number, patch: Partial<LineContact>) => setContacts((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const delContact = (i: number) => setContacts((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        // Multi-level hierarchy: Line Office/Branch → Persons in Charge (spec Session 1)
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
      if (form.name.trim()) payload.name = form.name.trim();
      if (form.scac.trim()) payload.scac = form.scac.trim().toUpperCase();
      if (form.contactName.trim()) payload.contactName = form.contactName.trim();
      if (form.contactEmail.trim()) payload.contactEmail = form.contactEmail.trim();
      if (form.contactPhone.trim()) payload.contactPhone = form.contactPhone.trim();
      if (form.website.trim()) payload.website = form.website.trim().replace(/^https?:\/\//, '');

      const saved: any = isEdit
        ? await api.patch(`/masters/shipping-lines/${initial!.id}`, payload)
        : await api.post('/masters/shipping-lines', payload);
      // The API returns the full line (with branches + contacts) — pass it through
      onSuccess(saved as ShippingLine);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'تعذر حفظ الخط الملاحي — حاول مجدداً');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'تعديل بيانات الخط الملاحي' : 'إضافة خط ملاحي جديد'}
      subtitle="مكاتب الخط + شجرة المسؤولين عن الحجز والتسعير والمتابعة"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">اسم الخط الملاحي *</label>
            <input
              type="text"
              required
              placeholder="مثال: Yang Ming Marine Transport"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">الكود (SCAC) *</label>
            <input
              type="text"
              required
              placeholder="YMLU"
              value={form.scac}
              onChange={(e) => setForm({ ...form, scac: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">مسؤول الاتصال</label>
            <input
              type="text"
              placeholder="اسم موظف المبيعات أو الحجوزات"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">الهاتف المباشر</label>
            <input
              type="text"
              dir="ltr"
              placeholder="+20 100 000 0000"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              placeholder="egypt@yangming.com"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">الموقع الإلكتروني</label>
            <input
              type="text"
              dir="ltr"
              placeholder="www.yangming.com"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Branches tree: Line Office/Branch → Persons in Charge (spec: الهيكل الشجري) */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200">مكاتب الخط وفروعها</span>
            <button
              type="button"
              onClick={addBranch}
              className="px-3 py-1.5 rounded-xl bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/30 font-bold hover:bg-[#FF5E1E]/20 transition"
            >
              + إضافة مكتب/فرع
            </button>
          </div>
          {branches.length === 0 && (
            <p className="text-[11px] text-slate-400">لا توجد مكاتب — يمكن إدارة الخط على مستوى الشركة مباشرة</p>
          )}
          {branches.map((b, bi) => (
            <div key={bi} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="اسم المكتب/الفرع *"
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
                  placeholder="هاتف المكتب"
                  value={b.phone || ''}
                  onChange={(e) => updBranch(bi, { phone: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
                <input
                  type="email"
                  dir="ltr"
                  placeholder="office@line.com"
                  value={b.email || ''}
                  onChange={(e) => updBranch(bi, { email: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <div className="space-y-2 border-t border-dashed border-slate-200 dark:border-slate-700 pt-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">مسؤولو المكتب:</span>
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
                    + مسؤول بالمكتب
                  </button>
                  <button
                    type="button"
                    onClick={() => delBranch(bi)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-500 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                  >
                    حذف المكتب
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Line-level persons in charge (outside offices) */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200">الأشخاص المسؤولون (مستوى الخط)</span>
            <button
              type="button"
              onClick={addContact}
              className="px-3 py-1.5 rounded-xl bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/30 font-bold hover:bg-[#FF5E1E]/20 transition"
            >
              + إضافة مسؤول
            </button>
          </div>
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
              >
                ✕
              </button>
            </div>
          ))}
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
            <span>{saving ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'حفظ الخط الملاحي'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
