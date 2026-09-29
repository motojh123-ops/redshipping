import React, { useState, useEffect } from 'react';
import { Globe2, Plus, Mail, Phone, MapPin, Loader2, AlertCircle, Search, Pencil, Power } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { CountrySelect } from '../../components/ui/CountrySelect';
import { CountryFlag } from '../../components/ui/CountryFlag';
import { api } from '../../services/api';

/** Shape returned by GET/POST /masters/overseas-agents (see Prisma OverseasAgent model — hierarchy + services) */
interface AgentContact {
  id?: string;
  name: string;
  title?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  isPrimary?: boolean;
}

interface AgentBranch {
  id?: string;
  code?: string | null;
  name: string;
  address?: string | null;
  city?: string | null;
  countryCode?: string | null;
  phone?: string | null;
  email?: string | null;
  contacts?: AgentContact[];
}

interface OverseasAgent {
  id: string;
  name: string;
  countryCode: string;
  city: string;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  specialization?: string | null;
  services?: string[];
  branches?: AgentBranch[];
  contacts?: AgentContact[];
  isActive: boolean;
}

/** Multi-select service options for agents (spec: خدمات متعددة) */
const AGENT_SERVICE_OPTIONS = [
  'مناولة عند المنشأ',
  'نقل ما قبل الشحن',
  'تخليص تصدير',
  'توثيق ومستندات',
  'خدمة من الباب للباب',
  'تخزين',
  'تحصيل نولون',
  'شحنات خطرة (DG)',
];

export const OverseasAgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<OverseasAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<OverseasAgent | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAgents = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res: any = await api.get('/masters/overseas-agents', { params: { includeInactive: 'true' } });
      const data = Array.isArray(res) ? res : res?.data;
      setAgents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setLoadError(err?.message || 'تعذر تحميل الوكلاء من الخادم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const filtered = agents.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.countryCode || '').toLowerCase().includes(q) ||
      (a.city || '').toLowerCase().includes(q) ||
      (a.contactPerson || '').toLowerCase().includes(q) ||
      (a.specialization || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="وكلاء الخارج (Overseas Agents)"
        subtitle="شبكة الوكلاء الخارجيين المسؤولين عن عمليات ما قبل الشحن والتوثيق في بلدان المنشأ"
        actions={
          <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-md shadow-brand-600/20 transition cursor-pointer">
            <Plus className="w-4 h-4" /><span>إضافة وكيل خارجي</span>
          </button>
        }
      />

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث باسم الوكيل أو الدولة أو المدينة..." className="w-full" />
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin" />
          <span className="text-xs font-bold">جارٍ تحميل الوكلاء...</span>
        </div>
      ) : loadError ? (
        <div className="p-5 rounded-3xl bg-red-500/5 border border-red-500/20 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <div>
            <h3 className="text-sm font-black text-red-600 dark:text-red-400 mb-1">تعذر تحميل البيانات</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{loadError}</p>
            <button
              onClick={loadAgents}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Globe2} title={search ? 'لا نتائج مطابقة للبحث' : 'لا يوجد وكلاء'} description={search ? 'جرب كلمة بحث أخرى' : 'أضف وكلاء الخارج المتعامل معهم'} actionLabel={search ? undefined : 'إضافة وكيل'} onAction={search ? undefined : () => setIsCreateOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((agent) => (
            <div key={agent.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700 transition-all group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-md">
                  {agent.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-tight truncate">{agent.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{agent.contactPerson || '—'}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                  agent.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>{agent.isActive ? 'نشط' : 'غير نشط'}</span>
                <button
                  onClick={() => setEditingAgent(agent)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#FF5E1E] hover:bg-orange-500/10 transition cursor-pointer shrink-0"
                  title="تعديل بيانات الوكيل"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={async () => {
                    setBusyId(agent.id);
                    try {
                      await api.patch(`/masters/overseas-agents/${agent.id}`, { isActive: !agent.isActive });
                      setAgents((prev) => prev.map((x) => (x.id === agent.id ? { ...x, isActive: !agent.isActive } : x)));
                    } catch (err: any) {
                      alert(err?.message || 'تعذر تغيير حالة الوكيل');
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  disabled={busyId === agent.id}
                  className={`p-1.5 rounded-lg transition cursor-pointer disabled:opacity-50 shrink-0 ${
                    agent.isActive ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                  }`}
                  title={agent.isActive ? 'إيقاف الوكيل (لن يظهر في قوائم الاختيار)' : 'إعادة تفعيل الوكيل'}
                >
                  <Power className={`w-3.5 h-3.5 ${busyId === agent.id ? 'animate-pulse' : ''}`} />
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                <CountryFlag countryCode={agent.countryCode} className="w-5 h-3.5 rounded shadow-sm shrink-0" />
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{agent.city}{agent.countryCode ? ` • ${agent.countryCode}` : ''}</span>
              </div>

              {agent.specialization && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300">{agent.specialization}</span>
                </div>
              )}

              {(agent.services || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(agent.services || []).slice(0, 4).map((s) => (
                    <span key={s} className="inline-flex px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-[10px] font-bold text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                      {s}
                    </span>
                  ))}
                  {(agent.services || []).length > 4 && (
                    <span className="text-[10px] text-slate-400">+{agent.services!.length - 4}</span>
                  )}
                </div>
              )}

              {(agent.branches || []).length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <Globe2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {(agent.branches || []).length} فرع •{' '}
                    {((agent.branches || []).reduce((acc: number, b) => acc + (b.contacts?.length || 0), 0) + (agent.contacts || []).length)} مسؤول
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-500">
                {agent.contactEmail ? (
                  <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /><span className="truncate" dir="ltr">{agent.contactEmail}</span></div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-300 dark:text-slate-700"><Mail className="w-3.5 h-3.5" /><span>لا يوجد بريد مسجل</span></div>
                )}
                {agent.contactPhone ? (
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /><span dir="ltr">{agent.contactPhone}</span></div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-300 dark:text-slate-700"><Phone className="w-3.5 h-3.5" /><span>لا يوجد هاتف مسجل</span></div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateAgentModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={(newAgent) => setAgents((prev) => [newAgent, ...prev])} />

      {editingAgent && (
        <CreateAgentModal
          isOpen={!!editingAgent}
          onClose={() => setEditingAgent(null)}
          initial={editingAgent}
          onSuccess={(a) => setAgents((prev) => prev.map((x) => (x.id === a.id ? a : x)))}
        />
      )}
    </div>
  );
};

const CreateAgentModal: React.FC<{ isOpen: boolean; onClose: () => void; initial?: OverseasAgent | null; onSuccess: (agent: OverseasAgent) => void }> = ({ isOpen, onClose, initial, onSuccess }) => {
  const [form, setForm] = useState({
    name: initial?.name || '',
    countryCode: initial?.countryCode || '',
    city: initial?.city || '',
    contactPerson: initial?.contactPerson || '',
    contactEmail: initial?.contactEmail || '',
    contactPhone: initial?.contactPhone || '',
    specialization: initial?.specialization || '',
  });
  const [services, setServices] = useState<string[]>(initial?.services || []);
  const [customService, setCustomService] = useState('');
  const [branches, setBranches] = useState<AgentBranch[]>(
    (initial?.branches || []).map((b) => ({ ...b, contacts: b.contacts ? [...b.contacts] : [] })),
  );
  const [contacts, setContacts] = useState<AgentContact[]>((initial?.contacts || []).map((c) => ({ ...c })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!initial;

  const toggleService = (s: string) => setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const addCustomService = () => {
    const s = customService.trim();
    if (s && !services.includes(s)) setServices((prev) => [...prev, s]);
    setCustomService('');
  };
  const updBranch = (i: number, patch: Partial<AgentBranch>) =>
    setBranches((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const delBranch = (i: number) => setBranches((prev) => prev.filter((_, idx) => idx !== i));
  const addBranch = () =>
    setBranches((prev) => [...prev, { name: '', code: '', city: '', countryCode: '', phone: '', email: '', address: '', contacts: [] }]);
  const addBranchContact = (i: number) =>
    setBranches((prev) => prev.map((b, idx) => (idx === i ? { ...b, contacts: [...(b.contacts || []), { name: '', title: '', phone: '', mobile: '', email: '' }] } : b)));
  const updBranchContact = (bi: number, ci: number, patch: Partial<AgentContact>) =>
    setBranches((prev) =>
      prev.map((b, idx) => (idx === bi ? { ...b, contacts: (b.contacts || []).map((c, jdx) => (jdx === ci ? { ...c, ...patch } : c)) } : b)),
    );
  const delBranchContact = (bi: number, ci: number) =>
    setBranches((prev) => prev.map((b, idx) => (idx === bi ? { ...b, contacts: (b.contacts || []).filter((_, jdx) => jdx !== ci) } : b)));
  const addContact = () => setContacts((prev) => [...prev, { name: '', title: '', phone: '', mobile: '', email: '' }]);
  const updContact = (i: number, patch: Partial<AgentContact>) => setContacts((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const delContact = (i: number) => setContacts((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.countryCode) {
      setError('اختر دولة الوكيل');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        countryCode: form.countryCode,
        city: form.city.trim(),
        services,
        // Multi-level hierarchy: Agent Branch → Persons in Charge (spec Session 1)
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
      if (form.contactPerson.trim()) payload.contactPerson = form.contactPerson.trim();
      if (form.contactEmail.trim()) payload.contactEmail = form.contactEmail.trim();
      if (form.contactPhone.trim()) payload.contactPhone = form.contactPhone.trim();
      if (form.specialization.trim()) payload.specialization = form.specialization.trim();

      const saved: any = isEdit
        ? await api.patch(`/masters/overseas-agents/${initial!.id}`, payload)
        : await api.post('/masters/overseas-agents', payload);
      // The API returns the full agent (with branches + contacts) — pass it through
      onSuccess(saved as OverseasAgent);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'تعذر حفظ الوكيل — حاول مجدداً');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'تعديل بيانات الوكيل الخارجي' : 'إضافة وكيل خارجي جديد'}
      subtitle="الخدمات المتعددة + شجرة الفروع والمسؤولين في بلد المنشأ"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">اسم الوكيل / الشركة *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Gulf Maritime Logistics LLC" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">الدولة *</label>
            <CountrySelect
              value={form.countryCode}
              onChange={(country) => setForm({ ...form, countryCode: country.cca2 })}
              placeholder="اختر دولة الوكيل..."
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">المدينة *</label>
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Dubai" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">اسم جهة الاتصال</label>
            <input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Karim Al-Hashemi" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">البريد الإلكتروني</label>
            <input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} type="email" placeholder="agent@company.com" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">الهاتف</label>
            <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} dir="ltr" placeholder="+971 4 000 0000" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">التخصص</label>
          <input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Origin handling / Pre-carriage / Export customs" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
        </div>

        {/* Multi-select services (spec: خدمات متعددة) */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">الخدمات المقدمة (اختيار متعدد)</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {AGENT_SERVICE_OPTIONS.map((s) => {
              const active = services.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleService(s)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition text-start ${
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
          {services.filter((s) => !AGENT_SERVICE_OPTIONS.includes(s)).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {services
                .filter((s) => !AGENT_SERVICE_OPTIONS.includes(s))
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
              placeholder="خدمة أخرى..."
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
            <button
              type="button"
              onClick={addCustomService}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              إضافة
            </button>
          </div>
        </div>
        {/* Branches tree: Agent Branch → Persons in Charge (spec: الهيكل الشجري) */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">فروع الوكيل</span>
            <button
              type="button"
              onClick={addBranch}
              className="px-3 py-1.5 rounded-xl bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/30 text-xs font-bold hover:bg-[#FF5E1E]/20 transition"
            >
              + إضافة فرع
            </button>
          </div>
          {branches.length === 0 && (
            <p className="text-[11px] text-slate-400">لا توجد فروع — يمكن إدارة الوكيل على مستوى الشركة مباشرة</p>
          )}
          {branches.map((b, bi) => (
            <div key={bi} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="اسم الفرع *"
                  value={b.name}
                  onChange={(e) => updBranch(bi, { name: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                />
                <input
                  type="text"
                  placeholder="المدينة"
                  value={b.city || ''}
                  onChange={(e) => updBranch(bi, { city: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
                <input
                  type="text"
                  dir="ltr"
                  maxLength={2}
                  placeholder="كود الدولة (AE)"
                  value={b.countryCode || ''}
                  onChange={(e) => updBranch(bi, { countryCode: e.target.value.toUpperCase() })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                />
                <input
                  type="text"
                  dir="ltr"
                  placeholder="هاتف الفرع"
                  value={b.phone || ''}
                  onChange={(e) => updBranch(bi, { phone: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                />
                <input
                  type="email"
                  dir="ltr"
                  placeholder="branch@agent.com"
                  value={b.email || ''}
                  onChange={(e) => updBranch(bi, { email: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => delBranch(bi)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-500 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                >
                  حذف الفرع
                </button>
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
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="المسمى"
                      value={c.title || ''}
                      onChange={(e) => updBranchContact(bi, ci, { title: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="هاتف"
                      value={c.phone || ''}
                      onChange={(e) => updBranchContact(bi, ci, { phone: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="موبايل"
                      value={c.mobile || ''}
                      onChange={(e) => updBranchContact(bi, ci, { mobile: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                    <input
                      type="email"
                      dir="ltr"
                      placeholder="بريد"
                      value={c.email || ''}
                      onChange={(e) => updBranchContact(bi, ci, { email: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
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
                <button
                  type="button"
                  onClick={() => addBranchContact(bi)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-brand-600 border border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition"
                >
                  + مسؤول بالفرع
                </button>
              </div>
            </div>
          ))}
        </div>
        {/* Agent-level persons in charge (outside branches) */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">الأشخاص المسؤولون (مستوى الوكيل)</span>
            <button
              type="button"
              onClick={addContact}
              className="px-3 py-1.5 rounded-xl bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/30 text-xs font-bold hover:bg-[#FF5E1E]/20 transition"
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
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
              <input
                type="text"
                placeholder="المسمى"
                value={c.title || ''}
                onChange={(e) => updContact(ci, { title: e.target.value })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
              <input
                type="text"
                dir="ltr"
                placeholder="هاتف"
                value={c.phone || ''}
                onChange={(e) => updContact(ci, { phone: e.target.value })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              />
              <input
                type="text"
                dir="ltr"
                placeholder="موبايل"
                value={c.mobile || ''}
                onChange={(e) => updContact(ci, { mobile: e.target.value })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              />
              <input
                type="email"
                dir="ltr"
                placeholder="بريد"
                value={c.email || ''}
                onChange={(e) => updContact(ci, { email: e.target.value })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
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

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">إلغاء</button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-sm font-semibold shadow-md shadow-brand-600/20 transition flex items-center gap-2 cursor-pointer">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{saving ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'حفظ الوكيل'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
