import React from 'react';
import { motion } from 'framer-motion';
import { Ship, Truck, Plane, ShieldCheck, Anchor, Compass, Clock, MapPin } from 'lucide-react';

/* ============================================================
   1. Modern Container Vessel & Maritime Corridor Hero Graphic
   ============================================================ */
export const MaritimeCorridorHero: React.FC<{
  title?: string;
  subtitle?: string;
  badge?: string;
}> = ({
  title = 'RED SHIPPING • شبكة الموانئ والممرات الملاحية العالمية',
  subtitle = 'ربط موانئ شرق آسيا والخليج العربي بالموانئ المصرية (الإسكندرية، السخنة، دمياط، بورسعيد)',
  badge = 'تتبع حي للممرات الملاحية',
}) => {
  return (
    <div className="relative rounded-3xl overflow-hidden bg-[#0B0F19] border border-red-500/25 text-white p-6 sm:p-8 shadow-2xl">
      {/* Clean Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#070B14] via-[#0E1526] to-[#121A2E] pointer-events-none" />
      {/* Subtle Dynamic Ambient Glows */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="space-y-3 max-w-xl text-start">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>{badge}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
            {title}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            {subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300">
              <Anchor className="w-3.5 h-3.5 text-red-400" />
              <span>موانئ المحيط الهندي والبحر المتوسط</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              <span>ترانزيت مباشر (Direct Routing)</span>
            </div>
          </div>
        </div>

        {/* 3D Stylized Container Vessel & Ports Maritime Corridor Scene */}
        <div className="w-full max-w-[340px] sm:max-w-md shrink-0">
          <svg viewBox="0 0 420 180" className="w-full h-auto drop-shadow-2xl">
            <defs>
              <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#0F172A" />
              </linearGradient>
              <linearGradient id="redContainerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#DC2626" />
                <stop offset="100%" stopColor="#EF4444" />
              </linearGradient>
              <linearGradient id="amberContainerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
              <linearGradient id="blueContainerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0284C7" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
              <linearGradient id="hullGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#0B0F19" />
              </linearGradient>
              <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Animated Ocean Water Waves */}
            <motion.path
              d="M -10,150 Q 90,138 190,150 T 390,150 T 450,150 L 450,178 L -10,178 Z"
              fill="url(#oceanGrad)"
              opacity="0.85"
              animate={{
                d: [
                  "M -10,150 Q 90,138 190,150 T 390,150 T 450,150 L 450,178 L -10,178 Z",
                  "M -10,147 Q 100,154 200,147 T 400,147 T 450,147 L 450,178 L -10,178 Z",
                  "M -10,150 Q 90,138 190,150 T 390,150 T 450,150 L 450,178 L -10,178 Z",
                ],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Glowing Surface Wave Crest */}
            <motion.path
              d="M 0,155 Q 100,146 200,155 T 410,155"
              stroke="#38BDF8"
              strokeWidth="2"
              fill="none"
              opacity="0.45"
              animate={{
                x: [-10, 10, -10],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Realistic Sailing Container Vessel (Pitch, Roll, Cruise Drift) */}
            <motion.g
              animate={{
                x: [-9, 9, -9],
                y: [0, -3.5, 0, 2.8, 0],
                rotate: [-0.6, 0.8, -0.6],
              }}
              transition={{
                x: { duration: 9, repeat: Infinity, ease: 'easeInOut' },
                y: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
              }}
              style={{ transformOrigin: '210px 130px' }}
            >
              {/* Vessel Hull */}
              <path
                d="M 35,120 L 90,146 L 330,146 L 385,108 L 355,108 L 35,108 Z"
                fill="url(#hullGrad)"
                stroke="#475569"
                strokeWidth="1.5"
              />
              {/* Red Keel Stripe */}
              <path d="M 55,136 L 325,136" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />

              {/* Stacked Containers on Deck */}
              {/* Row 1 (Bottom) */}
              <rect x="90" y="85" width="40" height="22" rx="2" fill="url(#redContainerGrad)" stroke="#B91C1C" strokeWidth="1" />
              <rect x="135" y="85" width="40" height="22" rx="2" fill="url(#blueContainerGrad)" stroke="#0369A1" strokeWidth="1" />
              <rect x="180" y="85" width="40" height="22" rx="2" fill="url(#amberContainerGrad)" stroke="#B45309" strokeWidth="1" />
              <rect x="225" y="85" width="40" height="22" rx="2" fill="url(#redContainerGrad)" stroke="#B91C1C" strokeWidth="1" />

              {/* Row 2 (Middle) */}
              <rect x="90" y="60" width="40" height="22" rx="2" fill="url(#blueContainerGrad)" stroke="#0369A1" strokeWidth="1" />
              <rect x="135" y="60" width="40" height="22" rx="2" fill="url(#redContainerGrad)" stroke="#B91C1C" strokeWidth="1" />
              <rect x="180" y="60" width="40" height="22" rx="2" fill="url(#redContainerGrad)" stroke="#B91C1C" strokeWidth="1" />
              <rect x="225" y="60" width="40" height="22" rx="2" fill="url(#amberContainerGrad)" stroke="#B45309" strokeWidth="1" />

              {/* Row 3 (Top) */}
              <rect x="135" y="35" width="40" height="22" rx="2" fill="url(#amberContainerGrad)" stroke="#B45309" strokeWidth="1" />
              <rect x="180" y="35" width="40" height="22" rx="2" fill="url(#blueContainerGrad)" stroke="#0369A1" strokeWidth="1" />

              {/* Ship Bridge / Tower */}
              <rect x="280" y="55" width="45" height="52" rx="3" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
              <rect x="285" y="62" width="35" height="12" rx="2" fill="#38BDF8" fillOpacity="0.7" />
              <rect x="285" y="80" width="10" height="10" rx="1" fill="#0284C7" />
              <rect x="302" y="80" width="10" height="10" rx="1" fill="#0284C7" />

              {/* Mast & Rotating Radar */}
              <line x1="302" y1="36" x2="302" y2="55" stroke="#94A3B8" strokeWidth="2.5" />
              <motion.g
                animate={{ scaleX: [1, 0.25, 1, 0.25, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '302px 34px' }}
              >
                <ellipse cx="302" cy="34" rx="12" ry="3.5" fill="#E2E8F0" stroke="#64748B" strokeWidth="1.5" />
              </motion.g>

              {/* Bow Beacon (Port Starboard Navigation Light) */}
              <motion.circle
                cx="38"
                cy="114"
                r="3"
                fill="#10B981"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />

              {/* Red Shipping Brand Glow Logo on Ship */}
              <circle cx="65" cy="116" r="6" fill="#EF4444" filter="url(#glowEffect)" />
              <circle cx="65" cy="116" r="3" fill="#FFFFFF" />
            </motion.g>

            {/* Water Wake Ripple Cutting by Bow */}
            <motion.path
              d="M 30,146 Q 22,151 12,154"
              stroke="#E0F2FE"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              animate={{
                opacity: [0.2, 0.7, 0.2],
                x: [-3, 3, -3],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   2. Egyptian Customs Clearance & NAFEZA Inspection Scene
   ============================================================ */
export const CustomsClearanceBanner: React.FC<{
  totalDossiers?: number;
  underExam?: number;
  released?: number;
}> = ({ totalDossiers = 18, underExam = 6, released = 12 }) => {
  return (
    <div className="relative rounded-3xl overflow-hidden bg-white/90 dark:bg-[#121620]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-white p-6 sm:p-7 shadow-sm transition-all duration-300">
      {/* Subtle Ambient Emerald & Sky Glow */}
      <div className="absolute top-0 end-0 w-80 h-80 bg-gradient-to-bl from-emerald-500/10 via-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 start-0 w-64 h-64 bg-gradient-to-tr from-amber-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 text-start max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>منظومة التخليص الجمركي المعتمدة • نافذة NAFEZA</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
            إدارة لجان الكشف والتثمين وأرقام ACID المسبقة
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            تتبع ملفات الشحنات بالمنافذ الجمركية المصرية، التحقق الفوري من صلاحية رقم القيد المسبق (90 يوماً)، توثيق سداد الرسوم واستخراج شهادات الإفراج 46.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{underExam} ملفات تحت الفحص والمعاينة</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{released} شهادة إفراج نهائي معتمدة</span>
            </div>
          </div>
        </div>

        {/* Right Side: Sleek Integrated NAFEZA Compliance Capsule */}
        <div className="rounded-2xl bg-slate-50 dark:bg-[#181D2A] border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex items-center gap-4 shadow-sm shrink-0 min-w-[260px]">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-xs">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1 text-start">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-black text-sm text-slate-900 dark:text-white">NAFEZA ACI</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                معتمد ✓
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">شهادة إفراج جمركي نموذج 46</p>
            <span className="inline-block text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 font-mono">
              تكامل مباشر مع الجمارك المصرية
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
