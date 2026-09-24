import React, { useState, useEffect } from 'react';
import { Globe2, Plus, Mail, Phone, MapPin, Loader2, AlertCircle, Search } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { CountrySelect } from '../../components/ui/CountrySelect';
import { CountryFlag } from '../../components/ui/CountryFlag';
import { api } from '../../services/api';

/** Shape returned by GET/POST /masters/overseas-agents (see Prisma OverseasAgent model) */
interface OverseasAgent {
  id: string;
  name: string;
  countryCode: string;
  city: string;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  specialization?: string | null;
  isActive: boolean;
}

export const OverseasAgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<OverseasAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadAgents = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res: any = await api.get('/masters/overseas-agents');
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
    </div>
  );
};

const CreateAgentModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: (agent: OverseasAgent) => void }> = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: '', countryCode: '', city: '', contactPerson: '', contactEmail: '', contactPhone: '', specialization: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.countryCode) {
      setError('اختر دولة الوكيل');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        name: form.name.trim(),
        countryCode: form.countryCode,
        city: form.city.trim(),
      };
      if (form.contactPerson.trim()) payload.contactPerson = form.contactPerson.trim();
      if (form.contactEmail.trim()) payload.contactEmail = form.contactEmail.trim();
      if (form.contactPhone.trim()) payload.contactPhone = form.contactPhone.trim();
      if (form.specialization.trim()) payload.specialization = form.specialization.trim();

      const created: any = await api.post('/masters/overseas-agents', payload);
      onSuccess({
        id: created?.id || String(Date.now()),
        name: created?.name ?? payload.name,
        countryCode: created?.countryCode ?? payload.countryCode,
        city: created?.city ?? payload.city,
        contactPerson: created?.contactPerson ?? payload.contactPerson ?? null,
        contactEmail: created?.contactEmail ?? payload.contactEmail ?? null,
        contactPhone: created?.contactPhone ?? payload.contactPhone ?? null,
        specialization: created?.specialization ?? payload.specialization ?? null,
        isActive: created?.isActive !== false,
      });
      onClose();
      setForm({ name: '', countryCode: '', city: '', contactPerson: '', contactEmail: '', contactPhone: '', specialization: '' });
    } catch (err: any) {
      setError(err?.message || 'تعذر حفظ الوكيل — حاول مجدداً');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة وكيل خارجي جديد" maxWidth="lg">
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
            <span>{saving ? 'جارٍ الحفظ...' : 'حفظ الوكيل'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
