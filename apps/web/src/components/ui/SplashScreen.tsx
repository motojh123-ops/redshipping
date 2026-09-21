import React, { useState, useEffect } from 'react';
import { Ship, Anchor, Sparkles, ArrowRight } from 'lucide-react';
import { AnimatedCaptainRed } from './AnimatedCaptainRed';

interface SplashScreenProps {
  onFinish?: () => void;
  autoCloseDelay?: number; // in milliseconds
  forceOpen?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  autoCloseDelay = 3200,
  forceOpen = false,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(15);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { ar: 'تهيئة محرك الملاحة البحرية ومصفوفة النولون...', en: 'Initializing Maritime Engine & Freight Matrix...' },
    { ar: 'مزامنة 250+ ميناء عالمي وممرات النقل البري...', en: 'Syncing 250+ Global Seaports & Dry Corridors...' },
    { ar: 'ربط منظومة نافذة وإجراءات التخليص الجمركي...', en: 'Connecting Nafeza ACI & Clearance System...' },
    { ar: 'كابتن ريد جاهز للإبحار — مرحباً بك في ريد شيبينج!', en: 'Captain Red is on deck — Welcome to RED SHIPPING!' },
  ];

  useEffect(() => {
    // Check if already shown in this session (unless forced)
    if (!forceOpen) {
      const shown = sessionStorage.getItem('red_shipping_splash_shown');
      if (shown === 'true') {
        setIsVisible(false);
        onFinish?.();
        return;
      }
    }

    // Step progression
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const next = prev + 25;
        if (next >= 75) setActiveStep(3);
        else if (next >= 50) setActiveStep(2);
        else if (next >= 25) setActiveStep(1);
        return next;
      });
    }, autoCloseDelay / 4);

    const timer = setTimeout(() => {
      handleClose();
    }, autoCloseDelay + 400);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [autoCloseDelay, forceOpen]);

  const handleClose = () => {
    setIsFadingOut(true);
    sessionStorage.setItem('red_shipping_splash_shown', 'true');
    setTimeout(() => {
      setIsVisible(false);
      onFinish?.();
    }, 600);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#070A10] text-white select-none transition-all duration-700 ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      dir="rtl"
    >
      {/* Background Animated Maritime Grid & Glow Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Glowing Red & Navy Radial Aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-red-600/20 via-rose-500/10 to-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-red-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />

        {/* Sonar / Radar Rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] border border-red-500/10 rounded-full animate-ping opacity-25 duration-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] border border-rose-500/15 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] border border-blue-500/10 rounded-full" />
      </div>

      {/* Floating Skip Button */}
      <button
        onClick={handleClose}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer backdrop-blur-md"
      >
        <span>تخطي</span>
        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
      </button>

      {/* Centerpiece Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg px-6">
        {/* Articulated Animated Captain Red Character */}
        <div className="relative mb-6">
          <AnimatedCaptainRed
            size="lg"
            isWaving={true}
            interactive={true}
            showSpeechBubble={true}
            speechText="كابتن ريد يرحب بكم في المنظومة! 🫡"
            className="drop-shadow-2xl"
          />
        </div>

        {/* Brand Name & Tagline */}
        <div className="space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold tracking-wider uppercase mb-1">
            <Sparkles className="w-3 h-3 text-red-400" />
            <span>Smart Maritime Operating System</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-red-400 bg-clip-text text-transparent">
            RED SHIPPING
          </h1>
          <p className="text-sm md:text-base text-slate-400 font-medium max-w-md">
            منظومة الشحن البحري، النولون، والخدمات اللوجستية المتكاملة
          </p>
        </div>

        {/* Dynamic Progress & Steps Status */}
        <div className="w-full max-w-sm space-y-3">
          {/* Step Pill */}
          <div className="h-6 flex items-center justify-center">
            <p className="text-xs font-medium text-red-300/90 animate-pulse transition-all duration-300">
              {steps[activeStep].ar}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-2 rounded-full bg-slate-800/80 overflow-hidden border border-white/5 p-[1px]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 transition-all duration-500 ease-out shadow-lg shadow-red-500/50"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Quick Enter Button */}
          <div className="pt-3">
            <button
              onClick={handleClose}
              className="w-full py-2.5 px-5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-xl shadow-red-600/30 hover:shadow-red-600/50 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-red-400/30"
            >
              <span>دخول المنظومة الآن</span>
              <Ship className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Subtle Footer Watermark */}
      <div className="absolute bottom-4 text-center text-[11px] text-slate-500/80 font-mono tracking-wider">
        RED SHIPPING v2.6 • ENTERPRISE LOGISTICS ARCHITECTURE
      </div>
    </div>
  );
};
