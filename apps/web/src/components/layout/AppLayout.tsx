import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Toaster } from 'sonner';
import { useThemeStore } from '../../store/themeStore';
import { SplashScreen } from '../ui/SplashScreen';
import { CaptainRedWidget } from '../ui/CaptainRedWidget';

export const AppLayout: React.FC = () => {
  const { isDark } = useThemeStore();
  const [forceSplash, setForceSplash] = useState(false);
  const location = useLocation();

  // Mascot assistant is present across all pages EXCEPT the Marine Pricing Matrix page
  const isPricingMatrixPage = location.pathname === '/pricing' || location.pathname.startsWith('/pricing');

  return (
    <div className="flex min-h-screen bg-[#F8F9FC] dark:bg-[#0B0E14] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* 1. Interactive 3D Splash Screen */}
      <SplashScreen
        forceOpen={forceSplash}
        onFinish={() => setForceSplash(false)}
      />

      {/* 2. Main Workspace Layout */}
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main
          key={location.pathname}
          className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto animate-page-enter"
        >
          <Outlet />
        </main>
      </div>

      {/* 3. Floating Interactive Captain Red Mascot Assistant (Available on all pages EXCEPT Pricing Matrix) */}
      {!isPricingMatrixPage && (
        <CaptainRedWidget onReopenSplash={() => setForceSplash(true)} />
      )}

      {/* 4. Global Notifications Toaster */}
      <Toaster 
        theme={isDark ? 'dark' : 'light'} 
        position="top-right"
        toastOptions={{
          className: 'border border-slate-200 dark:border-[#262E40] dark:bg-[#181D2A] text-slate-800 dark:text-white font-sans',
        }}
      />
    </div>
  );
};
