import React, { useState } from 'react';
import { Globe2, Plus, Mail, Phone, MapPin } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { useApi } from '../../hooks/useApi';

export const OverseasAgentsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: agents, loading, refetch } = useApi<any[]>('/masters/overseas-agents', { search });

  const displayAgents = agents || [];
  const filtered = displayAgents.filter(
    (a) => !search || a.companyName.toLowerCase().includes(search.toLowerCase()) || a.country.toLowerCase().includes(search.toLowerCase()) || a.city.toLowerCase().includes(search.toLowerCase()),
  );

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
        <LoadingSpinner fullPage label="جاري تحميل الوكلاء..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Globe2} title="لا يوجد وكلاء" description="أضف وكلاء الخارج المتعامل معهم" actionLabel="إضافة وكيل" onAction={() => setIsCreateOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((agent) => (
            <div key={agent.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700 transition-all group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-md">
                  {agent.companyName.split(' ').slice(0, 2).map((w: string) => w[0]).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-tight truncate">{agent.companyName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{agent.contactPerson}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                  agent.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>{agent.isActive ? 'نشط' : 'غير نشط'}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{agent.city}, {agent.country}</span>
              </div>

              {agent.servicesOffered && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {agent.servicesOffered.slice(0, 3).map((service: string) => (
                    <span key={service} className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300">{service}</span>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /><span className="truncate">{agent.email}</span></div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /><span dir="ltr">{agent.phone}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateAgentModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={refetch} />
    </div>
  );
};

const CreateAgentModal: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void }> = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({ companyName: '', contactPerson: '', email: '', phone: '', country: '', city: '', servicesOffered: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try { onSuccess(); onClose(); setForm({ companyName: '', contactPerson: '', email: '', phone: '', country: '', city: '', servicesOffered: '' }); } catch {} finally { setSubmitting(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة وكيل خارجي جديد" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">اسم الشركة</label><input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Ningbo Pacific Logistics" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50" required /></div>
          <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">اسم جهة الاتصال</label><input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Wang Lei" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50" required /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">الدولة</label><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="China" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50" required /></div>
          <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">المدينة</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ningbo" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50" required /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">البريد الإلكتروني</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="agent@company.com" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">الهاتف</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" placeholder="+86 574 8723 5401" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50" /></div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">الخدمات المقدمة (مفصولة بفاصلة)</label>
          <input value={form.servicesOffered} onChange={(e) => setForm({ ...form, servicesOffered: e.target.value })} placeholder="Pre-carriage, Origin handling, Export customs" className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition">إلغاء</button>
          <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-md shadow-brand-600/20 transition disabled:opacity-50">{submitting ? 'جاري الحفظ...' : 'حفظ الوكيل'}</button>
        </div>
      </form>
    </Modal>
  );
};
