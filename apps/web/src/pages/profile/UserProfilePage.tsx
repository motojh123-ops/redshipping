import React, { useState } from 'react';
import {
  User, Mail, Phone, Shield, Key, Clock, CheckCircle2, AlertCircle,
  Lock, Save, FileText, Loader2, Eye, EyeOff, CalendarDays, RefreshCw, Building2
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

interface MeResponse {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: string;
  companyId: string;
  companyName?: string;
  lastLoginAt?: string | null;
  createdAt?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'مدير النظام',
  company_admin: 'مدير الشركة',
  sales_rep: 'مندوب مبيعات',
  pricing_officer: 'مسؤول التسعير',
  ops_officer: 'مسؤول عمليات',
  clearance_broker: 'مخلّص جمركي',
  accountant: 'محاسب',
  client_portal: 'بوابة عميل',
  agent_portal: 'بوابة وكيل',
};

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '—';
  }
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

export const UserProfilePage: React.FC = () => {
  const { user, login, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'permissions' | 'activity'>('info');

  // Profile form state — initialized from the auth store, refreshed from GET /auth/me
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState<string>('');

  // Full profile from the server (role, join date, last login, company)
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Security form
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data: MeResponse = await api.get('/auth/me');
      setMe(data);
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone ?? '');
    } catch {
      // Keep auth-store values as fallback and show an honest error
      showToast('تعذر تحميل البيانات من الخادم — يتم عرض البيانات المحفوظة محلياً', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSavingProfile(true);
    try {
      const updated: MeResponse = await api.patch('/auth/me', { name, email, phone: phone || undefined });
      // Sync the auth store so the navbar reflects the new name immediately
      if (user && token) {
        login(
          { ...user, name: updated.name ?? name, email: updated.email ?? email },
          token,
          localStorage.getItem('banna_refresh_token') || '',
        );
      }
      setMe((prev) => (prev ? { ...prev, ...updated } : prev));
      showToast('تم حفظ وتحديث البيانات الشخصية بنجاح!');
    } catch (err: any) {
      setFormError(err?.message || 'تعذر حفظ البيانات — حاول مجدداً');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newPass || newPass !== confirmPass) {
      setFormError('كلمتا المرور غير متطابقتين');
      return;
    }
    if (newPass.length < 8) {
      setFormError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword: currentPass, newPassword: newPass });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      showToast('تم تحديث كلمة المرور بنجاح!');
    } catch (err: any) {
      setFormError(err?.message || 'تعذر تحديث كلمة المرور — تحقق من كلمة المرور الحالية');
    } finally {
      setSavingPassword(false);
    }
  };

  const roleLabel = ROLE_LABELS[me?.role || user?.role || ''] || me?.role || user?.role || '—';

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-20 start-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-white font-bold text-sm shadow-xl flex items-center gap-2 ${
            toastType === 'success'
              ? 'bg-emerald-600 shadow-emerald-600/30'
              : 'bg-red-600 shadow-red-600/30'
          }`}
        >
          {toastType === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
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
              <span>جلسة آمنة عبر JWT</span>
            </span>
          </div>
        </div>

        {/* Profile Avatar & Info Row */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-14 mb-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-start">
              {/* Avatar (initials — avatar upload not wired to backend yet) */}
              <div className="relative">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-amber-400 via-[#FF5E1E] to-rose-600 text-white font-black text-3xl sm:text-4xl flex items-center justify-center ring-4 ring-white dark:ring-[#121620] shadow-xl overflow-hidden">
                  {(name || me?.name || user?.name || '؟').charAt(0)}
                </div>
              </div>

              {/* Names & Titles */}
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {loading && !me ? (user?.name || '...') : (name || me?.name || user?.name || '—')}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-[#FF5E1E] text-xs font-bold border border-orange-500/20">
                    {roleLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span dir="ltr">{email || me?.email || user?.email || '—'}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{me?.companyName || user?.companyName || '—'}</span>
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Badges — real data only */}
            <div className="flex items-center justify-center gap-2">
              <div className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] text-center">
                <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 justify-center">
                  <CalendarDays className="w-3 h-3" />
                  تاريخ الانضمام
                </div>
                <div className="text-xs font-black text-slate-700 dark:text-slate-300">{formatDate(me?.createdAt)}</div>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] text-center">
                <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 justify-center">
                  <Clock className="w-3 h-3" />
                  آخر دخول
                </div>
                <div className="text-xs font-black text-slate-700 dark:text-slate-300">{formatDateTime(me?.lastLoginAt)}</div>
              </div>
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
            <span>البيانات الشخصية</span>
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
            <span>الأمان وكلمة المرور</span>
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
            <span>الصلاحيات والأدوار</span>
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
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-[#FF5E1E]" />
                  <span>المعلومات الشخصية والاتصال</span>
                </h2>
                <button
                  type="button"
                  onClick={loadProfile}
                  title="تحديث من الخادم"
                  className="p-2 rounded-xl bg-slate-100 dark:bg-[#181D2A] text-slate-500 hover:text-[#FF5E1E] transition cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loading ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs font-bold">جارٍ تحميل البيانات من الخادم...</span>
                </div>
              ) : (
                <>
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
                        البريد الإلكتروني
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#262E40] bg-slate-50 dark:bg-[#181D2A] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#FF5E1E]/20 focus:border-[#FF5E1E] transition"
                        dir="ltr"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        رقم الهاتف
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="—"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#262E40] bg-slate-50 dark:bg-[#181D2A] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#FF5E1E]/20 focus:border-[#FF5E1E] transition text-left"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        الدور في النظام
                      </label>
                      <input
                        type="text"
                        value={roleLabel}
                        disabled
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#262E40] bg-slate-100 dark:bg-[#131926] text-slate-500 dark:text-slate-400 text-xs cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF5E1E] hover:bg-[#EA580C] disabled:opacity-60 text-white text-xs font-bold shadow-lg shadow-orange-500/25 transition cursor-pointer"
                    >
                      {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>{savingProfile ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Side Info / Digital Signature */}
          <div className="space-y-6">
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#FF5E1E]" />
                <span>التوقيع الرقمي</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                توقيع مبني على الاسم المسجل في النظام — رفع صورة توقيع مخصصة غير مدمج بعد.
              </p>
              <div className="h-28 rounded-2xl bg-slate-50 dark:bg-[#181D2A] border-2 border-dashed border-slate-200 dark:border-[#262E40] flex items-center justify-center flex-col gap-1.5 text-center p-4">
                <span className="font-serif italic font-bold text-lg text-slate-700 dark:text-slate-200 tracking-wider">
                  {name || me?.name || user?.name || '—'}
                </span>
                <span className="text-[10px] text-slate-400">توقيع تلقائي من بيانات الحساب</span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB CONTENT: 2. Security & Password */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Password Change — real endpoint */}
          <form onSubmit={handleUpdatePassword} className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm space-y-5 self-start">
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
                  placeholder="8 أحرف على الأقل"
                  required
                  minLength={8}
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

            {formError && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5E1E] to-[#EA580C] disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:brightness-105 transition cursor-pointer"
              >
                {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                <span>{savingPassword ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}</span>
              </button>
            </div>
          </form>

          {/* Security status — honest states only (no fake 2FA / sessions) */}
          <div className="space-y-6">
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>حالة الحماية</span>
              </h3>
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="block font-bold">كلمات المرور مشفرة (bcrypt) على الخادم</span>
                  <span className="block text-emerald-600/80 dark:text-emerald-400/80">
                    الجلسات مؤمنة برموز JWT قصيرة الأجل مع رمز تحديث منفصل.
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] text-xs text-slate-500 dark:text-slate-400">
                المصادقة الثنائية (2FA) وسجل الجلسات النشطة غير مدمجين في الباك-اند بعد — سيظهران هنا عند إضافتهما.
              </div>
            </div>

            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1E2638] shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                <span>آخر تسجيل دخول</span>
              </h3>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">من الخادم</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{formatDateTime(me?.lastLoginAt)}</span>
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
                  جدول الصلاحيات
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تُعرض الصلاحيات الفعلية المرتبطة بدورك من إعدادات النظام — لم يتم ربط جدول صلاحيات تفصيلي بالباك-اند بعد.
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs border border-purple-500/20">
                الدور: {roleLabel}
              </span>
            </div>

            <div className="overflow-x-auto">
              <div className="py-14 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#181D2A] text-slate-400 flex items-center justify-center mb-3">
                  <Shield className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-1">لا يوجد جدول صلاحيات مفصّل</h4>
                <span className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  الصلاحيات تُطبق حالياً على مستوى الدور في الـ API (Roles Guard). جدول صلاحيات لكل موديول غير مدمج بعد.
                </span>
              </div>
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
                <span>سجل النشاطات والإجراءات الأخيرة</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                آخر ظهور مسجل لحسابك من قاعدة البيانات.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">آخر تسجيل دخول</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(me?.lastLoginAt)}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40] flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">تاريخ إنشاء الحساب</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(me?.createdAt)}</span>
            </div>

            <div className="py-10 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#181D2A] text-slate-400 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-1">سجل النشاطات التفصيلي غير مدمج بعد</h4>
              <span className="text-xs text-slate-400 max-w-sm leading-relaxed">
                لا يوجد بعد نقطة نهاية (endpoint) توثّق نشاطات المستخدم من الباك-اند. عند ربطها سيظهر السجل الحقيقي هنا.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
