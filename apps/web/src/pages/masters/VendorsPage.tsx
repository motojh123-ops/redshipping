import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, Phone, Mail, Building2, ShieldCheck, Download,
  Users, MessageSquare, MapPin, CreditCard, Search, Eye, Star, FileText, CheckCircle2, ArrowUpRight
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { exportToCsv } from '../../utils/exportUtils';
import { api } from '../../services/api';

interface VendorContact {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
}

interface Vendor {
  id: string;
  name: string;
  isTrucking: boolean;
  isClearance: boolean;
  otherType?: string;
  phone: string;
  email: string;
  city: string;
  address?: string;
  taxId: string;
  commercialRegister?: string;
  isActive: boolean;
  contacts: VendorContact[];
}

const DEMO_VENDORS: Vendor[] = [
  {
    id: '1',
    name: 'شركة النيل للنقل الثقيل واللوجستيات',
    isTrucking: true,
    isClearance: false,
    phone: '+20 100 234 5678',
    email: 'ops@nile-haulage.com',
    city: 'العاشر من رمضان',
    address: 'المنطقة الصناعية B3، طريق الإسماعيلية',
    taxId: 'EG-TAX-234-567',
    commercialRegister: 'CR-10492',
    isActive: true,
    contacts: [
      { id: 'c1', name: 'محمد سعيد البنا', title: 'مدير حركة الأسطول والنقل', phone: '+20 100 234 5678', email: 'm.saeed@nile-haulage.com' },
      { id: 'c2', name: 'عبد الرحمن فارس', title: 'مشرف تشغيل السائقين والتريلات', phone: '+20 114 990 1234', email: 'a.fares@nile-haulage.com' },
    ],
  },
  {
    id: '2',
    name: 'مكتب الرضوان للتخليص والخدمات الجمركية',
    isTrucking: false,
    isClearance: true,
    phone: '+20 3 481 9920',
    email: 'info@elradwan-customs.com',
    city: 'الإسكندرية',
    address: 'شارع النصر، أمام باب 10 ميناء الإسكندرية',
    taxId: 'EG-TAX-345-678',
    commercialRegister: 'CR-29401',
    isActive: true,
    contacts: [
      { id: 'c3', name: 'الحاج رضوان الشرقاوي', title: 'مستخلص جمركي معتمد فئة أ', phone: '+20 122 345 6789', email: 'radwan@elradwan.com' },
      { id: 'c4', name: 'طارق رضوان', title: 'مسؤول متابعة شهادات 46 ونافذة', phone: '+20 106 882 1190', email: 'tarek@elradwan.com' },
    ],
  },
  {
    id: '3',
    name: 'المتحدة للخدمات اللوجستية المتكاملة (Red Fox Logistics)',
    isTrucking: true,
    isClearance: true, // BOTH TRUCKING & CLEARANCE (Voice note scenario!)
    phone: '+20 2 3833 4400',
    email: 'support@redfox-logistics.eg',
    city: '6 أكتوبر والجيزة',
    address: 'المنطقة الصناعية الثانية، 6 أكتوبر',
    taxId: 'EG-TAX-902-114',
    commercialRegister: 'CR-88219',
    isActive: true,
    contacts: [
      { id: 'c5', name: 'عمرو عبد الرحمن', title: 'مدير عمليات النقل البري والتخليص المشترك', phone: '+20 101 445 6789', email: 'amr@redfox.eg' },
      { id: 'c6', name: 'فارس عبد الله', title: 'منسق ساحات الكشف وتعتيق الحاويات', phone: '+20 112 554 9912', email: 'fares@redfox.eg' },
    ],
  },
  {
    id: '4',
    name: 'الأهرام للمقاولات والنقل والتفريغ',
    isTrucking: true,
    isClearance: false,
    phone: '+20 115 567 8901',
    email: 'operations@ahram-transport.com',
    city: 'السخنة والسويس',
    address: 'المنطقة اللوجستية لميناء السخنة',
    taxId: 'EG-TAX-567-890',
    commercialRegister: 'CR-44120',
    isActive: true,
    contacts: [
      { id: 'c7', name: 'كريم عبد الله', title: 'مسؤول سيارات النقل والتريلات الثقيلة', phone: '+20 115 567 8901', email: 'karim@ahram-transport.com' },
    ],
  },
  {
    id: '5',
    name: 'شركة الصفا للتخليص والنقل المبرد',
    isTrucking: true,
    isClearance: true, // BOTH TRUCKING & CLEARANCE
    phone: '+20 57 234 8810',
    email: 'info@alsafa-reefer.com',
    city: 'دمياط',
    address: 'مجمع التخليص الجمركي، ميناء دمياط',
    taxId: 'EG-TAX-678-901',
    commercialRegister: 'CR-33918',
    isActive: true,
    contacts: [
      { id: 'c8', name: 'محمود الصفا', title: 'مدير فرع دمياط للشحن المبرد', phone: '+20 109 881 2234', email: 'm.safa@alsafa.com' },
    ],
  },
];

export const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>(DEMO_VENDORS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'trucking' | 'clearance' | 'both'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedVendorForContacts, setSelectedVendorForContacts] = useState<Vendor | null>(null);
  const [selectedVendorForProfile, setSelectedVendorForProfile] = useState<Vendor | null>(null);
  const [newContactForm, setNewContactForm] = useState({ name: '', title: '', phone: '', email: '' });
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    api.get('/masters/vendors').then((res: any) => {
      if (res && Array.isArray(res) && res.length > 0) {
        setVendors(res.map((v: any) => ({ ...v, contacts: v.contacts || [], isActive: v.isActive !== false })));
        setIsLiveConnected(true);
      }
    }).catch(() => setIsLiveConnected(false));
  }, []);

  const filtered = vendors.filter((v) => {
    const matchesSearch =
      !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.city.toLowerCase().includes(search.toLowerCase()) ||
      v.contacts.some((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

    let matchesType = true;
    if (typeFilter === 'trucking') matchesType = v.isTrucking && !v.isClearance;
    else if (typeFilter === 'clearance') matchesType = v.isClearance && !v.isTrucking;
    else if (typeFilter === 'both') matchesType = v.isTrucking && v.isClearance;

    return matchesSearch && matchesType;
  });

  const handleExportVendors = () => {
    exportToCsv('banna_vendors', filtered, [
      { header: 'اسم المورد / الشركة', accessor: (v) => v.name },
      { header: 'نقل بري', accessor: (v) => (v.isTrucking ? 'نعم' : 'لا') },
      { header: 'تخليص جمركي', accessor: (v) => (v.isClearance ? 'نعم' : 'لا') },
      { header: 'المدينة', accessor: (v) => v.city },
      { header: 'الهاتف', accessor: (v) => v.phone },
      { header: 'البريد الإلكتروني', accessor: (v) => v.email },
      { header: 'الرقم الضريبي', accessor: (v) => v.taxId },
      { header: 'عدد جهات الاتصال', accessor: (v) => v.contacts.length },
      { header: 'الحالة', accessor: (v) => (v.isActive ? 'نشط' : 'معطّل') },
    ]);
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorForContacts) return;

    const newC: VendorContact = {
      id: String(Date.now()),
      name: newContactForm.name,
      title: newContactForm.title,
      phone: newContactForm.phone,
      email: newContactForm.email,
    };

    const updated = vendors.map((v) =>
      v.id === selectedVendorForContacts.id
        ? { ...v, contacts: [...v.contacts, newC] }
        : v,
    );

    setVendors(updated);
    setSelectedVendorForContacts({
      ...selectedVendorForContacts,
      contacts: [...selectedVendorForContacts.contacts, newC],
    });
    setNewContactForm({ name: '', title: '', phone: '', email: '' });
  };

  return (
    <div className="space-y-7">
      {/* ── 1. Executive Vendors Command Header ── */}
      <div className="relative rounded-3xl overflow-hidden bg-white/95 dark:bg-[#121620]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-white p-6 sm:p-8 shadow-sm transition-all duration-300">
        {/* Subtle Ambient Emerald/Brand Glow */}
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
              دليل شركات النقل البري وتريلات الحاويات، مكاتب التخليص الجمركي بالموانئ، والشركات المزدوجة مع تقييم جودة الخدمة وأسعار الخدمات وأوامر الصرف.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                {vendors.length} مورد معتمد
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                نقل بري وتخليص جمركي موثق
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportVendors}
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
          placeholder="بحث باسم المورد، المدينة، أو مسؤول التواصل..."
          className="flex-1 w-full"
        />

        {/* Classification Filter (Voice note requirement) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold shrink-0">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition ${typeFilter === 'all' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
          >
            الكل ({vendors.length})
          </button>
          <button
            onClick={() => setTypeFilter('trucking')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${typeFilter === 'trucking' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
          >
            <Truck className="w-3.5 h-3.5 text-brand-500" />
            نقل بري فقط
          </button>
          <button
            onClick={() => setTypeFilter('clearance')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${typeFilter === 'clearance' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            تخليص جمركي فقط
          </button>
          <button
            onClick={() => setTypeFilter('both')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${typeFilter === 'both' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            نقل وتخليص معاً (Dual)
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={Truck} title="لا يوجد موردين" description="أضف الموردين والشركات الخدمية المتعامل معها" actionLabel="إضافة مورد" onAction={() => setIsCreateOpen(true)} />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 text-start">المورد والشركة</th>
                  <th className="py-3.5 px-4 text-start">تصنيف الخدمات اللوجستية</th>
                  <th className="py-3.5 px-4 text-start">فريق التواصل المباشر</th>
                  <th className="py-3.5 px-4 text-start">المدينة والعنوان</th>
                  <th className="py-3.5 px-4 text-start">الرقم الضريبي والسجل</th>
                  <th className="py-3.5 px-4 text-start">الحالة</th>
                  <th className="py-3.5 px-4 text-start">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 font-bold">
                          {v.isTrucking && v.isClearance ? '🚚🛃' : v.isTrucking ? '🚚' : '🛃'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block text-sm">{v.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{v.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {v.isTrucking && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 ring-1 ring-brand-200 dark:ring-brand-800">
                            <Truck className="w-3 h-3" />
                            نقل بري
                          </span>
                        )}
                        {v.isClearance && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800">
                            <ShieldCheck className="w-3 h-3" />
                            تخليص جمركي
                          </span>
                        )}
                        {v.isTrucking && v.isClearance && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                            مزدوج (Dual)
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1 text-xs">
                        {v.contacts.slice(0, 2).map((c) => (
                          <div key={c.id} className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</span>
                            <span className="text-[11px] text-slate-400">({c.title})</span>
                          </div>
                        ))}
                        <button
                          onClick={() => setSelectedVendorForContacts(v)}
                          className="text-[11px] text-brand-600 hover:text-brand-700 font-bold block"
                        >
                          عرض الفريق ({v.contacts.length}) +
                        </button>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white block">{v.city}</span>
                      <span className="text-slate-400 text-[11px]">{v.address || '—'}</span>
                    </td>

                    <td className="py-4 px-4 text-xs font-mono">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">{v.taxId}</span>
                      <span className="text-slate-400 text-[11px]">{v.commercialRegister || '—'}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        v.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {v.isActive ? 'نشط ومفعل' : 'معطّل'}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedVendorForProfile(v)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#FF5E1E] hover:bg-orange-50 dark:hover:bg-orange-950/30 transition cursor-pointer"
                          title="استعراض بروفايل وملف المورد الشامل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedVendorForContacts(v)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="إدارة مسؤولي الاتصال"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manage Contacts Modal */}
      {selectedVendorForContacts && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedVendorForContacts(null)}
          title={`مسؤولي الاتصال — ${selectedVendorForContacts.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="space-y-2 max-h-60 overflow-y-auto pe-1">
              {selectedVendorForContacts.contacts.map((c) => (
                <div key={c.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm block">{c.name}</span>
                    <span className="text-slate-400 text-[11px]">{c.title}</span>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-mono">
                      <span>{c.phone}</span>
                      <span>• {c.email}</span>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold transition flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    واتساب
                  </a>
                </div>
              ))}
            </div>

            {/* Add Contact Form */}
            <form onSubmit={handleAddContact} className="p-3.5 rounded-xl border border-dashed border-brand-300 dark:border-brand-800 bg-brand-50/30 dark:bg-brand-950/20 space-y-3">
              <span className="font-bold text-slate-900 dark:text-white block">إضافة جهة اتصال جديدة للمورد:</span>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="اسم الشخص المسؤول"
                  value={newContactForm.name}
                  onChange={(e) => setNewContactForm({ ...newContactForm, name: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
                <input
                  type="text"
                  required
                  placeholder="المسمى الوظيفي (مدير حركة، مخلص جمركي...)"
                  value={newContactForm.title}
                  onChange={(e) => setNewContactForm({ ...newContactForm, title: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  dir="ltr"
                  placeholder="رقم الهاتف والموبايل"
                  value={newContactForm.phone}
                  onChange={(e) => setNewContactForm({ ...newContactForm, phone: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                />
                <input
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={newContactForm.email}
                  onChange={(e) => setNewContactForm({ ...newContactForm, email: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold transition shadow-sm"
                >
                  إضافة المسؤول
                </button>
              </div>
            </form>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedVendorForContacts(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Vendor Modal */}
      {isCreateOpen && (
        <CreateVendorModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(newV) => setVendors([newV, ...vendors])}
        />
      )}

      {/* Vendor Profile & Dossier Modal */}
      {selectedVendorForProfile && (
        <Modal
          isOpen={!!selectedVendorForProfile}
          onClose={() => setSelectedVendorForProfile(null)}
          title={`بروفايل المورد اللوجستي • ${selectedVendorForProfile.name}`}
          maxWidth="lg"
        >
          <div className="space-y-5">
            {/* Header badges & rating */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">مورد معتمد بالمنظومة</span>
                {selectedVendorForProfile.isTrucking && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-[#FF5E1E]">
                    نقل بري
                  </span>
                )}
                {selectedVendorForProfile.isClearance && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    تخليص جمركي
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>تقييم الأداء: 98.6%</span>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block">أذون الصرف المسددة</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono mt-0.5 block">385K EGP</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block">أوامر النقل المنفذة</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono mt-0.5 block">64 رحلة</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block">معدل دقة المواعيد</span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">99.1%</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block">الشحنات الجارية</span>
                <span className="text-sm font-extrabold text-[#FF5E1E] font-mono mt-0.5 block">3 شحنات</span>
              </div>
            </div>

            {/* Legal & Bank Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#FF5E1E]" />
                  <span>البيانات الرسمية والتراخيص</span>
                </h4>
                <div className="flex justify-between">
                  <span className="text-slate-400">الرقم الضريبي:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedVendorForProfile.taxId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">السجل التجاري:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedVendorForProfile.commercialRegister || 'CR-10492'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">نطاق التغطية:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedVendorForProfile.city} • كافة الموانئ</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                  <span>الحساب البنكي المعتمد للصرف</span>
                </h4>
                <div className="flex justify-between">
                  <span className="text-slate-400">اسم البنك:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">البنك التجاري الدولي (CIB)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">رقم الحساب:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">1000-2948-1829</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">الآيبان IBAN:</span>
                  <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">EG3800100029481829000192</span>
                </div>
              </div>
            </div>

            {/* Team Contacts */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">فريق التشغيل الميداني للمورد:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedVendorForProfile.contacts.map((ct: VendorContact) => (
                  <div key={ct.id} className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{ct.name}</span>
                      <span className="text-[11px] text-slate-400">{ct.title}</span>
                    </div>
                    <a
                      href={`tel:${ct.phone}`}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                      title="اتصال مباشر"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedVendorForProfile(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                إغلاق
              </button>
              <a
                href="/disbursements"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition"
              >
                <CreditCard className="w-4 h-4" />
                <span>إصدار إذن صرف للمورد (Disbursement)</span>
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ── Create Vendor Modal ──────────────────────────────── */
const CreateVendorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (v: Vendor) => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: '',
    isTrucking: true,
    isClearance: false,
    phone: '',
    email: '',
    city: 'القاهرة',
    address: '',
    taxId: '',
    commercialRegister: '',
    contactName: '',
    contactTitle: '',
    contactPhone: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newVendor: Vendor = {
      id: String(Date.now()),
      name: form.name,
      isTrucking: form.isTrucking,
      isClearance: form.isClearance,
      phone: form.phone,
      email: form.email,
      city: form.city,
      address: form.address,
      taxId: form.taxId || 'EG-TAX-PENDING',
      commercialRegister: form.commercialRegister,
      isActive: true,
      contacts: form.contactName
        ? [
            {
              id: String(Date.now() + 1),
              name: form.contactName,
              title: form.contactTitle || 'المسؤول المباشر',
              phone: form.contactPhone || form.phone,
              email: form.email,
            },
          ]
        : [],
    };

    onSuccess(newVendor);
    onClose();
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

        {/* Dual Classification checkboxes (Voice note) */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <span className="font-bold text-slate-800 dark:text-slate-200 block">تصنيف الخدمات (يمكن اختيار كليهما):</span>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.isTrucking}
                onChange={(e) => setForm({ ...form, isTrucking: e.target.checked })}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
              />
              <Truck className="w-4 h-4 text-brand-600" />
              خدمات النقل البري (Trucking)
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.isClearance}
                onChange={(e) => setForm({ ...form, isClearance: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              خدمات التخليص الجمركي (Clearance)
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">المدينة أو المنطقة *</label>
            <input
              type="text"
              required
              placeholder="الإسكندرية، السخنة، العاشر..."
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">رقم الهاتف الرئيسي *</label>
            <input
              type="text"
              required
              dir="ltr"
              placeholder="+20 100 000 0000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">الرقم الضريبي *</label>
            <input
              type="text"
              required
              placeholder="EG-TAX-000-000"
              value={form.taxId}
              onChange={(e) => setForm({ ...form, taxId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">السجل التجاري</label>
            <input
              type="text"
              placeholder="CR-00000"
              value={form.commercialRegister}
              onChange={(e) => setForm({ ...form, commercialRegister: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>
        </div>

        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
          <span className="font-bold text-slate-800 dark:text-slate-200 block">مسؤول الاتصال الرئيسي:</span>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="اسم الشخص"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
            <input
              type="text"
              placeholder="الوظيفة (حركة / تخليص)"
              value={form.contactTitle}
              onChange={(e) => setForm({ ...form, contactTitle: e.target.value })}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
            <input
              type="text"
              dir="ltr"
              placeholder="الموبايل المباشر"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
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
            حفظ المورد
          </button>
        </div>
      </form>
    </Modal>
  );
};
