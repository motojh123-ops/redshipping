import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Ship, Plus, ExternalLink, Phone, Globe, Download, TrendingUp,
  Compass, Users, Mail, UserCheck, MessageSquare, ChevronDown,
  Building2, MapPin, Search, Edit3
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { useApi } from '../../hooks/useApi';
import { exportToCsv } from '../../utils/exportUtils';
import { api } from '../../services/api';

interface LineEmployee {
  id: string;
  name: string;
  title: string;
  department: 'sales' | 'operations' | 'booking' | 'demurrage';
  phone: string;
  email: string;
  isPrimary?: boolean;
}

interface ShippingLine {
  id: string;
  name: string;
  nameAr?: string;
  code: string;
  country: string;
  contactEmail: string;
  website: string;
  phone: string;
  address?: string;
  isActive: boolean;
  color: string;
  employees: LineEmployee[];
}

const DEPARTMENT_LABELS: Record<string, { label: string; color: string }> = {
  sales: { label: 'مبيعات (Sales)', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
  operations: { label: 'عمليات (Ops)', color: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300' },
  booking: { label: 'حجوزات (Booking)', color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' },
  demurrage: { label: 'أرضيات وغرامات (Demurrage)', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
};

export const ShippingLinesPage: React.FC = () => {
  const [lines, setLines] = useState<ShippingLine[]>([]);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    api.get('/masters/shipping-lines').then((res: any) => {
      if (res && Array.isArray(res)) {
        setLines(res.map((l: any) => ({ ...l, employees: l.employees || [], color: l.color || '#006CB7', isActive: l.isActive !== false })));
        setIsLiveConnected(true);
      }
    }).catch(() => setIsLiveConnected(false));
  }, []);
  const [selectedLineForContacts, setSelectedLineForContacts] = useState<ShippingLine | null>(null);
  const [newContactForm, setNewContactForm] = useState({ name: '', title: '', department: 'sales' as LineEmployee['department'], phone: '', email: '' });

  const filtered = lines.filter(
    (l) =>
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase()) ||
      l.employees.some((e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.phone.includes(search)),
  );

  const handleExportLines = () => {
    exportToCsv('banna_shipping_lines', filtered, [
      { header: 'اسم الخط الملاحي', accessor: (l) => l.name },
      { header: 'الكود المختصر', accessor: (l) => l.code },
      { header: 'بلد المنشأ', accessor: (l) => l.country },
      { header: 'البريد الإلكتروني للعمليات', accessor: (l) => l.contactEmail || '—' },
      { header: 'رقم الهاتف', accessor: (l) => l.phone || '—' },
      { header: 'الموقع الإلكتروني', accessor: (l) => l.website || '—' },
      { header: 'عدد مسؤولي الاتصال', accessor: (l) => l.employees.length },
      { header: 'الحالة', accessor: (l) => (l.isActive ? 'نشط' : 'غير نشط') },
    ]);
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLineForContacts) return;

    const newEmp: LineEmployee = {
      id: String(Date.now()),
      name: newContactForm.name,
      title: newContactForm.title,
      department: newContactForm.department,
      phone: newContactForm.phone,
      email: newContactForm.email,
    };

    const updatedLines = lines.map((l) =>
      l.id === selectedLineForContacts.id
        ? { ...l, employees: [...l.employees, newEmp] }
        : l,
    );

    setLines(updatedLines);
    setSelectedLineForContacts({
      ...selectedLineForContacts,
      employees: [...selectedLineForContacts.employees, newEmp],
    });
    setNewContactForm({ name: '', title: '', department: 'sales', phone: '', email: '' });
  };

  return (
    <div className="space-y-7">
      {/* ── 1. Executive Shipping Lines Command Header ── */}
      <div className="relative rounded-3xl overflow-hidden bg-white/95 dark:bg-[#121620]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-white p-6 sm:p-8 shadow-sm transition-all duration-300">
        {/* Subtle Ambient Brand Glow */}
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
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
        <SearchInput value={search} onChange={setSearch} placeholder="بحث باسم الخط الملاحي، الكود، أو اسم مسؤول الاتصال..." className="w-full" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Ship} title="لا توجد خطوط ملاحة" description="أضف خطوط الملاحة المتعامل معها" actionLabel="إضافة خط" onAction={() => setIsCreateOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((line) => (
            <div key={line.id} className="p-5 rounded-2xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] shadow-sm hover:border-[#FF5E1E]/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-start gap-3.5 mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0 shadow-md"
                    style={{ backgroundColor: line.color || '#FF5E1E' }}
                  >
                    {line.code.slice(0, 3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{line.name}</h3>
                    {line.nameAr && <span className="text-xs text-slate-500 dark:text-slate-400 block">{line.nameAr}</span>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono font-bold text-[#FF5E1E]">{line.code}</span>
                      <span className="text-xs text-slate-400">• {line.country}</span>
                    </div>
                  </div>
                </div>

                {/* Company details */}
                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-[#262E40]">
                  {line.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{line.address}</span>
                    </div>
                  )}
                  {line.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span dir="ltr">{line.phone}</span>
                    </div>
                  )}
                  {line.website && (
                    <a
                      href={line.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[#FF5E1E] hover:underline transition"
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{line.website.replace('https://', '')}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}
                </div>

                {/* Employees & Contacts Section */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-[#262E40]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#FF5E1E]" />
                      فريق التواصل المباشر ({line.employees.length})
                    </span>
                    <button
                      onClick={() => setSelectedLineForContacts(line)}
                      className="text-[11px] text-[#FF5E1E] hover:text-[#FF7034] font-bold"
                    >
                      إدارة الفريق +
                    </button>
                  </div>

                  <div className="space-y-2">
                    {line.employees.slice(0, 2).map((emp) => {
                      const dept = DEPARTMENT_LABELS[emp.department] || { label: emp.department, color: 'bg-slate-100 dark:bg-[#1E2536] text-slate-600 dark:text-slate-300' };
                      return (
                        <div key={emp.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#121620] border border-slate-100 dark:border-[#262E40] text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">{emp.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${dept.color}`}>
                              {dept.label}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">{emp.title}</span>
                          <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500 font-mono">
                            <span dir="ltr">{emp.phone}</span>
                            <div className="flex items-center gap-1.5 font-sans">
                              <a
                                href={`https://wa.me/${emp.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 font-semibold"
                                title="مراسلة واتساب مباشرة"
                              >
                                WhatsApp
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {line.employees.length > 2 && (
                      <button
                        onClick={() => setSelectedLineForContacts(line)}
                        className="w-full text-center text-[11px] font-bold text-slate-500 hover:text-[#FF5E1E] py-1 transition"
                      >
                        + عرض {line.employees.length - 2} موظفين آخرين
                      </button>
                    )}
                  </div>
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
                    to={`/pricing?carrier=${line.code}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#FF5E1E] bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/20 transition"
                    title="استعراض أسعار ونوالين الشحن المتاحة لهذا الخط"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>مصفوفة النولون</span>
                  </Link>

                  <Link
                    to={`/tracking?carrier=${line.code}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#22293A] transition"
                    title="تتبع حاويات هذا الخط"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>تتبع</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Line Contacts & Employees Management Modal */}
      {selectedLineForContacts && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLineForContacts(null)}
          title={`فريق ومسؤولي الاتصال — ${selectedLineForContacts.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* List of current employees */}
            <div className="space-y-2 max-h-60 overflow-y-auto pe-1">
              {selectedLineForContacts.employees.map((emp) => {
                const dept = DEPARTMENT_LABELS[emp.department] || { label: emp.department, color: 'bg-slate-100 text-slate-600' };
                return (
                  <div key={emp.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{emp.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${dept.color}`}>
                          {dept.label}
                        </span>
                      </div>
                      <span className="text-slate-400 block mt-0.5">{emp.title}</span>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{emp.phone}</span>
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{emp.email}</span>
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/${emp.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold transition flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      واتساب
                    </a>
                  </div>
                );
              })}
            </div>

            {/* Add Employee Form */}
            <form onSubmit={handleAddContact} className="p-3.5 rounded-xl border border-dashed border-brand-300 dark:border-brand-800 bg-brand-50/30 dark:bg-brand-950/20 space-y-3">
              <span className="font-bold text-slate-900 dark:text-white block">إضافة موظف اتصال جديد لهذا الخط:</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 mb-1">اسم الموظف *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أحمد عبد الحميد"
                    value={newContactForm.name}
                    onChange={(e) => setNewContactForm({ ...newContactForm, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 mb-1">المسمى الوظيفي *</label>
                  <input
                    type="text"
                    required
                    placeholder="Booking Agent / Sales Rep"
                    value={newContactForm.title}
                    onChange={(e) => setNewContactForm({ ...newContactForm, title: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 mb-1">القسم *</label>
                  <select
                    value={newContactForm.department}
                    onChange={(e) => setNewContactForm({ ...newContactForm, department: e.target.value as any })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="sales">مبيعات (Sales)</option>
                    <option value="operations">عمليات (Operations)</option>
                    <option value="booking">حجوزات (Booking)</option>
                    <option value="demurrage">أرضيات (Demurrage)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 mb-1">رقم الهاتف *</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    placeholder="+20 100 000 0000"
                    value={newContactForm.phone}
                    onChange={(e) => setNewContactForm({ ...newContactForm, phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 mb-1">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    placeholder="email@line.com"
                    value={newContactForm.email}
                    onChange={(e) => setNewContactForm({ ...newContactForm, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold transition shadow-sm"
                >
                  إضافة جهة الاتصال
                </button>
              </div>
            </form>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedLineForContacts(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Shipping Line Modal */}
      {isCreateOpen && (
        <CreateShippingLineModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(newLine) => setLines([newLine, ...lines])}
        />
      )}
    </div>
  );
};

/* ── Create Shipping Line Modal ──────────────────────────────── */
const CreateShippingLineModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (line: ShippingLine) => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: '',
    nameAr: '',
    code: '',
    country: 'مصر',
    contactEmail: '',
    phone: '',
    website: '',
    address: '',
    contactName: '',
    contactTitle: '',
    contactPhone: '',
    contactEmailLine: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLine: ShippingLine = {
      id: String(Date.now()),
      name: form.name,
      nameAr: form.nameAr,
      code: form.code.toUpperCase(),
      country: form.country,
      contactEmail: form.contactEmail,
      phone: form.phone,
      website: form.website,
      address: form.address,
      isActive: true,
      color: '#0284c7',
      employees: form.contactName
        ? [
            {
              id: String(Date.now() + 1),
              name: form.contactName,
              title: form.contactTitle || 'مسؤول الاتصال',
              department: 'sales',
              phone: form.contactPhone || form.phone,
              email: form.contactEmailLine || form.contactEmail,
              isPrimary: true,
            },
          ]
        : [],
    };

    onSuccess(newLine);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة خط ملاحي جديد ومسؤولي الاتصال" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">اسم الخط بالإنجليزية *</label>
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
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">الاسم بالعربية</label>
            <input
              type="text"
              placeholder="مثال: يانغ مينغ للملاحة"
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">الكود المختصر (SCAC) *</label>
            <input
              type="text"
              required
              placeholder="YMLU"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">دولة المقر</label>
            <input
              type="text"
              placeholder="تايوان"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">الهاتف الرئيسي</label>
            <input
              type="text"
              dir="ltr"
              placeholder="+20 3 480 0000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">البريد الإلكتروني للعمليات</label>
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
              type="url"
              dir="ltr"
              placeholder="https://www.yangming.com"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        {/* First contact person (per voice note) */}
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
          <span className="font-bold text-slate-800 dark:text-slate-200 block">مسؤول الاتصال الرئيسي بالخط الملاحي:</span>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="اسم الموظف (سيلز أو أوبريشن)"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
            <input
              type="text"
              placeholder="المسمى الوظيفي"
              value={form.contactTitle}
              onChange={(e) => setForm({ ...form, contactTitle: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              dir="ltr"
              placeholder="رقم الهاتف والموبايل المباشر"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
            />
            <input
              type="email"
              placeholder="البريد المباشر"
              value={form.contactEmailLine}
              onChange={(e) => setForm({ ...form, contactEmailLine: e.target.value })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 transition"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition shadow-md shadow-brand-600/20"
          >
            حفظ الخط الملاحي
          </button>
        </div>
      </form>
    </Modal>
  );
};
