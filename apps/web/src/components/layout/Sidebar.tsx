import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Ship,
  ShieldCheck,
  Receipt,
  Database,
  Anchor,
  MapPin,
  Globe2,
  Truck,
  Settings,
  Tag,
  TrendingUp,
  CreditCard,
  Compass,
  Ruler,
  BarChart3,
  Bell,
  Target,
  Banknote,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Sun,
  Moon,
  Globe,
  Sparkles,
  Layers,
  Contact,
} from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

export type PortalKey = 'operations' | 'crm' | 'pricing' | 'customs' | 'financials' | 'masters';

interface PortalDefinition {
  key: PortalKey;
  code: string;
  titleAr: string;
  titleEn: string;
  shortAr: string;
  shortEn: string;
  defaultRoute: string;
  icon: React.FC<any>;
  quickAction?: {
    labelAr: string;
    labelEn: string;
    route: string;
  };
  items: {
    to: string;
    labelAr: string;
    labelEn: string;
    icon: React.FC<any>;
    exact?: boolean;
    badge?: string;
  }[];
}

export const Sidebar: React.FC = () => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useThemeStore();
  const isArabic = i18n.language === 'ar';

  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  const portals: PortalDefinition[] = [
    {
      key: 'operations',
      code: '01',
      titleAr: 'بورتال العمليات والتشغيل',
      titleEn: 'Operations Portal',
      shortAr: 'العمليات',
      shortEn: 'Ops',
      defaultRoute: '/',
      icon: Ship,
      quickAction: {
        labelAr: 'شحنة جديدة',
        labelEn: 'New Shipment',
        route: '/shipments',
      },
      items: [
        { to: '/', labelAr: 'لوحة القيادة والمؤشرات', labelEn: 'Dashboard & KPI', icon: LayoutDashboard, exact: true },
        { to: '/shipments', labelAr: 'ملفات الشحن النشطة', labelEn: 'Active Shipments', icon: Ship, badge: '14' },
        { to: '/dispatch', labelAr: 'النقل البري والشاحنات', labelEn: 'Dispatch & Fleet', icon: Truck },
        { to: '/tracking', labelAr: 'التتبع الملاحي الحي', labelEn: 'Live Vessel Tracking', icon: Compass },
        { to: '/tools', labelAr: 'أدوات التشغيل العالمية', labelEn: 'Global Logistics Suite', icon: Sparkles, badge: 'Pro' },
      ],
    },
    {
      key: 'crm',
      code: '02',
      titleAr: 'بورتال العملاء والمبيعات',
      titleEn: 'CRM & Sales Portal',
      shortAr: 'العملاء',
      shortEn: 'CRM',
      defaultRoute: '/clients',
      icon: Users,
      quickAction: {
        labelAr: 'عميل جديد',
        labelEn: 'New Client',
        route: '/clients',
      },
      items: [
        { to: '/clients', labelAr: 'سجل العملاء والشركات', labelEn: 'Clients Directory', icon: Users },
        { to: '/crm/pipeline', labelAr: 'قمع المبيعات والمتابعات', labelEn: 'Sales Pipeline', icon: Target, badge: 'Live' },
      ],
    },
    {
      key: 'pricing',
      code: '03',
      titleAr: 'بورتال التسعير والنولون',
      titleEn: 'Pricing Desk Portal',
      shortAr: 'التسعير',
      shortEn: 'Pricing',
      defaultRoute: '/pricing',
      icon: TrendingUp,
      quickAction: {
        labelAr: 'حاسبة النولون',
        labelEn: 'Tariff Calculator',
        route: '/pricing',
      },
      items: [
        { to: '/pricing', labelAr: 'حاسبة النولون والتعريفات', labelEn: 'Freight & Tariffs', icon: TrendingUp },
        { to: '/quotations', labelAr: 'عروض الأسعار (Offers)', labelEn: 'Customer Quotations', icon: FileSpreadsheet, badge: '8' },
      ],
    },
    {
      key: 'customs',
      code: '04',
      titleAr: 'بورتال التخليص الجمركي',
      titleEn: 'Customs & Nafeza Portal',
      shortAr: 'الجمارك',
      shortEn: 'Customs',
      defaultRoute: '/customs',
      icon: ShieldCheck,
      quickAction: {
        labelAr: 'ملف نافذة 46',
        labelEn: 'New Dossier',
        route: '/customs',
      },
      items: [
        { to: '/customs', labelAr: 'ملفات نافذة وشهادات 46', labelEn: 'Nafeza & Certificates', icon: ShieldCheck, badge: 'ACID' },
      ],
    },
    {
      key: 'financials',
      code: '05',
      titleAr: 'بورتال المالية والفوترة',
      titleEn: 'Financials & Billing Portal',
      shortAr: 'المالية',
      shortEn: 'Billing',
      defaultRoute: '/invoices',
      icon: Receipt,
      quickAction: {
        labelAr: 'إصدار فاتورة',
        labelEn: 'Create Invoice',
        route: '/invoices',
      },
      items: [
        { to: '/invoices', labelAr: 'الفواتير والضرائب المصرية', labelEn: 'ETA e-Invoices', icon: Receipt, badge: 'ETA' },
        { to: '/disbursements', labelAr: 'أذون صرف الموردين', labelEn: 'Disbursement Vouchers', icon: Banknote },
        { to: '/statement-of-account', labelAr: 'كشوف الحساب والمديونيات', labelEn: 'Statement of Account', icon: CreditCard },
      ],
    },
    {
      key: 'masters',
      code: '06',
      titleAr: 'بورتال المستردات والإعدادات',
      titleEn: 'Masters & Setup Portal',
      shortAr: 'المرجعيات',
      shortEn: 'Masters',
      defaultRoute: '/masters/charge-items',
      icon: Database,
      quickAction: {
        labelAr: 'إضافة بند تسعير',
        labelEn: 'Add Charge Item',
        route: '/masters/charge-items',
      },
      items: [
        { to: '/masters/directory', labelAr: 'أطلس الدول — اضغط على الدولة لإدارة مدنها', labelEn: 'Countries Atlas (cities inside)', icon: Globe2, badge: '250+' },
        { to: '/masters/charge-items', labelAr: 'البنود العامة (Charges)', labelEn: 'Charge Items', icon: Tag },
        { to: '/masters/logistics-categories', labelAr: 'التصنيف اللوجستي (مكتبة)', labelEn: 'Logistics Categories', icon: Layers },
        { to: '/masters/units', labelAr: 'الوحدات — مكتبة شاملة', labelEn: 'Units of Measurement', icon: Ruler },
        { to: '/masters/port-types', labelAr: 'أنواع الموانئ (مكتبة)', labelEn: 'Port Types', icon: Anchor },
        { to: '/masters/ports', labelAr: 'سجل الموانئ (UN/LOCODE)', labelEn: 'Ports & Terminals', icon: MapPin, badge: 'Global' },
        { to: '/masters/shipping-lines', labelAr: 'خطوط الملاحة والاتصالات', labelEn: 'Shipping Lines', icon: Ship },
        { to: '/masters/vendors', labelAr: 'الموردين (نقل وتخليص)', labelEn: 'Vendors & Fleet', icon: Truck },
        { to: '/masters/drivers', labelAr: 'السائقون وأسطول النقل', labelEn: 'Drivers Registry', icon: Contact },
        { to: '/masters/overseas-agents', labelAr: 'وكلاء الشحن بالخارج', labelEn: 'Overseas Agents', icon: Globe2 },
        { to: '/reports', labelAr: 'لوحة التحليلات والتقارير', labelEn: 'Analytics & Reports', icon: BarChart3 },
        { to: '/notifications', labelAr: 'مركز الإشعارات', labelEn: 'Notifications', icon: Bell, badge: '4' },
        { to: '/settings', labelAr: 'إعدادات النظام والـ Tenant', labelEn: 'System Settings', icon: Settings },
      ],
    },
  ];

  // Helper to detect current active portal from URL
  const detectPortal = (pathname: string): PortalKey => {
    if (pathname.startsWith('/clients') || pathname.startsWith('/crm') || pathname.startsWith('/pipeline')) {
      return 'crm';
    }
    if (pathname.startsWith('/pricing') || pathname.startsWith('/quotations')) {
      return 'pricing';
    }
    if (pathname.startsWith('/customs')) {
      return 'customs';
    }
    if (pathname.startsWith('/invoices') || pathname.startsWith('/disbursements') || pathname.startsWith('/statement-of-account')) {
      return 'financials';
    }
    if (
      pathname.startsWith('/masters') ||
      pathname.startsWith('/reports') ||
      pathname.startsWith('/notifications') ||
      pathname.startsWith('/settings')
    ) {
      return 'masters';
    }
    return 'operations';
  };

  const [activePortalKey, setActivePortalKey] = useState<PortalKey>(detectPortal(location.pathname));

  useEffect(() => {
    setActivePortalKey(detectPortal(location.pathname));
  }, [location.pathname]);

  const activePortal = portals.find((p) => p.key === activePortalKey) || portals[0];

  const handlePortalClick = (portal: PortalDefinition) => {
    setActivePortalKey(portal.key);
    if (!isDrawerOpen) {
      setIsDrawerOpen(true);
    }
    // If not on one of this portal's pages, navigate to default
    const isAlreadyInPortal = portal.items.some((item) =>
      item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to),
    );
    if (!isAlreadyInPortal) {
      navigate(portal.defaultRoute);
    }
  };

  const toggleLanguage = () => {
    const nextLng = isArabic ? 'en' : 'ar';
    i18n.changeLanguage(nextLng);
    document.documentElement.dir = nextLng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = nextLng;
    localStorage.setItem('redshipping_lang', nextLng);
  };

  return (
    <aside className="flex h-screen sticky top-0 shrink-0 z-40 select-none transition-all duration-200">
      {/* 1. VERTICAL PORTALS RAIL (شريط البورتالات بالطول) */}
      <div className="w-[72px] bg-[#FFFFFF] dark:bg-[#0E121A] border-e border-slate-200 dark:border-[#1E2638] flex flex-col items-center py-3.5 justify-between shrink-0 transition-colors duration-200 shadow-sm z-20">
        {/* Top: RedShipping Brand Mark */}
        <div className="flex flex-col items-center gap-4 w-full">
          <div
            onClick={() => navigate('/')}
            className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-700 flex items-center justify-center text-white shadow-lg shadow-red-600/35 cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200 border border-red-400/30 group"
            title="RED SHIPPING — Enterprise Maritime Platform"
          >
            <Ship className="w-5 h-5 text-white transition-transform group-hover:scale-110 duration-200" />
          </div>

          <div className="w-8 h-[1px] bg-slate-200 dark:bg-[#1E2638]" />

          {/* Vertical Portals Stack ("بورتالز بالطول ندخل عليها") */}
          <div className="flex flex-col items-center gap-2.5 w-full px-2">
            {portals.map((portal) => {
              const isActive = activePortalKey === portal.key;
              const Icon = portal.icon;

              return (
                <button
                  key={portal.key}
                  onClick={() => handlePortalClick(portal)}
                  aria-label={isArabic ? portal.titleAr : portal.titleEn}
                  className={`group relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#FF5E1E]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0E121A] ${
                    isActive
                      ? 'bg-gradient-to-br from-[#FF5E1E] to-[#EA580C] text-white shadow-lg shadow-orange-500/35 scale-105'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#181D2A]'
                  }`}
                  title={isArabic ? portal.titleAr : portal.titleEn}
                >
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" />
                  <span className="text-[9px] font-bold mt-0.5 tracking-tight scale-90">
                    {isArabic ? portal.shortAr : portal.shortEn}
                  </span>

                  {/* Active Indicator Bar on Side */}
                  {isActive && (
                    <span
                      className={`absolute top-2 bottom-2 w-1 rounded-full bg-white shadow-sm ${
                        isArabic ? '-left-1' : '-right-1'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Rail: Controls & Status */}
        <div className="flex flex-col items-center gap-2.5 w-full px-2">
          <div className="w-8 h-[1px] bg-slate-200 dark:bg-[#1E2638]" />

          {/* Quick Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Light Mode' : 'Dark Mode'}
            className="w-10 h-10 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#FF5E1E]/60 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#FF5E1E] dark:hover:text-[#FF5E1E] hover:bg-slate-100 dark:hover:bg-[#181D2A] transition-colors"
            title={isDark ? 'Light Mode' : 'Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            aria-label="Switch Language"
            className="w-10 h-10 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#FF5E1E]/60 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#FF5E1E] dark:hover:text-[#FF5E1E] hover:bg-slate-100 dark:hover:bg-[#181D2A] text-xs font-bold transition-colors"
            title="Switch Language"
          >
            {isArabic ? 'EN' : 'ع'}
          </button>

          {/* Online RLS Status Indicator */}
          <div className="flex items-center justify-center pt-1" title="Security & Multi-tenant RLS Active">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
          </div>
        </div>
      </div>

      {/* 2. ACTIVE PORTAL WORKSPACE DRAWER (لوحة البورتال النشط) */}
      {isDrawerOpen && (
        <div className="w-60 bg-[#FDFEFE] dark:bg-[#121620] border-e border-slate-200 dark:border-[#1E2638] flex flex-col justify-between shrink-0 transition-colors duration-200 overflow-hidden shadow-sm">
          {/* Top Header of Active Portal */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/80 dark:border-[#1E2638] bg-slate-50/70 dark:bg-[#0E121A]/50 shrink-0">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-[#FF5E1E] shrink-0 font-bold text-xs font-mono">
                {activePortal.code}
              </div>
              <div className="truncate">
                <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {isArabic ? activePortal.titleAr : activePortal.titleEn}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  {isArabic ? 'بورتال مخصص' : 'Dedicated Portal'}
                </div>
              </div>
            </div>

            {/* Collapse Drawer Button */}
            <button
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Collapse Portal Panel"
              className="p-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#FF5E1E]/60 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#1E2638] transition-colors shrink-0"
              title="Collapse Portal Panel"
            >
              {isArabic ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Portal Sub-Items (Clean, Uncrowded, Spacious) */}
          <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
              <span>{isArabic ? 'الوحدات والصفحات' : 'Workspace Modules'}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#181D2A] text-slate-500">
                {activePortal.items.length}
              </span>
            </div>

            {activePortal.items.map((item) => {
              const ItemIcon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                      isActive
                        ? 'bg-gradient-to-r from-[#FF5E1E] to-[#EA580C] text-white shadow-md shadow-orange-500/25'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#181D2A] hover:text-slate-900 dark:hover:text-white'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <ItemIcon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                    <span className="truncate">{isArabic ? item.labelAr : item.labelEn}</span>
                  </div>

                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-200 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Quick Action Card for Active Portal */}
          {activePortal.quickAction && (
            <div className="p-3 m-3 rounded-2xl bg-slate-100/80 dark:bg-[#181D2A] border border-slate-200/80 dark:border-[#1E2638] shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                  {isArabic ? 'إجراء سريع' : 'Quick Action'}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-[#FF5E1E]" />
              </div>
              <button
                onClick={() => navigate(activePortal.quickAction!.route)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-[#FF5E1E] to-[#EA580C] text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:brightness-105 active:scale-98 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isArabic ? activePortal.quickAction.labelAr : activePortal.quickAction.labelEn}</span>
              </button>
            </div>
          )}

          {/* Footer Portal Status */}
          <div className="p-3 border-t border-slate-200/80 dark:border-[#1E2638] bg-slate-50/60 dark:bg-[#0E121A]/40 shrink-0">
            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                {isArabic ? 'النظام متصل وآمن' : 'System Secure'}
              </span>
              <span className="font-mono text-[10px] text-[#FF5E1E]">v2.5</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Re-Open Drawer Button when collapsed */}
      {!isDrawerOpen && (
        <div className="relative">
          <button
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Expand Portal Panel"
            className={`absolute top-4 ${
              isArabic ? 'left-2' : 'right-2'
            } z-30 p-2 rounded-xl bg-white dark:bg-[#181D2A] border border-slate-200 dark:border-[#1E2638] text-slate-500 dark:text-slate-300 hover:text-[#FF5E1E] shadow-md transition-all hover:scale-105`}
            title="Expand Portal Panel"
          >
            {isArabic ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      )}
    </aside>
  );
};
