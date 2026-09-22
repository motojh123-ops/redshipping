import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import {
  Sun,
  Moon,
  Globe,
  Bell,
  Settings,
  ChevronDown,
  LogOut,
  Sparkles,
  LayoutDashboard,
  Package,
  Route,
  TrendingUp,
  Compass,
  BarChart2,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  const toggleLanguage = () => {
    const nextLng = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(nextLng);
    document.documentElement.dir = nextLng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = nextLng;
    localStorage.setItem('redshipping_lang', nextLng);
  };

  const navPills = [
    { label: i18n.language === 'ar' ? 'نظرة عامة' : 'Overview', path: '/', icon: LayoutDashboard },
    { label: i18n.language === 'ar' ? 'الشحنات' : 'Shipments', path: '/shipments', icon: Package },
    { label: i18n.language === 'ar' ? 'المسارات' : 'Routes', path: '/dispatch', icon: Route },
    { label: i18n.language === 'ar' ? 'التسعير' : 'Pricing', path: '/pricing', icon: TrendingUp },
    { label: i18n.language === 'ar' ? 'التتبع' : 'Tracking', path: '/tracking', icon: Compass },
    { label: i18n.language === 'ar' ? 'التحليلات' : 'Analytics', path: '/reports', icon: BarChart2 },
  ];

  return (
    <header className="h-16 bg-white/95 dark:bg-[#121620]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-[#262E40] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200">
      {/* Left: Brand / Tenant Badge */}
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF5E1E] to-[#EA580C] p-2 flex items-center justify-center text-white shadow-md shadow-orange-500/25 group-hover:scale-105 transition-transform duration-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-5 h-5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                RED<span className="text-[#FF5E1E]">SHIPPING</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-[#FF5E1E] border border-orange-500/20">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-none mt-0.5">
              {user?.companyName || 'RED SHIPPING International Logistics S.A.E'}
            </p>
          </div>
        </Link>
      </div>

      {/* Center: Sleek Floating Pill Tabs (Like Fleetly & Fleeex) */}
      <nav className="hidden xl:flex items-center gap-1 p-1 rounded-full bg-slate-100/90 dark:bg-[#181D2A] border border-slate-200 dark:border-[#262E40]">
        {navPills.map((pill) => {
          const isActive = location.pathname === pill.path;
          const Icon = pill.icon;
          return (
            <Link
              key={pill.path}
              to={pill.path}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#22293A]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{pill.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right: Controls & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dark / Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="relative p-2 rounded-full border border-slate-200 dark:border-[#262E40] bg-slate-50 dark:bg-[#181D2A] text-slate-700 dark:text-slate-300 hover:text-[#FF5E1E] dark:hover:text-[#FF5E1E] hover:border-[#FF5E1E]/40 transition-all duration-200 shadow-sm"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400 animate-[spin_8s_linear_infinite]" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-[#262E40] bg-slate-50 dark:bg-[#181D2A] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#22293A] transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-[#FF5E1E]" />
          <span>{i18n.language === 'ar' ? 'English' : 'عربي'}</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => navigate('/notifications')}
          title="Notifications Center"
          className="relative p-2 rounded-full border border-slate-200 dark:border-[#262E40] bg-slate-50 dark:bg-[#181D2A] text-slate-700 dark:text-slate-300 hover:text-[#FF5E1E] transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -end-0.5 w-4 h-4 rounded-full bg-[#FF5E1E] text-white text-[10px] font-bold flex items-center justify-center shadow-md shadow-orange-500/50">
            4
          </span>
        </button>

        {/* Settings button */}
        <button
          onClick={() => navigate('/settings')}
          title="Settings"
          className="hidden md:flex p-2 rounded-full border border-slate-200 dark:border-[#262E40] bg-slate-50 dark:bg-[#181D2A] text-slate-600 dark:text-slate-300 hover:text-[#FF5E1E] transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User Capsule (Fleetly / Fleeex Profile Widget) */}
        <div className="flex items-center gap-2 ps-2 border-s border-slate-200 dark:border-[#262E40]">
          <button
            onClick={() => navigate('/profile')}
            title="الملف الشخصي والحساب (User Profile)"
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-[#181D2A] transition group text-start cursor-pointer"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF5E1E] to-rose-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-[#181D2A] shadow-sm group-hover:scale-105 transition-transform">
                {user?.name?.charAt(0) || 'ع'}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#121620]" />
            </div>

            <div className="text-start hidden md:block">
              <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight group-hover:text-[#FF5E1E] transition-colors">
                {user?.name || 'عمر السيد'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                {user?.role || 'Senior Dispatcher'}
              </span>
            </div>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            title="تسجيل الخروج (Sign out)"
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
