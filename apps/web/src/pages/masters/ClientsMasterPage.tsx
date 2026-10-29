import React, { useState, useEffect } from 'react';
import {
  Building2, Users, Plus, Search, Loader2, Phone, MapPin,
  FileText, Trash2, Paperclip, Pencil, AlertCircle, ChevronDown, ChevronUp,
  Download, ShieldCheck, Check, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';

/**
 * شاشة «العملاء الفعليون» في بورتال المرجعيات (§6 — Master Integration):
 * بوابة التحويل — يظهر هنا العملاء المحوَّلون من الـ CRM إلى عملاء فعليين.
 * هيكلية شجرية مطابقة للخطوط الملاحية والوكلاء والموردين:
 * فروع + مسؤولي كل فرع + مسؤولي الشركة (Persons in Charge) + اعتمادات رسمية + مرفقات قابلة لتعديل الاسم وتاريخ الصلاحية.
 */
export interface ClientContactRow {
  id?: string;
  branchId?: string | null;
  name: string;
  title?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  isPrimary?: boolean;
  notes?: string | null;
}

export interface ClientBranchRow {
  id?: string;
  name: string;
  address?: string | null;
  city?: string | null;
  countryCode?: string | null;
  phone?: string | null;
  email?: string | null;
  isLoadingAddress?: boolean;
  isActive?: boolean;
  contacts?: ClientContactRow[];
}

export interface MasterClient {
  id: string;
  name: string;
  nameAr?: string | null;
  tradeName?: string | null;
  status: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  personInCharge?: string | null;
  city?: string | null;
  country?: string | null;
  countryCode?: string | null;
  taxNumber?: string | null;
  commercialReg?: string | null;
  commercialRegExpiry?: string | null;
  taxCardNumber?: string | null;
  taxCardExpiry?: string | null;
  importerRegistryNumber?: string | null;
  importerRegistryExpiry?: string | null;
  convertedAt?: string | null;
  companyType?: { id: string; code: string; nameEn: string; nameAr?: string | null } | null;
  industrySector?: { id: string; code: string; nameEn: string; nameAr?: string | null } | null;
  cityRef?: { id: string; nameEn: string; nameAr?: string | null; countryCode?: string } | null;
  branches?: ClientBranchRow[];
  contacts?: ClientContactRow[];
  entityDocuments?: any[];
}

const toInputDate = (iso?: string | null) => (iso ? String(iso).slice(0, 10) : '');

/** Days-remaining chip — يغذي محرك التنبيهات (Alarms §7) */
const daysUntil = (iso?: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null);

export const ExpiryChip: React.FC<{ label: string; date?: string | null }> = ({ label, date }) => {
  const days = daysUntil(date);
  if (days === null) return null;
  const level =
    days < 0
      ? 'bg-red-500/10 text-red-600 border-red-500/30'
      : days <= 30
      ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
      : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${level}`}>
      {label}: {new Date(date as string).toLocaleDateString('en-GB')}
      {days < 0 ? ' (منتهي)' : ` (${days} يوم)`}
    </span>
  );
};

export const DOC_CATEGORIES = [
  { code: 'commercial_reg', label: 'السجل التجاري' },
  { code: 'tax_card', label: 'البطاقة الضريبية' },
  { code: 'importer_registry', label: 'سجل المستوردين' },
  { code: 'exporter_registry', label: 'سجل المصدرين' },
  { code: 'other', label: 'مستند رسمي آخر' },
];

export const ClientsMasterPage: React.FC = () => {
  const [clients, setClients] = useState<MasterClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<MasterClient | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/clients?status=active&full=tree');
      setClients(Array.isArray(res) ? res : res?.data || []);
    } catch {
      setClients([]);
      toast.error('تعذر تحميل العملاء الفعليين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filtered = clients.filter((cl) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      cl.name.toLowerCase().includes(q) ||
      (cl.nameAr || '').includes(search.trim()) ||
      (cl.city || '').includes(search.trim()) ||
      (cl.commercialReg || '').toLowerCase().includes(q) ||
      (cl.taxCardNumber || '').toLowerCase().includes(q) ||
      (cl.companyType?.nameAr || cl.companyType?.nameEn || '').toLowerCase().includes(q) ||
      (cl.industrySector?.nameAr || cl.industrySector?.nameEn || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-600" />
            العملاء الفعليون (Master Data)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            سجل العملاء المعتمدين في المرجعيات — إدارة الفروع، مسؤولي الاتصال (Persons in Charge)، والوثائق الرسمية وتواريخ انتهائها
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          {clients.length} عميل فعلي معتمد
        </div>
      </div>

      {/* ── بوابة التحويل (Confirmation Gate) ── */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          <strong>بوابة التحويل:</strong> عند انتقال العميل من الـ CRM إلى العملاء الفعليين، يمكنك إضافة أكثر من فرع (Branches) وأكثر من مسؤول اتصال (Persons in Charge) لكل فرع أو للشركة بنفس أوبشن الخطوط الملاحية والوكلاء، مع رفع المرفقات الرسمية (السجل التجاري والبطاقة الضريبية وغيرها) وتعديل اسم المرفق وتاريخ انتهاء الصلاحية.
        </p>
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-md">
        <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم (عربي/إنجليزي)، السجل التجاري، المدينة، القطاع..."
          className="w-full ps-10 pe-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-slate-900 dark:text-white"
        />
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="لا يوجد عملاء فعليون بعد"
          description="العملاء المعتمدون يُرحَّلون هنا من الـ CRM عند اعتماد العميل أو قبول أول عرض سعر"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((cl) => (
            <ClientPanel
              key={cl.id}
              client={cl}
              expanded={expandedId === cl.id}
              onToggle={() => setExpandedId(expandedId === cl.id ? null : cl.id)}
              onEditFull={() => setEditingClient(cl)}
              onChanged={fetchClients}
            />
          ))}
        </div>
      )}

      {editingClient && (
        <ActiveClientProfileModal
          client={editingClient}
          mode="edit"
          onClose={() => setEditingClient(null)}
          onSaved={() => {
            setEditingClient(null);
            fetchClients();
          }}
        />
      )}
    </div>
  );
};


/** لوحة العميل الفعلي — الهيكلية الشجرية المعتمدة في الموردين والخطوط والوكلاء (§6) */
const ClientPanel: React.FC<{
  client: MasterClient;
  expanded: boolean;
  onToggle: () => void;
  onEditFull: () => void;
  onChanged: () => void;
}> = ({ client: cl, expanded, onToggle, onEditFull, onChanged }) => {
  const [docs, setDocs] = useState<any[]>(cl.entityDocuments || []);
  const [showRegs, setShowRegs] = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [editingBranch, setEditingBranch] = useState<ClientBranchRow | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContactRow | null>(null);

  const fetchDocs = async () => {
    try {
      const res: any = await api.get('/masters/documents', { params: { entityType: 'client', entityId: cl.id } });
      setDocs(Array.isArray(res) ? res : res?.data || []);
    } catch {
      setDocs([]);
    }
  };

  useEffect(() => {
    if (expanded) fetchDocs();
  }, [expanded]);

  const regs: Array<{ key: string; label: string; num?: string | null; exp?: string | null }> = [
    { key: 'commercialReg', label: 'السجل التجاري', num: cl.commercialReg, exp: cl.commercialRegExpiry },
    { key: 'taxCard', label: 'البطاقة الضريبية', num: cl.taxCardNumber, exp: cl.taxCardExpiry },
    { key: 'importerRegistry', label: 'سجل المستوردين', num: cl.importerRegistryNumber, exp: cl.importerRegistryExpiry },
  ];
  const missingRegs = regs.filter((r) => !r.num).length;

  // Total persons in charge across company & branches
  const branchMap = new Map<string, string>((cl.branches || []).filter((b) => b.id).map((b) => [b.id as string, b.name]));
  const allContacts: ClientContactRow[] = cl.contacts || [];
  const totalContactsCount =
    allContacts.length > 0
      ? allContacts.length
      : (cl.branches || []).reduce((acc, b) => acc + (b.contacts?.length || 0), 0);

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* ── Summary row (expand on click) ── */}
      <div className="w-full p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-3 min-w-0 flex-1 text-start cursor-pointer"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-red-600 text-white flex items-center justify-center font-black shrink-0">
            {cl.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{cl.name}</span>
              {cl.nameAr && <span className="text-xs text-slate-500 dark:text-slate-400">({cl.nameAr})</span>}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">فعلي ✓</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
              {cl.companyType && <span>{cl.companyType.nameAr || cl.companyType.nameEn}</span>}
              {cl.industrySector && <span>• {cl.industrySector.nameAr || cl.industrySector.nameEn}</span>}
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {cl.cityRef?.nameAr || cl.cityRef?.nameEn || cl.city || '—'}
              </span>
              {cl.phone && (
                <span className="inline-flex items-center gap-1 font-mono" dir="ltr">
                  <Phone className="w-3 h-3" />
                  {cl.phone}
                </span>
              )}
              <span>فروع: {cl.branches?.length || 0} • مسؤولين (Persons in Charge): {totalContactsCount}</span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {missingRegs > 0 && (
            <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              {missingRegs} اعتماد ناقص
            </span>
          )}
          <button
            type="button"
            onClick={onEditFull}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF5E1E]/10 hover:bg-[#FF5E1E] text-[#FF5E1E] hover:text-white border border-[#FF5E1E]/30 text-xs font-bold transition cursor-pointer"
            title="تعديل الفروع والمسؤولين والاعتمادات والمرفقات"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تعديل الفروع والمسؤولين</span>
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 pt-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ── الاعتمادات الرسمية + ربط التنبيهات (§6-أ) ── */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> الاعتمادات الرسمية وتواريخ الصلاحية
              </h4>
              <button
                onClick={() => setShowRegs(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-brand-600 hover:text-white transition cursor-pointer"
              >
                <Pencil className="w-3 h-3" /> استكمال / تعديل
              </button>
            </div>
            {regs.map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-600 dark:text-slate-300">{r.label}</span>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className={`font-mono text-[11px] ${r.num ? 'text-slate-800 dark:text-slate-100' : 'text-amber-600'}`}>
                    {r.num || 'غير مستوفى'}
                  </span>
                  <ExpiryChip label="ينتهي" date={r.exp} />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800">
              تواريخ الانتهاء مربوطة بمحرك التنبيهات — إنذار تلقائي قبل 30 يومًا لتفادي إيقاف التخليص الجمركي.
            </p>
          </div>

          {/* ── الفروع وعناوين التحميل + مسؤولو كل فرع (§6-ب) ── */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-600" /> الفروع وعناوين التحميل ومسؤولوها
              </h4>
              <button
                onClick={() => setShowAddBranch(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-bold transition cursor-pointer"
              >
                <Plus className="w-3 h-3" /> إضافة فرع
              </button>
            </div>
            {(cl.branches || []).map((b) => (
              <div key={b.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs space-y-1.5 border border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800 dark:text-slate-100">{b.name}</span>
                      {b.isLoadingAddress && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600">مكان تحميل</span>
                      )}
                      {b.isActive === false && <span className="text-[9px] text-slate-400">(غير مفعّل)</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {b.city || ''}{b.countryCode ? ` (${b.countryCode})` : ''}{b.address ? ` — ${b.address}` : ''}{b.phone ? ` • ${b.phone}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingBranch(b)}
                      className="p-1 rounded text-slate-400 hover:text-brand-600 transition cursor-pointer"
                      title="تعديل الفرع ومسؤوليه"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`حذف الفرع «${b.name}»؟`)) return;
                        try {
                          await api.delete(`/clients/${cl.id}/branches/${b.id}`);
                          onChanged();
                        } catch (e: any) {
                          toast.error(e?.response?.data?.message || 'تعذر حذف الفرع');
                        }
                      }}
                      className="p-1 rounded text-slate-400 hover:text-red-500 transition cursor-pointer"
                      title="حذف الفرع"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {!!b.contacts?.length && (
                  <div className="pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5">
                    {b.contacts.map((bc, idx) => (
                      <span
                        key={bc.id || idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-700 dark:text-slate-300"
                      >
                        <Users className="w-2.5 h-2.5 text-sky-600" />
                        <strong>{bc.name}</strong>
                        {bc.title ? ` (${bc.title})` : ''}
                        {bc.mobile || bc.phone ? <span className="font-mono text-slate-400" dir="ltr">• {bc.mobile || bc.phone}</span> : null}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!cl.branches?.length && (
              <p className="text-[11px] text-slate-400">لا فروع — أضف المقر الرئيسي والفروع ومسؤولي كل فرع مثل الخطوط الملاحية والوكلاء.</p>
            )}
          </div>

          {/* ── جهات الاتصال / المسؤولون (Persons in Charge — §6-ب) ── */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-600" /> الأشخاص المسؤولون (Persons in Charge)
              </h4>
              <button
                onClick={() => setShowAddContact(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold transition cursor-pointer"
              >
                <Plus className="w-3 h-3" /> إضافة مسؤول
              </button>
            </div>
            {allContacts.map((ct) => (
              <div key={ct.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{ct.name}</span>
                    {ct.title && <span className="text-[10px] text-slate-500 dark:text-slate-400">({ct.title})</span>}
                    {ct.branchId && branchMap.get(ct.branchId) && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-500/10 text-brand-600">
                        فرع: {branchMap.get(ct.branchId)}
                      </span>
                    )}
                    {ct.isPrimary && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/10 text-sky-600">أساسي</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono" dir="ltr">
                    {ct.mobile || ct.phone ? <span>{ct.mobile || ct.phone}</span> : null}
                    {ct.email ? <span>• {ct.email}</span> : null}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingContact(ct)}
                    className="p-1 rounded text-slate-400 hover:text-sky-600 transition cursor-pointer"
                    title="تعديل بيانات المسؤول"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`حذف جهة الاتصال «${ct.name}»؟`)) return;
                      try {
                        await api.delete(`/clients/${cl.id}/contacts/${ct.id}`);
                        onChanged();
                      } catch (e: any) {
                        toast.error(e?.response?.data?.message || 'تعذر الحذف');
                      }
                    }}
                    className="p-1 rounded text-slate-400 hover:text-red-500 transition cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {!allContacts.length && (
              <p className="text-[11px] text-slate-400">لا جهات اتصال مسجلة — يمكنك إضافة أكثر من مسؤول (Person in Charge) للشركة والفروع.</p>
            )}
          </div>

          {/* ── المرفقات الرسمية (Attachments + Editable Name + Validity) ── */}
          <DocsSection clientId={cl.id} docs={docs} onRefresh={fetchDocs} />
        </div>
      )}

      {/* ── Modals ── */}
      {showRegs && (
        <RegistrationsModal client={cl} onClose={() => setShowRegs(false)} onSaved={() => { setShowRegs(false); onChanged(); }} />
      )}
      {(showAddBranch || editingBranch) && (
        <AddBranchModal
          clientId={cl.id}
          initial={editingBranch}
          onClose={() => { setShowAddBranch(false); setEditingBranch(null); }}
          onSaved={() => { setShowAddBranch(false); setEditingBranch(null); onChanged(); }}
        />
      )}
      {(showAddContact || editingContact) && (
        <AddContactModal
          clientId={cl.id}
          branches={cl.branches || []}
          initial={editingContact}
          onClose={() => { setShowAddContact(false); setEditingContact(null); }}
          onSaved={() => { setShowAddContact(false); setEditingContact(null); onChanged(); }}
        />
      )}
    </div>
  );
};


/** المرفقات الرسمية — رفع + تحديد/تعديل اسم الأتاتش + تاريخ الانتهاء + تحميل/حذف */
export const DocsSection: React.FC<{ clientId: string; docs: any[]; onRefresh: () => void }> = ({
  clientId,
  docs,
  onRefresh,
}) => {
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ attachmentName: '', category: 'commercial_reg', expiryDate: '' });
  const fileRef = React.useRef<HTMLInputElement>(null);

  // State for editing an existing attachment's name / category / expiryDate
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fileName: '', category: 'commercial_reg', expiryDate: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !form.attachmentName.trim()) {
      setForm((prev) => ({ ...prev, attachmentName: file.name }));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error('اختر الملف أولًا'); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error('الحد الأقصى 4 ميجابايت'); return; }
    setUploading(true);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]+,/, ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const customName = form.attachmentName.trim() || file.name;
      await api.post('/masters/documents', {
        entityType: 'client',
        entityId: clientId,
        category: form.category,
        fileName: customName,
        mimeType: file.type || 'application/octet-stream',
        dataBase64,
        expiryDate: form.expiryDate || undefined,
      });
      toast.success('تم رفع المستند بحفظ اسم المرفق وتاريخ انتهاء الصلاحية');
      if (fileRef.current) fileRef.current.value = '';
      setForm({ attachmentName: '', category: 'commercial_reg', expiryDate: '' });
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'تعذر رفع المستند');
    } finally {
      setUploading(false);
    }
  };

  const startEditDoc = (d: any) => {
    setEditingDocId(d.id);
    setEditForm({
      fileName: d.fileName || '',
      category: d.category || 'commercial_reg',
      expiryDate: toInputDate(d.expiryDate),
    });
  };

  const saveEditDoc = async (docId: string) => {
    if (!editForm.fileName.trim()) {
      toast.error('اسم المرفق مطلوب');
      return;
    }
    setSavingEdit(true);
    try {
      await api.patch(`/masters/documents/${docId}`, {
        fileName: editForm.fileName.trim(),
        category: editForm.category,
        expiryDate: editForm.expiryDate || null,
      });
      toast.success('تم تعديل اسم المرفق وبيانات الصلاحية بنجاح');
      setEditingDocId(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'تعذر تعديل المرفق');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDownload = async (docId: string) => {
    try {
      const res: any = await api.get(`/masters/documents/${docId}/download`);
      const payload = res?.data || res;
      const bin = atob(payload.data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: payload.mimeType }));
      const a = document.createElement('a');
      a.href = url;
      a.download = payload.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('تعذر تحميل المستند');
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white';

  return (
    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
        <Paperclip className="w-3.5 h-3.5 text-rose-600" /> المرفقات والوثائق الرسمية للعميل (Attachments + Expiration Date)
      </h4>

      <form onSubmit={handleUpload} className="space-y-2.5 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">1. اختر ملف الوثيقة (PDF / صورة — حتى 4MB)</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileChange}
              className="w-full text-[11px] text-slate-500 file:me-2 file:px-2.5 file:py-1.5 file:rounded-lg file:border-0 file:bg-white dark:file:bg-slate-800 file:text-xs file:font-bold file:cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">2. اسم الأتاتش / المرفق (قابل للتعديل) *</label>
            <input
              type="text"
              value={form.attachmentName}
              onChange={(e) => setForm({ ...form, attachmentName: e.target.value })}
              placeholder="مثال: السجل التجاري 2026 - شركة الدلتا"
              className={inputCls}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">3. تصنيف الوثيقة</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
              {DOC_CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">4. تاريخ انتهاء الصلاحية (Expiration Date)</label>
            <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="w-full px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-bold transition cursor-pointer"
          >
            {uploading ? 'جارٍ الرفع...' : '+ رفع وحفظ المرفق'}
          </button>
        </div>
      </form>

      {docs.length > 0 ? (
        <div className="space-y-2 pt-1">
          {docs.map((d: any) => {
            const isEditing = editingDocId === d.id;
            return (
              <div key={d.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-xs">
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">اسم الأتاتش / المرفق *</label>
                        <input
                          type="text"
                          value={editForm.fileName}
                          onChange={(e) => setEditForm({ ...editForm, fileName: e.target.value })}
                          className={inputCls}
                          placeholder="اسم المرفق..."
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">نوع المستند</label>
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className={inputCls}
                        >
                          {DOC_CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">تاريخ الانتهاء (Expiration Date)</label>
                        <input
                          type="date"
                          value={editForm.expiryDate}
                          onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingDocId(null)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <X className="w-3 h-3" /> إلغاء
                      </button>
                      <button
                        type="button"
                        disabled={savingEdit}
                        onClick={() => saveEditDoc(d.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" /> {savingEdit ? 'جارٍ الحفظ...' : 'حفظ التعديل'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 dark:text-slate-100 block truncate">{d.fileName}</span>
                        <span className="text-[10px] text-slate-500">
                          {DOC_CATEGORIES.find((c) => c.code === d.category)?.label || d.category}
                          {d.fileSize ? ` • ${(d.fileSize / 1024).toFixed(0)}KB` : ''}
                        </span>
                      </div>
                      {d.expiryDate ? (
                        <ExpiryChip label="ينتهي" date={d.expiryDate} />
                      ) : (
                        <span className="text-[10px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full font-semibold">
                          بدون تاريخ انتهاء
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditDoc(d)}
                        title="تعديل اسم الأتاتش أو تاريخ الانتهاء"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-600 hover:border-brand-400 text-[10px] font-bold transition cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>تعديل الاسم / التاريخ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(d.id)}
                        title="تحميل"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`حذف المستند «${d.fileName}»؟`)) return;
                          try { await api.delete(`/masters/documents/${d.id}`); onRefresh(); }
                          catch { toast.error('تعذر حذف المستند'); }
                        }}
                        title="حذف"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">لا مرفقات — ارفع صور السجل التجاري / البطاقة الضريبية / سجل المستوردين مع إمكانية تسمية كل مرفق وتحديد تاريخ انتهائه.</p>
      )}
    </div>
  );
};


/**
 * نافذة موحدة لاستكمال/تحويل العميل من الـ CRM إلى «العملاء الفعليين» أو تعديله بالكامل:
 * - تحتوي على نفس أوبشن الفروع (Branches) ومسؤولي كل فرع + مسؤولي الشركة (Persons in Charge) الموجود في الخطوط الملاحية والوكلاء
 * - وتحتوي على الاعتمادات الرسمية وتواريخ الانتهاء + المرفقات (Attachments) مع تعديل اسم المرفق وتاريخ الصلاحية
 */
export const ActiveClientProfileModal: React.FC<{
  client: MasterClient;
  mode?: 'convert' | 'edit';
  onClose: () => void;
  onSaved: (updated?: any) => void;
}> = ({ client: initial, mode = 'edit', onClose, onSaved }) => {
  const [loadingFull, setLoadingFull] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<any[]>(initial.entityDocuments || []);

  const [form, setForm] = useState({
    name: initial.name || '',
    nameAr: initial.nameAr || '',
    taxNumber: initial.taxNumber || '',
    commercialReg: initial.commercialReg || '',
    commercialRegExpiry: toInputDate(initial.commercialRegExpiry),
    taxCardNumber: initial.taxCardNumber || '',
    taxCardExpiry: toInputDate(initial.taxCardExpiry),
    importerRegistryNumber: initial.importerRegistryNumber || '',
    importerRegistryExpiry: toInputDate(initial.importerRegistryExpiry),
    city: initial.city || '',
    phone: initial.phone || '',
    email: initial.email || '',
    website: initial.website || '',
  });

  const [branches, setBranches] = useState<ClientBranchRow[]>(
    (initial.branches || []).map((b) => ({
      ...b,
      contacts: b.contacts ? b.contacts.map((c) => ({ ...c })) : [],
    })),
  );

  // Company-level contacts (not tied to a specific branch)
  const [contacts, setContacts] = useState<ClientContactRow[]>(
    (initial.contacts || []).filter((c) => !c.branchId).map((c) => ({ ...c })),
  );

  const loadFullClient = async () => {
    setLoadingFull(true);
    try {
      const full: any = await api.get(`/clients/${initial.id}`);
      if (full) {
        setForm({
          name: full.name || initial.name || '',
          nameAr: full.nameAr || initial.nameAr || '',
          taxNumber: full.taxNumber || '',
          commercialReg: full.commercialReg || '',
          commercialRegExpiry: toInputDate(full.commercialRegExpiry),
          taxCardNumber: full.taxCardNumber || '',
          taxCardExpiry: toInputDate(full.taxCardExpiry),
          importerRegistryNumber: full.importerRegistryNumber || '',
          importerRegistryExpiry: toInputDate(full.importerRegistryExpiry),
          city: full.city || '',
          phone: full.phone || '',
          email: full.email || '',
          website: full.website || '',
        });
        setBranches(
          (full.branches || []).map((b: any) => ({
            ...b,
            contacts: Array.isArray(b.contacts) ? b.contacts.map((c: any) => ({ ...c })) : [],
          })),
        );
        const topContacts = (full.contacts || []).filter((c: any) => !c.branchId);
        setContacts(
          topContacts.length > 0
            ? topContacts.map((c: any) => ({ ...c }))
            : full.personInCharge
            ? [{ name: full.personInCharge, title: 'مسؤول التواصل', mobile: full.phone || '', email: full.email || '', isPrimary: true }]
            : [],
        );
        if (Array.isArray(full.entityDocuments)) {
          setDocs(full.entityDocuments);
        }
      }
    } catch {
      // fallback to initial props
    } finally {
      setLoadingFull(false);
    }
  };

  const refreshDocs = async () => {
    try {
      const res: any = await api.get('/masters/documents', { params: { entityType: 'client', entityId: initial.id } });
      setDocs(Array.isArray(res) ? res : res?.data || []);
    } catch {
      setDocs([]);
    }
  };

  useEffect(() => {
    loadFullClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id]);

  // Branch & Contact tree helpers — identical to ShippingLinesPage / OverseasAgentsPage
  const updBranch = (i: number, patch: Partial<ClientBranchRow>) =>
    setBranches((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const delBranch = (i: number) => setBranches((prev) => prev.filter((_, idx) => idx !== i));
  const addBranch = () =>
    setBranches((prev) => [
      ...prev,
      { name: '', city: '', countryCode: 'EG', phone: '', email: '', address: '', isLoadingAddress: false, contacts: [] },
    ]);
  const addBranchContact = (i: number) =>
    setBranches((prev) =>
      prev.map((b, idx) =>
        idx === i
          ? { ...b, contacts: [...(b.contacts || []), { name: '', title: '', phone: '', mobile: '', email: '' }] }
          : b,
      ),
    );
  const updBranchContact = (bi: number, ci: number, patch: Partial<ClientContactRow>) =>
    setBranches((prev) =>
      prev.map((b, idx) =>
        idx === bi
          ? { ...b, contacts: (b.contacts || []).map((c, jdx) => (jdx === ci ? { ...c, ...patch } : c)) }
          : b,
      ),
    );
  const delBranchContact = (bi: number, ci: number) =>
    setBranches((prev) =>
      prev.map((b, idx) =>
        idx === bi ? { ...b, contacts: (b.contacts || []).filter((_, jdx) => jdx !== ci) } : b,
      ),
    );

  const addContact = () =>
    setContacts((prev) => [...prev, { name: '', title: '', phone: '', mobile: '', email: '' }]);
  const updContact = (i: number, patch: Partial<ClientContactRow>) =>
    setContacts((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const delContact = (i: number) => setContacts((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError('اسم الشركة مطلوب');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        nameAr: form.nameAr.trim() || null,
        status: 'active',
        taxNumber: form.taxNumber.trim() || null,
        commercialReg: form.commercialReg.trim() || null,
        commercialRegExpiry: form.commercialRegExpiry || null,
        taxCardNumber: form.taxCardNumber.trim() || null,
        taxCardExpiry: form.taxCardExpiry || null,
        importerRegistryNumber: form.importerRegistryNumber.trim() || null,
        importerRegistryExpiry: form.importerRegistryExpiry || null,
        city: form.city.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        branches: branches
          .filter((b) => b.name.trim())
          .map((b) => ({
            id: b.id,
            name: b.name.trim(),
            city: b.city?.trim() || null,
            countryCode: b.countryCode?.trim().toUpperCase() || null,
            phone: b.phone?.trim() || null,
            email: b.email?.trim() || null,
            address: b.address?.trim() || null,
            isLoadingAddress: Boolean(b.isLoadingAddress),
            contacts: (b.contacts || [])
              .filter((c) => c.name.trim())
              .map((c) => ({
                name: c.name.trim(),
                title: c.title?.trim() || null,
                phone: c.phone?.trim() || null,
                mobile: c.mobile?.trim() || null,
                email: c.email?.trim() || null,
                isPrimary: Boolean(c.isPrimary),
              })),
          })),
        contacts: contacts
          .filter((c) => c.name.trim())
          .map((c, idx) => ({
            name: c.name.trim(),
            title: c.title?.trim() || null,
            phone: c.phone?.trim() || null,
            mobile: c.mobile?.trim() || null,
            email: c.email?.trim() || null,
            isPrimary: c.isPrimary ?? idx === 0,
          })),
      };

      const saved = await api.patch(`/clients/${initial.id}`, payload);
      toast.success(
        mode === 'convert'
          ? 'تم اعتماد العميل ونقله للعملاء الفعليين مع حفظ الفروع والمسؤولين والوثائق'
          : 'تم حفظ بيانات العميل الفعلي وفروعه ومسؤوليه بنجاح',
      );
      onSaved(saved);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'تعذر حفظ بيانات العميل');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white';
  const labelCls = 'block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={mode === 'convert' ? `اعتماد وتحويل «${initial.name}» إلى العملاء الفعليين` : `تعديل ملف العميل الفعلي — ${initial.name}`}
      subtitle="استكمال السجل التجاري والاعتمادات وتواريخ انتهائها + شجرة الفروع ومسؤولي الاتصال (Persons in Charge) + المرفقات"
      maxWidth="4xl"
    >
      {loadingFull ? (
        <div className="py-12 flex items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-xs font-bold">جارٍ تحميل بيانات العميل...</span>
        </div>
      ) : (
        <div className="space-y-5 text-xs">
          <form id="active-client-profile-form" onSubmit={handleSubmit} className="space-y-4">
            {/* 1. البيانات الأساسية والاعتمادات الرسمية وتواريخ الانتهاء */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                1. البيانات الأساسية والاعتمادات الرسمية وتواريخ الانتهاء (Expiration Dates)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>اسم الشركة (إنجليزي) *</label>
                  <input dir="ltr" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>اسم الشركة (عربي)</label>
                  <input dir="rtl" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>المدينة / المقر الرئيسي</label>
                  <input dir="rtl" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="مدينة 6 أكتوبر" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>رقم السجل التجاري (Commercial Reg)</label>
                  <input dir="ltr" value={form.commercialReg} onChange={(e) => setForm({ ...form, commercialReg: e.target.value })} placeholder="CR-88219" className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className={labelCls}>تاريخ انتهاء السجل التجاري</label>
                  <input type="date" value={form.commercialRegExpiry} onChange={(e) => setForm({ ...form, commercialRegExpiry: e.target.value })} className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className={labelCls}>الرقم الضريبي (Tax ID)</label>
                  <input dir="ltr" value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} placeholder="102-993-882" className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className={labelCls}>رقم البطاقة الضريبية</label>
                  <input dir="ltr" value={form.taxCardNumber} onChange={(e) => setForm({ ...form, taxCardNumber: e.target.value })} placeholder="TAX-654-321" className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className={labelCls}>تاريخ انتهاء البطاقة الضريبية</label>
                  <input type="date" value={form.taxCardExpiry} onChange={(e) => setForm({ ...form, taxCardExpiry: e.target.value })} className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className={labelCls}>رقم سجل المستوردين / المصدرين</label>
                  <input dir="ltr" value={form.importerRegistryNumber} onChange={(e) => setForm({ ...form, importerRegistryNumber: e.target.value })} placeholder="IMP-12345" className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className={labelCls}>تاريخ انتهاء سجل المستوردين</label>
                  <input type="date" value={form.importerRegistryExpiry} onChange={(e) => setForm({ ...form, importerRegistryExpiry: e.target.value })} className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className={labelCls}>الهاتف الرئيسي</label>
                  <input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+20 2 000 0000" className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className={labelCls}>البريد الإلكتروني</label>
                  <input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="info@company.com" className={`${inputCls} font-mono`} />
                </div>
              </div>
            </div>

            {/* 2. شجرة الفروع ومسؤولي كل فرع — نفس الأوبشن في الخطوط الملاحية والوكلاء */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    2. فروع العميل وعناوين التحميل ومسؤولو كل فرع (Branches & Branch Persons in Charge)
                  </span>
                  <span className="text-[10px] text-slate-500">نفس الهيكلية الشجرية المعتمدة في الخطوط الملاحية والوكلاء — أضف فروع العميل ومسؤولي كل فرع</span>
                </div>
                <button
                  type="button"
                  onClick={addBranch}
                  className="px-3 py-1.5 rounded-xl bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/30 font-bold hover:bg-[#FF5E1E]/20 transition cursor-pointer shrink-0"
                >
                  + إضافة فرع / مكتب
                </button>
              </div>
              {branches.length === 0 && (
                <p className="text-[11px] text-slate-400">لا توجد فروع مضافة بعد — اضغط «+ إضافة فرع / مكتب» لإضافة الفروع أو المخازن ومسؤوليها</p>
              )}
              {branches.map((b, bi) => (
                <div key={bi} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="اسم الفرع / المخزن *"
                      value={b.name}
                      onChange={(e) => updBranch(bi, { name: e.target.value })}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
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
                      placeholder="branch@client.com"
                      value={b.email || ''}
                      onChange={(e) => updBranch(bi, { email: e.target.value })}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="العنوان التفصيلي"
                      value={b.address || ''}
                      onChange={(e) => updBranch(bi, { address: e.target.value })}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(b.isLoadingAddress)}
                        onChange={(e) => updBranch(bi, { isLoadingAddress: e.target.checked })}
                      />
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">مكان تحميل معتمد (Loading Address)</span>
                    </label>
                  </div>
                  <div className="space-y-2 border-t border-dashed border-slate-200 dark:border-slate-700 pt-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">مسؤولو الفرع (Persons in Charge):</span>
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
                          placeholder="المسمى الوظيفي"
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
                          placeholder="بريد إلكتروني"
                          value={c.email || ''}
                          onChange={(e) => updBranchContact(bi, ci, { email: e.target.value })}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => delBranchContact(bi, ci)}
                          className="px-2 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold transition cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => addBranchContact(bi)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-brand-600 border border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition cursor-pointer"
                      >
                        + مسؤول بالفرع
                      </button>
                      <button
                        type="button"
                        onClick={() => delBranch(bi)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-500 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                      >
                        حذف الفرع
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 3. الأشخاص المسؤولون على مستوى الشركة (Company-level Persons in Charge — أكثر من مسؤول) */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    3. الأشخاص المسؤولون على مستوى الشركة (Persons in Charge)
                  </span>
                  <span className="text-[10px] text-slate-500">يمكنك إضافة أكثر من مسؤول اتصال (مشتريات، لوجستيات، مالية، تخليص...)</span>
                </div>
                <button
                  type="button"
                  onClick={addContact}
                  className="px-3 py-1.5 rounded-xl bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/30 font-bold hover:bg-[#FF5E1E]/20 transition cursor-pointer shrink-0"
                >
                  + إضافة مسؤول (Person in Charge)
                </button>
              </div>
              {contacts.length === 0 && (
                <p className="text-[11px] text-slate-400">لا يوجد مسؤولون مضافون على مستوى الشركة — اضغط «+ إضافة مسؤول» لإضافة مسؤولي التواصل</p>
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
                    placeholder="المسمى الوظيفي"
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
                    placeholder="بريد إلكتروني"
                    value={c.email || ''}
                    onChange={(e) => updContact(ci, { email: e.target.value })}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => delContact(ci)}
                    className="px-2 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </form>

          {/* 4. المرفقات الرسمية (Attachments + Editable Name + Expiration Date) */}
          <DocsSection clientId={initial.id} docs={docs} onRefresh={refreshDocs} />

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
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              form="active-client-profile-form"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#FF5E1E] hover:bg-[#EA580C] disabled:opacity-60 text-white font-bold transition shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {saving
                  ? 'جارٍ الحفظ...'
                  : mode === 'convert'
                  ? 'اعتماد وتحويل إلى العملاء الفعليين'
                  : 'حفظ تعديلات العميل والفروع والمسؤولين'}
              </span>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};


/** استكمال الاعتمادات الرسمية + تواريخ الصلاحية (PATCH /clients/:id — §6-أ) */
const RegistrationsModal: React.FC<{ client: MasterClient; onClose: () => void; onSaved: () => void }> = ({
  client: cl,
  onClose,
  onSaved,
}) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    commercialReg: cl.commercialReg || '',
    commercialRegExpiry: cl.commercialRegExpiry ? String(cl.commercialRegExpiry).slice(0, 10) : '',
    taxCardNumber: cl.taxCardNumber || '',
    taxCardExpiry: cl.taxCardExpiry ? String(cl.taxCardExpiry).slice(0, 10) : '',
    importerRegistryNumber: cl.importerRegistryNumber || '',
    importerRegistryExpiry: cl.importerRegistryExpiry ? String(cl.importerRegistryExpiry).slice(0, 10) : '',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/clients/${cl.id}`, {
        commercialReg: form.commercialReg.trim() || null,
        commercialRegExpiry: form.commercialRegExpiry || null,
        taxCardNumber: form.taxCardNumber.trim() || null,
        taxCardExpiry: form.taxCardExpiry || null,
        importerRegistryNumber: form.importerRegistryNumber.trim() || null,
        importerRegistryExpiry: form.importerRegistryExpiry || null,
      });
      toast.success('تم حفظ الاعتمادات وربط تواريخ الانتهاء بمحرك التنبيهات');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'تعذر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white';
  const labelCls = 'block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`الاعتمادات الرسمية — ${cl.name}`}
      subtitle="سجل تجاري / بطاقة ضريبية / سجل مستوردين — تواريخ الانتهاء مربوطة بمحرك التنبيهات المسبقة"
    >
      <form onSubmit={submit} className="space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>رقم السجل التجاري</label>
            <input dir="ltr" value={form.commercialReg} onChange={(e) => setForm({ ...form, commercialReg: e.target.value })}
              placeholder="CR-88219" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>انتهاء السجل التجاري</label>
            <input type="date" value={form.commercialRegExpiry} onChange={(e) => setForm({ ...form, commercialRegExpiry: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>رقم البطاقة الضريبية</label>
            <input dir="ltr" value={form.taxCardNumber} onChange={(e) => setForm({ ...form, taxCardNumber: e.target.value })}
              placeholder="102-993-882" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>انتهاء البطاقة الضريبية</label>
            <input type="date" value={form.taxCardExpiry} onChange={(e) => setForm({ ...form, taxCardExpiry: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>رقم سجل المستوردين / المصدرين</label>
            <input dir="ltr" value={form.importerRegistryNumber} onChange={(e) => setForm({ ...form, importerRegistryNumber: e.target.value })}
              placeholder="IMP-12345" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>انتهاء سجل المستوردين</label>
            <input type="date" value={form.importerRegistryExpiry} onChange={(e) => setForm({ ...form, importerRegistryExpiry: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">
            إلغاء
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold transition cursor-pointer">
            {saving ? 'جارٍ الحفظ...' : 'حفظ الاعتمادات'}
          </button>
        </div>
      </form>
    </Modal>
  );
};


/** إضافة / تعديل فرع مع مسؤولي الفرع (POST/PATCH /clients/:id/branches — §6-ب) */
const AddBranchModal: React.FC<{
  clientId: string;
  initial?: ClientBranchRow | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ clientId, initial, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name || '',
    city: initial?.city || '',
    countryCode: initial?.countryCode || 'EG',
    address: initial?.address || '',
    phone: initial?.phone || '',
    email: initial?.email || '',
    isLoadingAddress: Boolean(initial?.isLoadingAddress),
  });
  const [branchContacts, setBranchContacts] = useState<ClientContactRow[]>(
    (initial?.contacts || []).map((c) => ({ ...c })),
  );

  const addContactRow = () =>
    setBranchContacts((prev) => [...prev, { name: '', title: '', phone: '', mobile: '', email: '' }]);
  const updContactRow = (idx: number, patch: Partial<ClientContactRow>) =>
    setBranchContacts((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  const delContactRow = (idx: number) =>
    setBranchContacts((prev) => prev.filter((_, i) => i !== idx));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('اسم الفرع مطلوب'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        city: form.city.trim() || undefined,
        countryCode: form.countryCode.trim().toUpperCase() || undefined,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        isLoadingAddress: form.isLoadingAddress,
        contacts: branchContacts
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name.trim(),
            title: c.title?.trim() || null,
            phone: c.phone?.trim() || null,
            mobile: c.mobile?.trim() || null,
            email: c.email?.trim() || null,
          })),
      };
      if (initial?.id) {
        await api.patch(`/clients/${clientId}/branches/${initial.id}`, payload);
        toast.success('تم تحديث الفرع ومسؤوليه');
      } else {
        await api.post(`/clients/${clientId}/branches`, payload);
        toast.success('تمت إضافة الفرع ومسؤوليه — متاح الآن في العروض وأوامر التحميل');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'تعذر حفظ الفرع');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white';
  const labelCls = 'block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={initial?.id ? `تعديل الفرع — ${initial.name}` : 'إضافة فرع / عنوان تحميل'}
      subtitle="المقر الرئيسي / المخازن / أماكن التحميل + مسؤولو الفرع (Persons in Charge)"
      maxWidth="lg"
    >
      <form onSubmit={submit} className="space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>اسم الفرع *</label>
            <input dir="rtl" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="المقر الرئيسي / مخزن أكتوبر" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>المدينة</label>
            <input dir="rtl" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="مدينة 6 أكتوبر" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>رقم الهاتف</label>
            <input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+20 2 000 0000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>البريد الإلكتروني للفرع</label>
            <input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="branch@company.com" className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>العنوان التفصيلي</label>
          <textarea rows={2} dir="rtl" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="المنطقة الصناعية، شارع ...، مبنى ..." className={inputCls} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isLoadingAddress}
            onChange={(e) => setForm({ ...form, isLoadingAddress: e.target.checked })} />
          <span className="font-bold text-slate-600 dark:text-slate-300">مكان تحميل (Loading Address)</span>
        </label>

        {/* مسؤولو الفرع (Persons in Charge inside Branch) */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-200">مسؤولو الفرع (Persons in Charge)</span>
            <button
              type="button"
              onClick={addContactRow}
              className="px-2.5 py-1 rounded-lg bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/30 font-bold text-[11px] hover:bg-[#FF5E1E]/20 transition cursor-pointer"
            >
              + إضافة مسؤول بالفرع
            </button>
          </div>
          {branchContacts.length === 0 && (
            <p className="text-[11px] text-slate-400">يمكنك إضافة أكثر من مسؤول تواصل لهذا الفرع</p>
          )}
          {branchContacts.map((c, ci) => (
            <div key={ci} className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 items-center">
              <input
                type="text"
                placeholder="الاسم *"
                value={c.name}
                onChange={(e) => updContactRow(ci, { name: e.target.value })}
                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                placeholder="المسمى"
                value={c.title || ''}
                onChange={(e) => updContactRow(ci, { title: e.target.value })}
                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                dir="ltr"
                placeholder="هاتف"
                value={c.phone || ''}
                onChange={(e) => updContactRow(ci, { phone: e.target.value })}
                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <input
                type="text"
                dir="ltr"
                placeholder="موبايل"
                value={c.mobile || ''}
                onChange={(e) => updContactRow(ci, { mobile: e.target.value })}
                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <input
                type="email"
                dir="ltr"
                placeholder="بريد"
                value={c.email || ''}
                onChange={(e) => updContactRow(ci, { email: e.target.value })}
                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <button
                type="button"
                onClick={() => delContactRow(ci)}
                className="px-2 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">
            إلغاء
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold transition cursor-pointer">
            {saving ? 'جارٍ الحفظ...' : initial?.id ? 'حفظ تعديلات الفرع' : 'إضافة الفرع'}
          </button>
        </div>
      </form>
    </Modal>
  );
};


/** إضافة / تعديل جهة اتصال / مسؤول (POST/PATCH /clients/:id/contacts — §6-ب) */
const AddContactModal: React.FC<{
  clientId: string;
  branches?: ClientBranchRow[];
  initial?: ClientContactRow | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ clientId, branches = [], initial, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name || '',
    title: initial?.title || '',
    phone: initial?.phone || '',
    mobile: initial?.mobile || '',
    email: initial?.email || '',
    branchId: initial?.branchId || '',
    isPrimary: Boolean(initial?.isPrimary),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('اسم جهة الاتصال مطلوب'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        title: form.title.trim() || null,
        phone: form.phone.trim() || null,
        mobile: form.mobile.trim() || null,
        email: form.email.trim() || null,
        branchId: form.branchId || null,
        isPrimary: form.isPrimary,
      };
      if (initial?.id) {
        await api.patch(`/clients/${clientId}/contacts/${initial.id}`, payload);
        toast.success('تم تحديث بيانات المسؤول');
      } else {
        await api.post(`/clients/${clientId}/contacts`, payload);
        toast.success('تمت إضافة جهة الاتصال');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'تعذر حفظ جهة الاتصال');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white';
  const labelCls = 'block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={initial?.id ? 'تعديل بيانات المسؤول' : 'إضافة جهة اتصال / مسؤول (Person in Charge)'}
      subtitle="المسمى الوظيفي + أرقام التواصل المباشر + ربط اختياري بفرع"
    >
      <form onSubmit={submit} className="space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>الاسم *</label>
            <input dir="rtl" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="أ. أحمد عبد الله" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>المسمى الوظيفي</label>
            <input dir="rtl" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="مدير المشتريات واللوجستيات" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>الموبايل</label>
            <input dir="ltr" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              placeholder="+20 122 000 0000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>هاتف أرضي / مباشر</label>
            <input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+20 2 000 0000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>البريد الإلكتروني</label>
            <input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="procurement@company.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>الفرع التابع له (اختياري)</label>
            <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className={inputCls}>
              <option value="">— على مستوى الشركة عامة —</option>
              {branches.filter((b) => b.id).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} />
          <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">جهة الاتصال الأساسية</span>
        </label>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">
            إلغاء
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold transition cursor-pointer">
            {saving ? 'جارٍ الحفظ...' : initial?.id ? 'حفظ التعديلات' : 'إضافة المسؤول'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
