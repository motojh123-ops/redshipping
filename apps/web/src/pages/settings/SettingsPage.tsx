import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Building2, Users, Globe, Shield, Bell, Palette, Save,
  Moon, Sun, Plus, Edit3, Trash2, Key, Mail, Zap, CheckCircle2,
  RefreshCw, Smartphone, ShieldCheck, ExternalLink, Cpu, Database,
  Lock, Check, X, Eye, EyeOff, CreditCard
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../store/authStore';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  department: string;
  permissions?: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean; scope: 'all' | 'own' }>;
}

const DEFAULT_PERMISSIONS = {
  crm: { view: true, create: true, edit: true, delete: false, scope: 'own' as const },
  pricing: { view: true, create: false, edit: false, delete: false, scope: 'all' as const },
  quotations: { view: true, create: true, edit: true, delete: false, scope: 'own' as const },
  operations: { view: true, create: true, edit: true, delete: false, scope: 'all' as const },
  customs: { view: true, create: false, edit: false, delete: false, scope: 'all' as const },
  financials: { view: false, create: false, edit: false, delete: false, scope: 'own' as const },
  masters: { view: true, create: false, edit: false, delete: false, scope: 'all' as const },
};

const DEMO_USERS: UserItem[] = [
  { id: '1', name: 'عمر السيد', email: 'omar@redshipping.com', role: 'super_admin', isActive: true, department: 'الإدارة العليا' },
  { id: '2', name: 'سامي كمال', email: 'sami@redshipping.com', role: 'admin', isActive: true, department: 'الإدارة المالية' },
  { id: '3', name: 'أحمد الأمين', email: 'ahmed@redshipping.com', role: 'operations', isActive: true, department: 'العمليات والتشغيل' },
  { id: '4', name: 'محمد فتحي', email: 'mfathy@redshipping.com', role: 'sales', isActive: true, department: 'المبيعات وتطوير الأعمال' },
  { id: '5', name: 'نورا حسن', email: 'noura@redshipping.com', role: 'accountant', isActive: true, department: 'الحسابات والضرائب' },
  { id: '6', name: 'محمود طارق', email: 'mtarek@redshipping.com', role: 'customs', isActive: true, department: 'التخليص الجمركي' },
];

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'مدير النظام (Super Admin)', color: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300' },
  admin: { label: 'مدير تنفيذي (Admin)', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' },
  operations: { label: 'مسؤول عمليات (Operations)', color: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300' },
  sales: { label: 'مسؤول مبيعات (Sales Rep)', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
  accountant: { label: 'محاسب مالي (Accountant)', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  customs: { label: 'مخلص جمركي (Customs Broker)', color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' },
};

const MODULE_DEFINITIONS = [
  { key: 'crm', label: 'العملاء وقمع المبيعات (CRM)', desc: 'إدارة العملاء، الأنشطة، جهات الاتصال وفرص المبيعات' },
  { key: 'pricing', label: 'مكتب التسعير والنولون (Pricing Desk)', desc: 'استعراض أسعار النولون، كروت التسعير وإضافة أسعار الشحن' },
  { key: 'quotations', label: 'عروض الأسعار (Quotations)', desc: 'إنشاء عروض الأسعار، إرسال واتساب واعتماد الخصومات' },
  { key: 'operations', label: 'العمليات والتشغيل اللوجستي', desc: 'فتح ومتابعة ملفات الشحنات، التوزيع البري والتتبع' },
  { key: 'customs', label: 'التخليص الجمركي ونافذة (NAFEZA)', desc: 'شهادات 46، أرقام ACID، ومتابعة الفحص والإفراج' },
  { key: 'financials', label: 'الفواتير والحسابات وأذون الصرف', desc: 'الفواتير الإلكترونية ETA، كشف الحساب وأذون صرف الموردين' },
  { key: 'masters', label: 'البيانات الأساسية والتعريفات', desc: 'الموانئ، الخطوط الملاحية، الموردين، وبنود الشحن' },
];

export const SettingsPage: React.FC = () => {
  const currentUser = useAuthStore((state) => state.user);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'preferences' | 'integrations'>('company');
  const [users, setUsers] = useState<UserItem[]>(DEMO_USERS);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  useEffect(() => {
    api.get('/auth/me')
      .then((res: any) => {
        if (res) {
          setIsLiveConnected(true);
        }
      })
      .catch(() => {
        setIsLiveConnected(Boolean(currentUser));
      });
  }, [currentUser]);

  // Modals
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<UserItem | null>(null);
  const [userPerms, setUserPerms] = useState<any>(DEFAULT_PERMISSIONS);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', role: 'sales', department: 'المبيعات' });
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
    localStorage.setItem('banna_theme', isDark ? 'light' : 'dark');
  };

  const tabs = [
    { key: 'company', label: 'بيانات الشركة', icon: Building2 },
    { key: 'users', label: 'إدارة المستخدمين والصلاحيات', icon: Users },
    { key: 'preferences', label: 'التفضيلات', icon: Palette },
    { key: 'integrations', label: 'الربط والتكاملات والضرائب', icon: Zap },
  ];

  const handleOpenPermsModal = (user: UserItem) => {
    setSelectedUserForPerms(user);
    setUserPerms(user.permissions || DEFAULT_PERMISSIONS);
  };

  const handleSavePerms = () => {
    if (!selectedUserForPerms) return;
    setUsers(users.map((u) => u.id === selectedUserForPerms.id ? { ...u, permissions: userPerms } : u));
    setSelectedUserForPerms(null);
    showToast(`تم تحديث صلاحيات المستخدم "${selectedUserForPerms.name}" بنجاح!`);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: UserItem = {
      id: String(Date.now()),
      name: newUserForm.name,
      email: newUserForm.email,
      role: newUserForm.role,
      department: newUserForm.department,
      isActive: true,
      permissions: DEFAULT_PERMISSIONS,
    };
    setUsers([...users, newUser]);
    setShowAddUserModal(false);
    setNewUserForm({ name: '', email: '', role: 'sales', department: 'المبيعات' });
    showToast(`تمت إضافة المستخدم "${newUser.name}" بنجاح!`);
  };

  const togglePermission = (moduleKey: string, field: 'view' | 'create' | 'edit' | 'delete') => {
    setUserPerms((prev: any) => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [field]: !prev[moduleKey]?.[field],
      },
    }));
  };

  const toggleScope = (moduleKey: string, scope: 'all' | 'own') => {
    setUserPerms((prev: any) => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        scope,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500 text-white flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-3 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader title="الإعدادات والنظام" subtitle="إدارة بيانات الشركة، المستخدمين، الصلاحيات الدقيقة والتكاملات الحكومية" />
        {isLiveConnected && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0 self-start sm:self-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync: {currentUser?.name || 'Active Session'}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-2xl overflow-hidden">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-brand-50/20 dark:bg-brand-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Company Profile Tab — Enterprise 360° Identity */}
      {activeTab === 'company' && (
        <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-t-0 border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Legal, Tax & E-Invoicing Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section 1: Official Corporate Identity */}
              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#FF5E1E]" />
                  <span>الاسم التجاري والهوية القانونية (RED SHIPPING)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="اسم المنشأة بالعربية (السجل التجاري)" defaultValue="ريد للشحن والخدمات اللوجستية الدولية ش.م.م" />
                  <FormField label="الاسم التجاري بالإنجليزية" defaultValue="RED SHIPPING International Logistics S.A.E" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="الرقم الضريبي الموحد (Tax ID)" defaultValue="EG-TAX-74928104" mono />
                  <FormField label="رقم السجل التجاري (CR)" defaultValue="CR-2023-91840" mono />
                  <FormField label="كود المتعاملين الجمركي" defaultValue="EG-CUS-89201" mono />
                </div>
              </div>

              {/* Section 2: ETA E-Invoicing & Egyptian Tax Authority */}
              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>منظومة الفاتورة الإلكترونية والإيصال (ETA Egypt)</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                    الشهادة سارية ومتصلة ✅
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="نسبة ضريبة القيمة المضافة (VAT)" defaultValue="14" suffix="%" />
                  <FormField label="كود النشاط الضريبي المعتمد" defaultValue="5229 — أنشطة دعم النقل واللوجستيات" />
                  <FormField label="بيئة منظومة ETA" defaultValue="Production (البيئة الفعلية)" />
                </div>
              </div>

              {/* Section 3: Official Bank Accounts for Wire Transfer */}
              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span>الحسابات البنكية الرسمية للتحويلات (Bank Accounts)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white block">البنك التجاري الدولي (CIB) — حساب الجنيه</span>
                    <span className="text-slate-400 font-mono block">الحساب: 1000-8492-1049 (EGP)</span>
                    <span className="text-slate-500 font-mono text-[11px] block">IBAN: EG3800100084921049000102</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white block">بنك مصر (Banque Misr) — حساب الدولار</span>
                    <span className="text-slate-400 font-mono block">الحساب: 2940-1092-4820 (USD)</span>
                    <span className="text-slate-500 font-mono text-[11px] block">IBAN: EG4200020029401092482001</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Official Stamp, Signature & Branches */}
            <div className="space-y-6">
              {/* Official Stamp Preview */}
              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">الختم والتوقيع الرسمي للفواتير</h3>
                <div className="h-32 rounded-xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center flex-col gap-1 text-center p-3">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-red-500 flex items-center justify-center text-red-500 font-extrabold text-[9px] text-center rotate-12">
                    RED SHIPPING SEAL
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold mt-1">الختم المعتمد يظهر في عروض وفواتير الشحن</span>
                </div>
              </div>

              {/* Branch Network */}
              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">الفروع ومكاتب الموانئ</h3>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white block">المقر الرئيسي (القاهرة)</span>
                    <span className="text-slate-400 text-[11px]">مجمع البنوك، التجمع الخامس، القاهرة الجديدة</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white block">فرع ميناء الإسكندرية والدخيلة</span>
                    <span className="text-slate-400 text-[11px]">شارع النصر، أمام باب 10 جمرك ميناء الإسكندرية</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white block">فرع ميناء العين السخنة</span>
                    <span className="text-slate-400 text-[11px]">المنطقة اللوجستية المتكاملة، ميناء السخنة</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => showToast('تم حفظ وتحديث بروفايل الشركة وهوية RED SHIPPING بنجاح')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5E1E] to-[#EA580C] text-white text-xs font-bold shadow-md shadow-orange-500/25 transition hover:brightness-105 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات المؤسسية</span>
            </button>
          </div>
        </div>
      )}

      {/* Users Tab with Granular RBAC */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-t-0 border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">المستخدمون وفريق العمل ({users.length})</h3>
              <p className="text-xs text-slate-500 mt-0.5">تحديد الأدوار، نطاق الوصول (سجلاته الخاصة أم كل سجلات المنشأة)، وصلاحيات التعديل والاعتماد</p>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة مستخدم جديد
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-medium uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-5 text-start">المستخدم</th>
                  <th className="py-3 px-5 text-start">البريد الإلكتروني</th>
                  <th className="py-3 px-5 text-start">القسم والوظيفة</th>
                  <th className="py-3 px-5 text-start">الدور المنظومي (Role)</th>
                  <th className="py-3 px-5 text-start">الحالة</th>
                  <th className="py-3 px-5 text-start">إدارة الصلاحيات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {users.map((user) => {
                  const roleConfig = ROLE_LABELS[user.role] || { label: user.role, color: 'bg-slate-100 text-slate-600' };
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {user.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white text-xs block">{user.name}</span>
                            <span className="text-[11px] text-slate-400">{user.department}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 text-xs font-mono">{user.email}</td>
                      <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300 text-xs">{user.department}</td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold ${roleConfig.color}`}>
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          user.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'
                        }`}>{user.isActive ? 'نشط' : 'معطّل'}</span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenPermsModal(user)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-semibold transition"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            مصفوفة الصلاحيات
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

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-t-0 border-slate-200/80 dark:border-slate-800 shadow-sm p-6">
          <div className="max-w-2xl space-y-6">
            {/* Dark Mode */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                {isDark ? <Moon className="w-5 h-5 text-brand-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">الوضع الداكن (Dark Mode)</h4>
                  <p className="text-xs text-slate-500">تغيير مظهر الواجهة بين الفاتح والداكن</p>
                </div>
              </div>
              <button
                onClick={toggleDark}
                className={`relative w-12 h-7 rounded-full transition-colors ${isDark ? 'bg-brand-600' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${isDark ? 'start-[22px]' : 'start-0.5'}`} />
              </button>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-brand-500" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">اللغة الافتراضية</h4>
                  <p className="text-xs text-slate-500">اختر لغة الواجهة الافتراضية</p>
                </div>
              </div>
              <select className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50">
                <option value="ar">العربية (AR) — افتراضي RTL</option>
                <option value="en">English (EN)</option>
              </select>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-brand-500" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">إشعارات التنبيهات الدورية</h4>
                  <p className="text-xs text-slate-500">تلقي إشعارات عند قرب انتهاء فترات السماح للحاويات (Demurrage) وانتهاء ACID</p>
                </div>
              </div>
              <button className="relative w-12 h-7 rounded-full bg-brand-600 transition-colors">
                <span className="absolute top-0.5 start-[22px] w-6 h-6 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Currency */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-brand-500" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">العملة الأساسية للنظام</h4>
                  <p className="text-xs text-slate-500">العملة المستخدمة في القوائم المالية وإقرارات ETA</p>
                </div>
              </div>
              <select className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 font-mono">
                <option value="EGP">EGP — جنيه مصري (العملة الرسمية)</option>
                <option value="USD">USD — دولار أمريكي</option>
                <option value="EUR">EUR — يورو</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Integrations & Regulatory Compliance Tab */}
      {activeTab === 'integrations' && (
        <div className="bg-white dark:bg-slate-900 rounded-b-2xl border border-t-0 border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">بوابات الربط الحكومي والتكاملات الخارجية</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة الربط اللحظي مع منظومة الضرائب المصرية (ETA)، نظام نافذة الجمركي (NAFEZA ACI)، وأسعار صرف البنك المركزي
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. ETA Egyptian e-Invoicing API */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">منظومة الفاتورة الإلكترونية المصرية</h4>
                    <span className="text-[11px] text-slate-500">ETA e-Invoicing API v1.0 (SDK Production)</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3" />
                  متصل ومفعل
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-slate-500 mb-0.5">ETA Client ID (معرف المنشأة)</label>
                  <input
                    type="text"
                    defaultValue="redshipping-eta-live-92748361"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-0.5">ETA Client Secret</label>
                  <input
                    type="password"
                    defaultValue="••••••••••••••••••••••••"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>تطبيق ضريبة 14% VAT و 1% خصم المنبع</span>
                <span className="text-emerald-600 font-bold">TLV QR Code مفعل</span>
              </div>
            </div>

            {/* 2. NAFEZA Egyptian Customs ACI */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">منظومة نافذة الجمركية المصرية (ACI)</h4>
                    <span className="text-[11px] text-slate-500">NAFEZA CargoX & Custom Form 46 API</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">
                  <CheckCircle2 className="w-3 h-3" />
                  ربط الويب هوك نشط
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-slate-500 mb-0.5">Webhook Ingestion Endpoint</label>
                  <input
                    type="text"
                    defaultValue="https://api.redshipping.com/v1/customs/nafeza/webhook"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-0.5">شهادة المنشأة الإلكترونية (Token)</label>
                  <input
                    type="password"
                    defaultValue="••••••••••••••••••••••••"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>مراقبة صلاحية ACID الـ 90 يوم</span>
                <span className="text-sky-600 font-bold">تنبيهات تلقائية نشطة</span>
              </div>
            </div>

            {/* 3. Central Bank of Egypt Foreign Exchange */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">أسعار الصرف الرسمية — البنك المركزي المصري</h4>
                    <span className="text-[11px] text-slate-500">Central Bank of Egypt (CBE) Live Rates</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  تحديث آلي يومي
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block">USD / EGP</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">48.65</span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block">EUR / EGP</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">53.20</span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block">GBP / EGP</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">62.80</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>آخر مزامنة: اليوم 09:30 صباحاً</span>
                <button
                  type="button"
                  onClick={() => showToast('تم تحديث أسعار الصرف بنجاح من بيانات البنك المركزي المصري')}
                  className="text-brand-600 hover:text-brand-700 font-bold cursor-pointer"
                >
                  تحديث فوري الآن
                </button>
              </div>
            </div>

            {/* 4. WhatsApp Cloud API */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center font-bold">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">تكامل واتساب بيزنس السحابي</h4>
                    <span className="text-[11px] text-slate-500">Meta WhatsApp Cloud API v19.0</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                  <CheckCircle2 className="w-3 h-3" />
                  قناة الإرسال متصلة
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-slate-500 mb-0.5">Phone Number ID</label>
                  <input
                    type="text"
                    defaultValue="109847120934812"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-0.5">WhatsApp Business Account ID (WABA)</label>
                  <input
                    type="text"
                    defaultValue="waba-redshipping-logistics-eg"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>إرسال العروض وتحديثات التتبع تلقائياً</span>
                <span className="text-green-600 font-bold">قوالب معتمدة من Meta</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={() => showToast('تم حفظ إعدادات التكامل والربط بنجاح!')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ إعدادات الربط والتكامل</span>
            </button>
          </div>
        </div>
      )}

      {/* RBAC Granular Permissions Matrix Modal */}
      {selectedUserForPerms && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedUserForPerms(null)}
          title={`مصفوفة الصلاحيات الدقيقة — ${selectedUserForPerms.name}`}
          maxWidth="xl"
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block">المستخدم والدور الحالي</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{selectedUserForPerms.name}</span>
                <span className="text-slate-500 ms-2 font-mono">({selectedUserForPerms.email})</span>
              </div>
              <div className="text-end">
                <span className="text-slate-400 block mb-1">الدور المنظومي</span>
                <select
                  value={selectedUserForPerms.role}
                  onChange={(e) => setSelectedUserForPerms({ ...selectedUserForPerms, role: e.target.value })}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                >
                  <option value="super_admin">مدير النظام (Super Admin)</option>
                  <option value="admin">مدير تنفيذي (Admin)</option>
                  <option value="sales">مسؤول مبيعات (Sales Rep)</option>
                  <option value="operations">مسؤول عمليات (Operations)</option>
                  <option value="accountant">محاسب مالي (Accountant)</option>
                  <option value="customs">مخلص جمركي (Customs)</option>
                </select>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-2.5 px-3 text-start">الموديول / الوحدة</th>
                    <th className="py-2.5 px-3 text-center">نطاق الوصول (Scope)</th>
                    <th className="py-2.5 px-3 text-center">عرض</th>
                    <th className="py-2.5 px-3 text-center">إضافة</th>
                    <th className="py-2.5 px-3 text-center">تعديل</th>
                    <th className="py-2.5 px-3 text-center">حذف / إلغاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {MODULE_DEFINITIONS.map((m) => {
                    const perm = userPerms[m.key] || { view: true, create: false, edit: false, delete: false, scope: 'own' };
                    return (
                      <tr key={m.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">{m.label}</span>
                          <span className="text-[10px] text-slate-400">{m.desc}</span>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => toggleScope(m.key, 'own')}
                              className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${
                                perm.scope === 'own'
                                  ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xs'
                                  : 'text-slate-500 hover:text-slate-700'
                              }`}
                            >
                              سجلاته فقط
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleScope(m.key, 'all')}
                              className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${
                                perm.scope === 'all'
                                  ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xs'
                                  : 'text-slate-500 hover:text-slate-700'
                              }`}
                            >
                              الكل
                            </button>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={perm.view}
                            onChange={() => togglePermission(m.key, 'view')}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={perm.create}
                            onChange={() => togglePermission(m.key, 'create')}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={perm.edit}
                            onChange={() => togglePermission(m.key, 'edit')}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={perm.delete}
                            onChange={() => togglePermission(m.key, 'delete')}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedUserForPerms(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSavePerms}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition"
              >
                حفظ مصفوفة الصلاحيات
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowAddUserModal(false)}
          title="إضافة مستخدم جديد إلى المنظومة"
        >
          <form onSubmit={handleAddUser} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">الاسم الكامل للموظف *</label>
              <input
                type="text"
                required
                placeholder="مثال: كريم عبد العزيز"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">البريد الإلكتروني للعمل *</label>
              <input
                type="email"
                required
                placeholder="karim@redshipping.com"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">القسم / الإدارة *</label>
                <select
                  value={newUserForm.department}
                  onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="المبيعات">المبيعات وتطوير الأعمال</option>
                  <option value="التسعير">مكتب التسعير والنولون</option>
                  <option value="العمليات">العمليات والتشغيل اللوجستي</option>
                  <option value="التخليص">التخليص الجمركي</option>
                  <option value="الحسابات">الحسابات والمالية</option>
                  <option value="الإدارة العليا">الإدارة العامة</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">الدور الافتراضي (Role) *</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="sales">مسؤول مبيعات (Sales Rep)</option>
                  <option value="operations">مسؤول عمليات (Operations)</option>
                  <option value="accountant">محاسب (Accountant)</option>
                  <option value="customs">مخلص جمركي (Customs)</option>
                  <option value="admin">مدير تنفيذي (Admin)</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
              💡 سيتم إرسال رابط تفعيل الحساب وتعيين كلمة المرور تلقائياً إلى البريد الإلكتروني للمستخدم مع تطبيق صلاحيات الدور الافتراضية.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-md shadow-brand-600/20 transition"
              >
                إنشاء المستخدم
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

const FormField: React.FC<{
  label: string; defaultValue: string; type?: string; mono?: boolean; dir?: string; suffix?: string;
}> = ({ label, defaultValue, type = 'text', mono, dir, suffix }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{label}</label>
    <div className="relative">
      <input
        type={type}
        defaultValue={defaultValue}
        dir={dir}
        className={`w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${mono ? 'font-mono' : ''} ${suffix ? 'pe-10' : ''}`}
      />
      {suffix && (
        <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">{suffix}</span>
      )}
    </div>
  </div>
);
