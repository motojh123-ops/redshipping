import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Lightbulb,
  Compass,
  Ship,
  FileSpreadsheet,
  ShieldCheck,
  X,
  ChevronUp,
  PartyPopper,
  Volume2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { AnimatedCaptainRed } from './AnimatedCaptainRed';

interface CaptainRedWidgetProps {
  onReopenSplash?: () => void;
}

const LOGISTICS_TIPS = [
  'تأكد من مطابقة رقم الحاوية لمواصفة ISO 6346 العالمية لتجنب غرامات تأخير الشحنة في الميناء.',
  'رقم القيد الجمركي المسبق (ACID) في منظومة نافذة المصرية صالح لمدة 90 يوماً فقط من تاريخ صدوره.',
  'احسب أيام السماح (Free Days) بدقة قبل خروج الحاوية من الرصيف لتجنب غرامات الأرضيات (Demurrage).',
  'يمكنك تحويل أي عرض سعر مقبول بضغطة زر واحدة إلى ملف شحن نشط بكافة تفاصيله وحاوياته.',
  'المصروفات النثرية في الميناء (THC، كشف، حراسة) يمكنك توثيقها فوراً في أذون الصرف (Disbursements).',
  'عند إضافة ميناء جاف غير مسجل (مثل 6 أكتوبر أو السادات)، سيتم حفظه تلقائياً في دليل الشركة.',
];

export const CaptainRedWidget: React.FC<CaptainRedWidgetProps> = ({ onReopenSplash }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [hasNewTip, setHasNewTip] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isWaving, setIsWaving] = useState(false);

  useEffect(() => {
    const waveInterval = setInterval(() => {
      setIsWaving(true);
      setTimeout(() => setIsWaving(false), 2000);
    }, 15000);
    return () => clearInterval(waveInterval);
  }, []);

  const nextTip = () => {
    setTipIndex((prev) => (prev + 1) % LOGISTICS_TIPS.length);
  };

  const triggerCelebration = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  return (
    <div className="fixed bottom-5 end-5 z-40 select-none print:hidden font-sans" dir="rtl">
      {/* Confetti Animation Overlay when triggered */}
      {showConfetti && (
        <div className="absolute -top-24 end-0 flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 via-red-500 to-rose-600 text-white font-bold text-xs shadow-2xl shadow-red-500/50 animate-bounce">
          <PartyPopper className="w-4 h-4 text-yellow-200" />
          <span>عاش يا بطل! تم بنجاح مع RED SHIPPING! 🚢🎉</span>
        </div>
      )}

      {/* Expanded Interactive Assistant Card */}
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 rounded-3xl bg-white dark:bg-[#121622] border-2 border-red-500/30 dark:border-red-500/20 shadow-2xl shadow-red-950/20 overflow-hidden transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header Banner */}
          <div className="relative p-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-800 text-white overflow-hidden">
            <div className="absolute top-0 end-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/80 shadow-md bg-slate-900 shrink-0 flex items-center justify-center">
                  <AnimatedCaptainRed size="sm" isWaving={isWaving} interactive={false} />
                  <span className="absolute bottom-0 end-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-sm text-white">كابتن ريد (Captain Red)</h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/20 text-yellow-200">AI</span>
                  </div>
                  <p className="text-[11px] text-red-100/90 font-medium">مساعدك اللوجستي الذكي في ريد شيبينج</p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Speech & Tips Box */}
          <div className="p-4 space-y-3.5 bg-slate-50/70 dark:bg-[#0E121B]">
            {/* Speech Bubble */}
            <div className="relative p-3.5 rounded-2xl bg-white dark:bg-[#181E2C] border border-red-500/15 shadow-sm text-slate-700 dark:text-slate-200">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs leading-relaxed font-medium">
                  {LOGISTICS_TIPS[tipIndex]}
                </div>
              </div>

              {/* Refresh Tip Button */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 dark:text-slate-500 text-[10px]">نصيحة بحرية معتمدة</span>
                <button
                  onClick={nextTip}
                  className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-700 font-bold transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>نصيحة أخرى</span>
                </button>
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 px-1">
                <Zap className="w-3 h-3 text-red-500" />
                <span>اختصارات العمليات السريعة</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    navigate('/pricing');
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-[#181E2C] hover:bg-red-50 dark:hover:bg-red-950/20 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition text-start group cursor-pointer shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                  <span className="truncate">عرض سعر جديد</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/tracking');
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-[#181E2C] hover:bg-red-50 dark:hover:bg-red-950/20 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition text-start group cursor-pointer shadow-sm"
                >
                  <Compass className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span className="truncate">تتبع شحنة بحرية</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/customs');
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-[#181E2C] hover:bg-red-50 dark:hover:bg-red-950/20 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition text-start group cursor-pointer shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span className="truncate">نافذة والجمارك</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/masters/ports');
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-[#181E2C] hover:bg-red-50 dark:hover:bg-red-950/20 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition text-start group cursor-pointer shadow-sm"
                >
                  <Ship className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
                  <span className="truncate">موانئ العالم</span>
                </button>
              </div>
            </div>

            {/* Bottom Fun Controls */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={triggerCelebration}
                className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-500 font-bold px-2 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer"
              >
                <PartyPopper className="w-3.5 h-3.5" />
                <span>احتفال بإنجاز!</span>
              </button>

              {onReopenSplash && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onReopenSplash();
                  }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-red-500" />
                  <span>شاشة الترحيب (Splash)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Animated Mascot Trigger Button */}
      <div className="relative flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => {
              setIsOpen(!isOpen);
              setHasNewTip(false);
            }}
            className="relative p-1 transition-all duration-300 transform active:scale-95 cursor-pointer group focus:outline-none"
            title="كابتن ريد — المساعد اللوجستي"
          >
            {/* Real Articulated Animated Character with Cursor-Tracking */}
            <div className="relative">
              <AnimatedCaptainRed
                size="md"
                pose={isWaving ? 'waving' : 'idle'}
                interactive={true}
                className="drop-shadow-2xl filter hover:scale-105 transition-transform"
              />

              {/* Active Status Beacon */}
              <span className="absolute bottom-2 end-4 z-20 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-md" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
