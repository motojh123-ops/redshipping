import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type CaptainPose =
  | 'idle'
  | 'briefing'
  | 'talking'
  | 'waving'
  | 'walking'
  | 'inspecting'
  | 'pointing'
  | 'dispatching'
  | 'binoculars'
  | 'thumbsUp'
  | 'celebrate'
  | 'jump';

interface AnimatedCaptainRedProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  pose?: CaptainPose;
  isWaving?: boolean;
  interactive?: boolean;
  showSpeechBubble?: boolean;
  speechText?: string;
  className?: string;
  onClick?: () => void;
}

export const AnimatedCaptainRed: React.FC<AnimatedCaptainRedProps> = ({
  size = 'md',
  pose = 'briefing',
  isWaving,
  interactive = true,
  showSpeechBubble = false,
  speechText,
  className = '',
  onClick,
}) => {
  const currentPose: CaptainPose = isWaving ? 'waving' : pose || 'briefing';
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [blink, setBlink] = useState(false);
  const [pupilOffset, setPupilOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [headTilt, setHeadTilt] = useState<number>(0);

  // Natural Eye Blinking
  useEffect(() => {
    const timer = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3200 + Math.random() * 2200);
    return () => clearInterval(timer);
  }, []);

  // Real-Time Dynamic Cursor / Mouse Eye Tracking (Section 6 Architecture)
  useEffect(() => {
    if (!interactive) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.28;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      // Smooth normalized eye offset (-2.4px to +2.4px)
      const px = Math.max(-2.4, Math.min(2.4, dx / 85));
      const py = Math.max(-1.8, Math.min(1.8, dy / 85));

      // Subtle Head tilt toward cursor (-3.5deg to +3.5deg)
      const tilt = Math.max(-3.5, Math.min(3.5, dx / 95));

      setPupilOffset({ x: px, y: py });
      setHeadTilt(tilt);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [interactive]);

  // Dimensions Map (Tailored & Proportional)
  const sizeMap = {
    sm: { width: 90, height: 115 },
    md: { width: 140, height: 175 },
    lg: { width: 185, height: 230 },
    xl: { width: 240, height: 300 },
    hero: { width: 300, height: 375 },
  };

  const dim = sizeMap[size];

  // Contextual Speech Text
  const defaultSpeechText =
    currentPose === 'talking'
      ? 'غرفة العمليات تحت المتابعة المباشرة لحظة بلحظة 🎙️'
      : currentPose === 'binoculars'
      ? 'مراقبة الممرات الملاحية وتراكي السفن بالأقمار الصناعية 🔭'
      : currentPose === 'inspecting'
      ? 'مراجعة أرقام ACID وشهادات الإفراج 46 🔍'
      : currentPose === 'dispatching'
      ? 'توجيه شاحنات النقل وسيارات الفحص 📻'
      : currentPose === 'pointing'
      ? 'مؤشرات أسعار النوالين والخطوط الملاحية 📊'
      : currentPose === 'thumbsUp'
      ? 'كافة الرحلات والأسعار معتمدة ومستقرة 👍'
      : currentPose === 'waving'
      ? 'مرحباً بك في منظومة RED SHIPPING 👋'
      : 'كافة الرحلات الملاحية تحت المتابعة اللحظية 🚢';

  const textToDisplay = speechText || defaultSpeechText;

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`relative inline-flex flex-col items-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
    >
      {/* ── Main Character SVG Rig (Anatomically Solid, ZERO Broken Joints) ── */}
      <motion.svg
        width={dim.width}
        height={dim.height}
        viewBox="0 -10 200 265"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
        animate={{
          y:
            currentPose === 'jump' || currentPose === 'celebrate'
              ? [0, -18, 0, -6, 0]
              : currentPose === 'walking'
              ? [0, -4, 0, -4, 0]
              : isHovered
              ? [0, -3, 0]
              : [0, -1.8, 0],
          x: currentPose === 'walking' ? [-2, 2, -2] : 0,
          scale: currentPose === 'jump' || currentPose === 'celebrate' ? [1, 1.05, 1] : 1,
        }}
        transition={{
          repeat: currentPose === 'jump' || currentPose === 'celebrate' ? 0 : Infinity,
          duration:
            currentPose === 'jump' || currentPose === 'celebrate'
              ? 0.65
              : currentPose === 'walking'
              ? 0.65
              : isHovered
              ? 2
              : 3.4,
          ease: 'easeInOut',
        }}
      >
        <defs>
          {/* Luminous Glow for Clear Visibility on Any Background */}
          <filter id="crGlow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#EF4444" floodOpacity="0.3" />
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.45" />
          </filter>

          {/* Crimson Red Blazer Gradient */}
          <linearGradient id="crCoat" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="50%" stopColor="#B91C1C" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>

          {/* Dark Navy Uniform Trims */}
          <linearGradient id="crNavy" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          {/* Gold Accents */}
          <linearGradient id="crGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* Skin Tone */}
          <linearGradient id="crSkin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FED7AA" />
            <stop offset="100%" stopColor="#FDBA74" />
          </linearGradient>
        </defs>

        {/* ── 1. Soft Natural Ground Contact Shadow (Clean, Organic, No Rings) ── */}
        <motion.g
          id="contactShadow"
          animate={
            currentPose === 'walking'
              ? { scaleX: [1, 1.1, 1, 1.1, 1] }
              : { scaleX: [1, 1.03, 1] }
          }
          transition={{ repeat: Infinity, duration: currentPose === 'walking' ? 0.65 : 3.4, ease: 'easeInOut' }}
          style={{ transformOrigin: '100px 239px' }}
        >
          <ellipse cx="100" cy="239" rx="36" ry="4" fill="#000000" fillOpacity="0.35" filter="blur(2.5px)" />
          <ellipse cx="100" cy="239" rx="22" ry="2.2" fill="#000000" fillOpacity="0.22" />
        </motion.g>

        {/* ── 2. Unified Character Body with Contrast Glow ── */}
        <g filter="url(#crGlow)">

          {/* ── LEGS & BOOTS (Natural Front-View Stepping - ZERO Broken Joint Dislocation) ── */}
          <g id="legsGroup">
            {/* Trouser Seat / Pelvis Cover (Solid seamless base) */}
            <path d="M 72 176 L 128 176 L 124 190 Q 100 196 76 190 Z" fill="url(#crNavy)" />

            {/* Left Leg & Trouser & Boot */}
            <motion.g
              id="leftLeg"
              animate={
                currentPose === 'walking'
                  ? { y: [0, -5, 0, 0], scaleY: [1, 0.96, 1, 1] }
                  : { y: 0, scaleY: 1 }
              }
              transition={{ repeat: Infinity, duration: 0.65, ease: 'easeInOut' }}
              style={{ transformOrigin: '91px 180px' }}
            >
              <path d="M 85 180 L 88 226 L 98 226 L 95 180 Z" fill="url(#crNavy)" />
              <line x1="86" y1="180" x2="89" y2="226" stroke="#DC2626" strokeWidth="1.2" />
              <path d="M 84 223 L 80 236 Q 80 240 90 240 L 100 240 Q 102 240 100 234 L 98 223 Z" fill="#090D16" />
              <rect x="84" y="228" width="14" height="2" rx="1" fill="url(#crGold)" />
            </motion.g>

            {/* Right Leg & Trouser & Boot */}
            <motion.g
              id="rightLeg"
              animate={
                currentPose === 'walking'
                  ? { y: [0, 0, -5, 0], scaleY: [1, 1, 0.96, 1] }
                  : { y: 0, scaleY: 1 }
              }
              transition={{ repeat: Infinity, duration: 0.65, ease: 'easeInOut' }}
              style={{ transformOrigin: '109px 180px' }}
            >
              <path d="M 105 180 L 102 226 L 112 226 L 115 180 Z" fill="url(#crNavy)" />
              <line x1="114" y1="180" x2="111" y2="226" stroke="#DC2626" strokeWidth="1.2" />
              <path d="M 102 223 L 100 234 Q 98 240 110 240 L 120 240 Q 120 236 116 223 Z" fill="#090D16" />
              <rect x="102" y="228" width="14" height="2" rx="1" fill="url(#crGold)" />
            </motion.g>
          </g>

          {/* ── TAILORED CRIMSON BLAZER & TORSO (Athletic, Proportional Cut) ── */}
          <motion.g
            id="torsoGroup"
            animate={
              currentPose === 'walking'
                ? { y: [0, -3.5, 0, -3.5, 0] }
                : { y: [0, -0.8, 0] }
            }
            transition={{ repeat: Infinity, duration: currentPose === 'walking' ? 0.65 : 3.4, ease: 'easeInOut' }}
          >
            {/* Fitted Crimson Jacket */}
            <path
              d="M 68 102 L 84 90 L 116 90 L 132 102 L 128 180 L 72 180 Z"
              fill="url(#crCoat)"
              stroke="#EF4444"
              strokeWidth="0.8"
            />

            {/* Inner Navy Vest / V-Neck */}
            <path d="M 88 90 L 100 114 L 112 90 L 108 178 L 92 178 Z" fill="url(#crNavy)" />

            {/* White Collar & Crimson Tie */}
            <polygon points="94,90 100,105 106,90 100,94" fill="#FFFFFF" />
            <polygon points="98,96 102,96 104,122 100,126 96,122" fill="#DC2626" />
            <line x1="98" y1="108" x2="102" y2="108" stroke="#F59E0B" strokeWidth="1.2" />

            {/* Double-Breasted Gold Anchor Buttons */}
            <circle cx="88" cy="128" r="2.8" fill="url(#crGold)" />
            <circle cx="112" cy="128" r="2.8" fill="url(#crGold)" />
            <circle cx="89" cy="144" r="2.8" fill="url(#crGold)" />
            <circle cx="111" cy="144" r="2.8" fill="url(#crGold)" />
            <circle cx="90" cy="160" r="2.8" fill="url(#crGold)" />
            <circle cx="110" cy="160" r="2.8" fill="url(#crGold)" />

            {/* Left Chest Gold Anchor Badge */}
            <circle cx="120" cy="122" r="5" fill="#1E293B" stroke="#F59E0B" strokeWidth="1" />
            <path d="M 120 118 L 120 126 M 118 120 L 122 120 M 118 124 Q 120 127 122 124" stroke="#FFFFFF" strokeWidth="0.9" fill="none" strokeLinecap="round" />

            {/* Shoulder Epaulettes (Flush, Proportional) */}
            <rect x="62" y="96" width="16" height="5" rx="2.5" fill="url(#crGold)" transform="rotate(-12 62 96)" stroke="#B45309" strokeWidth="0.6" />
            <rect x="122" y="93" width="16" height="5" rx="2.5" fill="url(#crGold)" transform="rotate(12 122 93)" stroke="#B45309" strokeWidth="0.6" />

            {/* Leather Belt & Gold Buckle */}
            <rect x="72" y="176" width="56" height="6" fill="#090D16" />
            <rect x="94" y="174" width="12" height="10" rx="2" fill="url(#crGold)" stroke="#B45309" strokeWidth="0.8" />
            <rect x="97" y="176.5" width="6" height="5" rx="1" fill="#090D16" />
          </motion.g>

          {/* ── LEFT ARM: DIGITAL TABLET (Except when holding binoculars) ── */}
          {currentPose !== 'binoculars' && (
            <motion.g
              id="leftArmComplete"
              animate={
                currentPose === 'walking'
                  ? { rotate: [10, -10, 10] }
                  : { rotate: 0 }
              }
              transition={{ repeat: Infinity, duration: 0.65, ease: 'easeInOut' }}
              style={{ transformOrigin: '130px 102px' }}
            >
              <path
                d="M 130 102 Q 148 126 142 154"
                stroke="#B91C1C"
                strokeWidth="13"
                strokeLinecap="round"
                fill="none"
              />
              <line x1="137" y1="147" x2="147" y2="147" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="142" cy="158" r="6" fill="url(#crSkin)" />

              {/* Tablet */}
              <rect x="132" y="142" width="30" height="38" rx="3" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.5" />
              <rect x="135" y="145" width="24" height="26" rx="1.5" fill="#0284C7" opacity="0.85" />
              <path d="M 140 160 L 146 160 L 149 164 L 137 164 Z" fill="#FFFFFF" />
              <circle cx="149" cy="151" r="1.5" fill="#38BDF8" opacity="0.9" />
            </motion.g>
          )}

          {/* ── RIGHT ARM: CONTEXTUAL POSES (Solid Sleeve, Connected Joints) ── */}

          {/* ── POSE: WALKING (Natural Walking Stride Swing) ── */}
          {currentPose === 'walking' && (
            <motion.g
              id="walkingArmRig"
              animate={{ rotate: [-14, 14, -14] }}
              transition={{ repeat: Infinity, duration: 0.65, ease: 'easeInOut' }}
              style={{ transformOrigin: '70px 102px' }}
            >
              <path d="M 70 102 C 58 122, 54 140, 64 156" stroke="#B91C1C" strokeWidth="13" strokeLinecap="round" fill="none" />
              <line x1="58" y1="150" x2="68" y2="152" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="64" cy="160" r="6" fill="url(#crSkin)" />
            </motion.g>
          )}

          {/* ── POSE: WAVING (Hand Waves from Cuff) ── */}
          {currentPose === 'waving' && (
            <g id="wavingArmRig">
              <path d="M 70 102 C 50 96, 40 82, 44 64" stroke="#B91C1C" strokeWidth="13" strokeLinecap="round" fill="none" />
              <line x1="38" y1="64" x2="50" y2="64" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
              <motion.g
                style={{ transformOrigin: '44px 64px' }}
                animate={{ rotate: isHovered ? [-14, 14, -14] : [-8, 10, -8] }}
                transition={{ repeat: Infinity, duration: isHovered ? 0.7 : 1.2, ease: 'easeInOut' }}
              >
                <circle cx="44" cy="55" r="6.5" fill="url(#crSkin)" />
                <rect x="38" y="44" width="2.6" height="8" rx="1.3" fill="url(#crSkin)" />
                <rect x="42" y="42" width="2.6" height="10" rx="1.3" fill="url(#crSkin)" />
                <rect x="46" y="43" width="2.6" height="8.5" rx="1.3" fill="url(#crSkin)" />
                <rect x="49.5" y="46" width="2.4" height="6.5" rx="1.2" fill="url(#crSkin)" />
                <ellipse cx="38" cy="56" rx="2" ry="3" fill="url(#crSkin)" transform="rotate(-20 38 56)" />
              </motion.g>
            </g>
          )}

          {/* ── POSE: BRIEFING / TALKING / IDLE (Natural Gesturing) ── */}
          {(currentPose === 'briefing' || currentPose === 'talking' || currentPose === 'idle') && (
            <g id="briefingArmRig">
              <path d="M 70 102 C 50 108, 46 128, 62 140" stroke="#B91C1C" strokeWidth="13" strokeLinecap="round" fill="none" />
              <line x1="56" y1="135" x2="66" y2="138" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
              <motion.g
                style={{ transformOrigin: '64px 140px' }}
                animate={currentPose === 'talking' ? { rotate: [-6, 6, -6] } : { rotate: 0 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
              >
                <circle cx="65" cy="143" r="6.5" fill="url(#crSkin)" />
                <ellipse cx="68" cy="140" rx="3.5" ry="2" fill="url(#crSkin)" />
              </motion.g>
            </g>
          )}

          {/* ── POSE: BINOCULARS (Horizon Scan) ── */}
          {currentPose === 'binoculars' && (
            <g id="binocularsArmRig">
              <path d="M 70 102 C 60 90, 72 74, 86 64" stroke="#B91C1C" strokeWidth="11" strokeLinecap="round" fill="none" />
              <path d="M 130 102 C 140 90, 128 74, 114 64" stroke="#B91C1C" strokeWidth="11" strokeLinecap="round" fill="none" />

              <motion.g
                style={{ transformOrigin: '100px 62px' }}
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
              >
                <rect x="84" y="55" width="14" height="14" rx="3" fill="#0F172A" stroke="#475569" strokeWidth="1" />
                <rect x="102" y="55" width="14" height="14" rx="3" fill="#0F172A" stroke="#475569" strokeWidth="1" />
                <rect x="94" y="59" width="12" height="6" rx="1.5" fill="url(#crGold)" />
                <circle cx="91" cy="62" r="5" fill="#38BDF8" fillOpacity="0.85" stroke="#FFFFFF" strokeWidth="0.8" />
                <circle cx="109" cy="62" r="5" fill="#38BDF8" fillOpacity="0.85" stroke="#FFFFFF" strokeWidth="0.8" />
                <circle cx="89" cy="60" r="1.5" fill="#FFFFFF" />
                <circle cx="107" cy="60" r="1.5" fill="#FFFFFF" />
              </motion.g>
            </g>
          )}

          {/* ── POSE: POINTING ── */}
          {currentPose === 'pointing' && (
            <g id="pointingArmRig">
              <path d="M 70 102 C 54 100, 52 82, 74 74" stroke="#B91C1C" strokeWidth="13" strokeLinecap="round" fill="none" />
              <line x1="68" y1="74" x2="76" y2="80" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="78" cy="74" r="6.5" fill="url(#crSkin)" />
              <rect x="80" y="72" width="16" height="4.5" rx="2.2" fill="url(#crSkin)" />
              <circle cx="76" cy="78" r="2.8" fill="#FDBA74" />
            </g>
          )}

          {/* ── POSE: INSPECTING (Magnifying Glass) ── */}
          {currentPose === 'inspecting' && (
            <g id="inspectingArmRig">
              <path d="M 70 102 C 54 98, 56 82, 68 68" stroke="#B91C1C" strokeWidth="13" strokeLinecap="round" fill="none" />
              <line x1="62" y1="69" x2="70" y2="76" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="70" cy="66" r="6" fill="url(#crSkin)" />

              <motion.g
                style={{ transformOrigin: '70px 66px' }}
                animate={{ rotate: [-6, 10, -6] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              >
                <line x1="70" y1="66" x2="82" y2="52" stroke="#D97706" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="90" cy="42" r="13" fill="#38BDF8" fillOpacity="0.3" stroke="#F59E0B" strokeWidth="2.5" />
                <path d="M 85 36 Q 90 34 95 38" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.9" />
                <line x1="80" y1="42" x2="100" y2="42" stroke="#22C55E" strokeWidth="1.5" strokeDasharray="2 1" opacity="0.8" />
              </motion.g>
            </g>
          )}

          {/* ── POSE: DISPATCHING (Radio) ── */}
          {currentPose === 'dispatching' && (
            <g id="dispatchingArmRig">
              <path d="M 70 102 C 54 96, 56 78, 64 66" stroke="#B91C1C" strokeWidth="13" strokeLinecap="round" fill="none" />
              <line x1="58" y1="66" x2="66" y2="73" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="66" cy="64" r="6" fill="url(#crSkin)" />

              <rect x="62" y="46" width="12" height="20" rx="2.5" fill="#0F172A" stroke="#475569" strokeWidth="1" />
              <line x1="65" y1="32" x2="65" y2="46" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
              <circle cx="65" cy="31" r="1.5" fill="#EF4444" className="animate-ping" />
              <rect x="65" y="50" width="6" height="5" rx="1" fill="#22C55E" />
              <path d="M 57 40 Q 53 45 57 50" stroke="#38BDF8" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.8" />
            </g>
          )}

          {/* ── POSE: THUMBS UP ── */}
          {currentPose === 'thumbsUp' && (
            <g id="thumbsUpArmRig">
              <path d="M 70 102 C 52 98, 48 84, 56 68" stroke="#B91C1C" strokeWidth="13" strokeLinecap="round" fill="none" />
              <line x1="50" y1="70" x2="62" y2="67" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="58" cy="62" r="6.5" fill="url(#crSkin)" />
              <rect x="56" y="46" width="4.5" height="13" rx="2.25" fill="url(#crSkin)" />
              <rect x="62" y="58" width="4" height="3" rx="1" fill="#FDBA74" />
              <rect x="62" y="62" width="4" height="3" rx="1" fill="#FDBA74" />
              <rect x="62" y="66" width="4" height="3" rx="1" fill="#FDBA74" />
              <motion.circle
                cx="65"
                cy="46"
                r="3"
                fill="#FBBF24"
                animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 1.1 }}
              />
            </g>
          )}

          {/* ── POSE: CELEBRATE / JUMP (Both Arms Raised) ── */}
          {(currentPose === 'celebrate' || currentPose === 'jump') && (
            <motion.g
              id="celebrateRightArm"
              animate={{ rotate: [-6, 6, -6] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              style={{ transformOrigin: '70px 102px' }}
            >
              <path d="M 70 102 C 50 82, 44 56, 52 38" stroke="#B91C1C" strokeWidth="13" strokeLinecap="round" fill="none" />
              <line x1="47" y1="42" x2="57" y2="42" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="52" cy="34" r="6" fill="url(#crSkin)" />
            </motion.g>
          )}

          {/* ── 5. HEAD, VISOR CAP & EXPRESSIVE FACE ── */}
          <motion.g
            id="headComplete"
            style={{ transformOrigin: '100px 88px' }}
            animate={{
              rotate: headTilt,
              y: [0, -0.6, 0],
            }}
            transition={{
              rotate: { type: 'spring', stiffness: 220, damping: 22 },
              y: { repeat: Infinity, duration: 3.8, ease: 'easeInOut' },
            }}
          >
            {/* Neck */}
            <rect x="92" y="80" width="16" height="15" rx="3" fill="url(#crSkin)" />

            {/* Ears */}
            <ellipse cx="73" cy="65" rx="4.5" ry="6" fill="url(#crSkin)" />
            <ellipse cx="127" cy="65" rx="4.5" ry="6" fill="url(#crSkin)" />

            {/* Face Contour */}
            <path
              d="M 76 60 Q 74 85 100 87 Q 126 85 124 60 Q 124 38 100 38 Q 76 38 76 60 Z"
              fill="url(#crSkin)"
            />

            {/* Neat Trimmed Stubble */}
            <path
              d="M 78 65 Q 78 84 100 85 Q 122 84 122 65 Q 118 80 100 82 Q 82 80 78 65 Z"
              fill="#3E2723"
              opacity="0.22"
            />

            {/* Talking Mouth Animation / Warm Smile */}
            {currentPose === 'talking' ? (
              <motion.ellipse
                cx="100"
                cy="77"
                rx="5"
                animate={{ ry: [1.5, 3.8, 1.5], fill: ['#991B1B', '#7F1D1D', '#991B1B'] }}
                transition={{ repeat: Infinity, duration: 0.32, ease: 'easeInOut' }}
              />
            ) : (
              <motion.path
                d={isHovered ? 'M 90 75 Q 100 83 110 75 Z' : 'M 92 76 Q 100 81 108 76'}
                stroke="#991B1B"
                strokeWidth="2"
                strokeLinecap="round"
                fill={isHovered ? '#DC2626' : 'none'}
              />
            )}

            {/* Animated Talking Soundwaves */}
            {currentPose === 'talking' && (
              <g id="soundwaves" opacity="0.85">
                <motion.path
                  d="M 116 73 Q 121 77 116 81"
                  stroke="#EF4444"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                  animate={{ opacity: [0.3, 1, 0.3], x: [0, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                />
                <motion.path
                  d="M 121 70 Q 128 77 121 84"
                  stroke="#F59E0B"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  fill="none"
                  animate={{ opacity: [0.2, 0.9, 0.2], x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }}
                />
              </g>
            )}

            {/* Nose */}
            <path d="M 98 64 Q 102 67 100 70 Q 97 70 98 64" stroke="#D97706" strokeWidth="1.2" fill="none" />

            {/* Eyebrows */}
            <path d="M 83 54 Q 89 51 95 55" stroke="#271810" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 105 55 Q 111 51 117 54" stroke="#271810" strokeWidth="2.2" strokeLinecap="round" />

            {/* Left Eye (Cursor-Tracked Pupils) */}
            <g id="leftEye">
              <ellipse cx="89" cy="61" rx="6" ry={blink ? 0.8 : 5.5} fill="#FFFFFF" />
              {!blink && (
                <circle
                  cx={89 + pupilOffset.x}
                  cy={61 + pupilOffset.y}
                  r="3"
                  fill="#3B1E08"
                />
              )}
              {!blink && (
                <circle
                  cx={88.2 + pupilOffset.x}
                  cy={59.8 + pupilOffset.y}
                  r="1"
                  fill="#FFFFFF"
                />
              )}
            </g>

            {/* Right Eye (Cursor-Tracked Pupils) */}
            <g id="rightEye">
              <ellipse cx="111" cy="61" rx="6" ry={blink ? 0.8 : 5.5} fill="#FFFFFF" />
              {!blink && (
                <circle
                  cx={111 + pupilOffset.x}
                  cy={61 + pupilOffset.y}
                  r="3"
                  fill="#3B1E08"
                />
              )}
              {!blink && (
                <circle
                  cx={110.2 + pupilOffset.x}
                  cy={59.8 + pupilOffset.y}
                  r="1"
                  fill="#FFFFFF"
                />
              )}
            </g>

            {/* Captain's Cap */}
            <g id="capVisorAndCrown">
              <path d="M 66 45 C 62 22 138 22 134 45 Z" fill="#0F172A" stroke="#1E293B" strokeWidth="0.8" />
              <path d="M 64 47 Q 100 57 136 47 Q 100 52 64 47 Z" fill="#020617" stroke="#1E293B" strokeWidth="0.8" />
              <path d="M 75 48 Q 100 53 125 48" stroke="#94A3B8" strokeWidth="1" opacity="0.7" />
              <path d="M 65 44 Q 100 48 135 44 L 133 37 Q 100 41 67 37 Z" fill="url(#crCoat)" />
              <line x1="70" y1="41" x2="130" y2="41" stroke="#F59E0B" strokeWidth="2" strokeDasharray="2.5 1.5" />

              {/* Gold Anchor Insignia Crest */}
              <circle cx="100" cy="27" r="7.5" fill="#B91C1C" stroke="url(#crGold)" strokeWidth="1.2" />
              <circle cx="100" cy="24.5" r="1.2" fill="#F59E0B" />
              <line x1="100" y1="26" x2="100" y2="30.5" stroke="#F59E0B" strokeWidth="1.4" />
              <line x1="97.5" y1="27.5" x2="102.5" y2="27.5" stroke="#F59E0B" strokeWidth="1.2" />
              <path d="M 97 29 Q 100 32 103 29" stroke="#F59E0B" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            </g>
          </motion.g>
        </g>
      </motion.svg>
    </div>
  );
};
