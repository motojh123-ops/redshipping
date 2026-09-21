import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const loginStore = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('admin@redshipping.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
    setLoading(true);

    try {
      const res: any = await api.post('/auth/login', { email: loginEmail, password: loginPass });
      loginStore(res.user, res.accessToken, res.refreshToken);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const handleQuickLogin = (role: 'admin' | 'sales' | 'ops') => {
    let targetEmail = 'admin@redshipping.com';
    if (role === 'sales') targetEmail = 'sales@redshipping.com';
    if (role === 'ops') targetEmail = 'ops@redshipping.com';
    setEmail(targetEmail);
    setPassword('password123');
    performLogin(targetEmail, 'password123');
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Glow effects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-xl shadow-brand-500/25 mb-4">
          <Anchor className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">بَنّا للوجستيات والنقل الدولي</h2>
        <p className="mt-2 text-sm text-slate-400">منظومة إدارة الشحن والتخليص الجمركي متعددة المستأجرين</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute start-3 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 ps-10 pe-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute start-3 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 ps-10 pe-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'جاري الدخول...' : 'تسجيل الدخول للنظام'}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <span className="block text-center text-xs font-medium text-slate-400 mb-3">حسابات تجريبية سريعة:</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="px-2.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                مدير النظام
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('sales')}
                className="px-2.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                مسؤول مبيعات
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('ops')}
                className="px-2.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                مسؤول عمليات
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>PostgreSQL 16 Row-Level Security Enforced</span>
        </div>
      </div>
    </div>
  );
};
