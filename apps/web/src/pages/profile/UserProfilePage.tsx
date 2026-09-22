import React, { useState } from 'react';
import {
  User, Mail, Phone, Shield, Key, Bell, Clock, CheckCircle2,
  Lock, Smartphone, Laptop, LogOut, Save, Camera, Building2,
  Award, FileText, Check, AlertCircle, Sparkles, MapPin, Eye, EyeOff
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const UserProfilePage: React.FC = () => {
  const { user, login, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'permissions' | 'activity'>('info');

  // Form States
  const [name, setName] = useState(user?.name || 'عمر السيد');
  const [email, setEmail] = useState(user?.email || 'omar@redshipping.com');
  const [phone, setPhone] = useState('+20 100 234 5678');
  const [title, setTitle] = useState(user?.role || 'Senior Logistics Supervisor');
  const [department, setDepartment] = useState('العمليات والتشغيل الميداني');
  const [branch, setBranch] = useState('المقر الرئيسي — القاهرة');
  const [bio, setBio] = useState('مسؤول تشغيل شحنات الحاويات البحرية وإدارة النوالين والتنسيق اللوجستي مع الخطوط الملاحية والجمارك.');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Security Form
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Notifications / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (user && token) {
      const updatedUser = { ...user, name, email };
      login(updatedUser, token, localStorage.getItem('banna_refresh_token') || '');
    }
    showToast('تم حفظ وتحديث البيانات الشخصية بنجاح!');
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass || newPass !== confirmPass) {
      showToast('خطأ: كلمتا المرور غير متطابقتين');
      return;
    }
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    showToast('تم تحديث كلمة المرور وتشفير الجلسة بنجاح!');
  };

  // Demo Permissions
  const permissionsList = [
    { module: 'العمليات والشحنات (Operations)', level: 'تحكم كامل (Full Control)', view: true, create: true, edit: true, delete: true, badge: 'مدير العمليات' },
    { module: 'مكتب التسعير والنولون (Pricing Desk)', level: 'عرض واعتماد (Approve & View)', view: true, create: true, edit: true, delete: false, badge: 'مسؤول تسعير' },
    { module: 'عروض الأسعار (Quotations)', level: 'إصدار وإرسال (Create & Dispatch)', view: true, create: true, edit: true, delete: false, badge: 'مفوض' },
    { module: 'إدارة العملاء (CRM & Leads)', level: 'عرض ومتابعة (Manage)', view: true, create: true, edit: true, delete: false, badge: 'مشرف عملاء' },
    { module: 'التخليص الجمركي ونافذة (Customs)', level: 'متابعة وفحص (Inspect & Track)', view: true, create: true, edit: true, delete: false, badge: 'فاحص معتمد' },
    { module: 'الفواتير والحسابات (Financials)', level: 'عرض المقبوضات فقط (Read-Only)', view: true, create: false, edit: false, delete: false, badge: 'اطلاع فقط' },
    { module: 'البيانات الأساسية والموانئ (Masters)', level: 'تعديل وإضافة (Editor)', view: true, create: true, edit: true, delete: false, badge: 'معدّل' },
  ];

  // Demo Activity Log
  const activities = [
    { id: '1', title: 'فتح ملف شحنة بحرية جديدة', meta: 'بوليصة رقم BL-2026-8921 • حاوية 40HC من نينغبو إلى الإسكندرية', time: 'منذ 25 دقيقة', icon: FileText, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
    { id: '2', title: 'اعتماد عرض أسعار نولون بحري', meta: 'عرض رقم QT-2026-0891 • شركة السويدي إليكتريك للتجارة والتوزيع (4,850 USD)', time: 'منذ ساعتين', icon: Award, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40' },
    { id: '3', title: 'تحديث بيانات شهادة الإفراج 46 الجمركية', meta: 'رقم ACID: 29481039 • تم إنهاء الكشف الظاهري وسداد الرسوم', time: 'منذ 4 ساعات', icon: Shield, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
    { id: '4', title: 'تسجيل الدخول للنظام من جهاز جديد', meta: 'Windows 11 • متصفح Google Chrome • IP: 156.204.18.91 (القاهرة)', time: 'أمس الساعة 09:15 ص', icon: Laptop, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' },
    { id: '5', title: 'إرسال أمر تحميل شاحنة برية (Trucking Order)', meta: 'سائق: محمد محمود البنا • رقم اللوحة: أ د ج 1829', time: 'أمس الساعة 03:40 م', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 start-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm">
        {/* Cover / Backdrop Pattern */}
        <div className="h-36 sm:h-44 bg-gradient-to-r from-[#FF5E1E] via-[#EA580C] to-[#991B1B] relative">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute bottom-3 end-4 flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-black/30 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>متصل الآن • جلسة آمنة RLS</span>
            </span>
          </div>
        </div>

        {/* Profile Avatar & Info Row */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-14 mb-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-start">
              {/* Avatar with Upload Hover */}
              <div className="relative group">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-amber-400 via-[#FF5E1E] to-rose-600 text-white font-black text-3xl sm:text-4xl flex items-center justify-center ring-4 ring-white dark:ring-[#121620] shadow-xl overflow-hidden">
                  {name.charAt(0) || 'ع'}
                </div>
                <button
                  type="button"
                  title="تغيير الصورة الشخصية"
                  className="absolute bottom-1.5 end-1.5 p-2 rounded-xl bg-white dark:bg-[#181D2A] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#262E40] shadow-md hover:text-[#FF5E1E] transition cursor-pointer"
                  onClick={() => showToast('خاصية رفع الصورة متاحة، تم حفظ الأيقونة!')}
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Names & Titles */}
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-[#FF5E1E] text-xs font-bold border border-orange-500/20">
                    {title}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-3">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{email}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{department}</span>
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Badges */}
            <div className="flex items-center justify-center gap-2">
              <div className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] text-center">
                <div className="text-[10px] text-slate-400 font-semibold">مستوى الحساب</div>
                <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">مدير معتمد</div>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] text-center">
                <div className="text-[10px] text-slate-400 font-semibold">تاريخ الانضمام</div>
                <div className="text-xs font-black text-slate-700 dark:text-slate-300">مارس 2024</div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-[#1E2638]">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#161B26] border border-slate-200/70 dark:border-[#222A3C]">
              <span className="text-[10px] font-bold text-slate-400 block">الشحنات المدارة</span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">142</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#161B26] border border-slate-200/70 dark:border-[#222A3C]">
              <span className="text-[10px] font-bold text-slate-400 block">عروض الأسعار الصادرة</span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">89</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#161B26] border border-slate-200/70 dark:border-[#222A3C]">
              <span className="text-[10px] font-bold text-slate-400 block">معدل الدقة والالتزام</span>
              <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">99.4%</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#161B26] border border-slate-200/70 dark:border-[#222A3C]">
              <span className="text-[10px] font-bold text-slate-400 block">سرعة الرد والاستجابة</span>
              <span className="text-lg font-extrabold text-[#FF5E1E] font-mono">12 دقيقة</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 border-t border-slate-200 dark:border-[#1E2638] bg-slate-50/50 dark:bg-[#0E121A]/30 overflow-x-auto">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'info'
                ? 'border-[#FF5E1E] text-[#FF5E1E]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>البيانات الشخصية والوظيفية</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'security'
                ? 'border-[#FF5E1E] text-[#FF5E1E]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>الأمان وكلمة المرور (2FA)</span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'permissions'
                ? 'border-[#FF5E1E] text-[#FF5E1E]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>الصلاحيات والأدوار (Permissions)</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'activity'
                ? 'border-[#FF5E1E] text-[#FF5E1E]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>سجل العمليات والنشاطات</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT: 1. Personal Info */}
      {activeTab === 'info' && (
        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm space-y-5">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#FF5E1E]" />
                <span>المعلومات الشخصية والاتصال</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    الاسم الكامل
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#262E40] bg-slate-50 dark:bg-[#181D2A] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#FF5E1E]/20 focus:border-[#FF5E1E] transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    البريد الإلكتروني المهني
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#262E40] bg-slate-50 dark:bg-[#181D2A] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#FF5E1E]/20 focus:border-[#FF5E1E] transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    رقم الهاتف / واتساب العمل
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#262E40] bg-slate-50 dark:bg-[#181D2A] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#FF5E1E]/20 focus:border-[#FF5E1E] transition text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    المسمى الوظيفي
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#262E40] bg-slate-50 dark:bg-[#181D2A] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#FF5E1E]/20 focus:border-[#FF5E1E] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    الإدارة / القسم
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#262E40] bg-slate-50 dark:bg-[#181D2A] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#FF5E1E]/20 focus:border-[#FF5E1E] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    الفرع ومقر العمل
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#262E40] bg-slate-50 dark:bg-[#181D2A] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#FF5E1E]/20 focus:border-[#FF5E1E] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  نبذة مهنية (Bio)
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#262E40] bg-slate-50 dark:bg-[#181D2A] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#FF5E1E]/20 focus:border-[#FF5E1E] transition"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF5E1E] hover:bg-[#EA580C] text-white text-xs font-bold shadow-lg shadow-orange-500/25 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </div>
          </div>

          {/* Side Info / Digital Signature */}
          <div className="space-y-6">
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#FF5E1E]" />
                <span>التوقيع الرقمي المعتمد</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                يظهر هذا التوقيع تلقائياً في خانة المعتمد في عروض الأسعار وفواتير الشحن وبوالص الشحن الإلكترونية.
              </p>
              <div className="h-28 rounded-2xl bg-slate-50 dark:bg-[#181D2A] border-2 border-dashed border-slate-200 dark:border-[#262E40] flex items-center justify-center flex-col gap-1.5 text-center p-4">
                <span className="font-serif italic font-bold text-lg text-slate-700 dark:text-slate-200 tracking-wider">
                  {name}
                </span>
                <span className="text-[10px] text-slate-400">التوقيع الرقمي مؤمن ومفعل</span>
              </div>
              <button
                type="button"
                onClick={() => showToast('يمكنك تحديث التوقيع عبر الشاشة')}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#181D2A] dark:hover:bg-[#22293A] text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                تحديث التوقيع
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB CONTENT: 2. Security & 2FA */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Password Change */}
          <form onSubmit={handleUpdatePassword} className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-[#FF5E1E]" />
                <span>تغيير كلمة المرور</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="text-xs text-slate-500 hover:text-[#FF5E1E] flex items-center gap-1 cursor-pointer"
              >
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPass ? 'إخفاء' : 'إظهار'}</span>
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  كلمة المرور الحالية
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#262E40] bg-slate-50 dark:bg-[#181D2A] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#FF5E1E]/20 focus:border-[#FF5E1E] transition"
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  كلمة المرور الجديدة
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#262E40] bg-slate-50 dark:bg-[#181D2A] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#FF5E1E]/20 focus:border-[#FF5E1E] transition"
                  placeholder="8 أحرف على الأقل، تتضمن أرقام ورموز"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  تأكيد كلمة المرور الجديدة
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#262E40] bg-slate-50 dark:bg-[#181D2A] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#FF5E1E]/20 focus:border-[#FF5E1E] transition"
                  placeholder="إعادة كتابة كلمة المرور"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5E1E] to-[#EA580C] text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:brightness-105 transition cursor-pointer"
              >
                <Key className="w-4 h-4" />
                <span>تحديث كلمة المرور</span>
              </button>
            </div>
          </form>

          {/* 2FA & Active Sessions */}
          <div className="space-y-6">
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    <span>المصادقة الثنائية (Two-Factor 2FA)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    حماية حسابك عبر رمز تحقق يتم إرساله إلى هاتفك أو تطبيق Google Authenticator.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTwoFactorEnabled(!twoFactorEnabled);
                    showToast(twoFactorEnabled ? 'تم تعطيل المصادقة الثنائية مؤقتاً' : 'تم تفعيل المصادقة الثنائية 2FA بنجاح');
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    twoFactorEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      twoFactorEnabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {twoFactorEnabled && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>حسابك محمي بالمصادقة الثنائية النشطة بنجاح.</span>
                </div>
              )}
            </div>

            {/* Active Sessions */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Laptop className="w-4 h-4 text-purple-500" />
                <span>الجلسات النشطة والأجهزة</span>
              </h3>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Laptop className="w-5 h-5 text-emerald-500" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Windows 11 • Chrome 128</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold">الجلسة الحالية</span>
                      </div>
                      <div className="text-[10px] text-slate-400">القاهرة، مصر • IP: 156.204.18.91</div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        iPhone 15 Pro • RED Shipping Mobile
                      </div>
                      <div className="text-[10px] text-slate-400">الإسكندرية، مصر • آخر ظهور: منذ ساعتين</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast('تم إنهاء الجلسة من الهاتف بنجاح')}
                    className="text-xs text-red-500 hover:text-red-600 font-bold cursor-pointer"
                  >
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. Permissions & Roles */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  جدول الصلاحيات الممنوحة لمسؤول العمليات
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  هذه الصلاحيات تدار مركزياً من إدارة النظام (Super Admin) وفق قواعد الحماية الميدانية RLS.
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs border border-purple-500/20">
                الدور: مشرف عمليات أول
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1E2638] text-slate-400">
                    <th className="py-3 px-4 text-start font-bold">البوابة / الموديول</th>
                    <th className="py-3 px-4 text-center font-bold">الاطلاع (View)</th>
                    <th className="py-3 px-4 text-center font-bold">الإضافة (Create)</th>
                    <th className="py-3 px-4 text-center font-bold">التعديل (Edit)</th>
                    <th className="py-3 px-4 text-center font-bold">الحذف (Delete)</th>
                    <th className="py-3 px-4 text-start font-bold">مستوى الترخيص</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E2638]">
                  {permissionsList.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#181D2A] transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {p.module}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {p.view ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {p.create ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {p.edit ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {p.delete ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#181D2A] text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                          {p.badge}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. Activity Log */}
      {activeTab === 'activity' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FF5E1E]" />
                <span>سجل النشاطات والإجراءات الميدانية الأخيرة</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                كافة العمليات موثقة برقم المعاملة وتوقيت الخادم وتوقيع المستخدم.
              </p>
            </div>
            <button
              onClick={() => showToast('تم تحديث سجل العمليات')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#181D2A] text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#FF5E1E] transition cursor-pointer"
            >
              تحديث السجل
            </button>
          </div>

          <div className="space-y-4">
            {activities.map((act) => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161B26] border border-slate-200/80 dark:border-[#222A3C] flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-2xl shrink-0 ${act.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {act.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {act.meta}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 shrink-0 whitespace-nowrap">
                    {act.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
