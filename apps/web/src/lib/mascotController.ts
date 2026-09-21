import { create } from 'zustand';
import confetti from 'canvas-confetti';

export type CaptainState =
  | 'idle'
  | 'briefing'
  | 'walking'
  | 'waving'
  | 'pointing'
  | 'binoculars'
  | 'inspecting'
  | 'dispatching'
  | 'thumbsUp'
  | 'celebrate'
  | 'jump';

interface MascotStore {
  currentPose: CaptainState;
  isWalking: boolean;
  positionPercent: number;
  walkDirection: 'forward' | 'backward';
  isCompanionVisible: boolean;
  isEyeTrackingActive: boolean;

  // Actions
  setPose: (pose: CaptainState) => void;
  startWalking: (targetPercent?: number) => void;
  stopWalking: () => void;
  walkTo: (percent: number) => void;
  celebrate: () => void;
  toggleCompanion: () => void;
  setEyeTracking: (active: boolean) => void;
  handleSectionChange: (sectionName: string) => void;
}

export const useMascotStore = create<MascotStore>((set, get) => ({
  currentPose: 'briefing',
  isWalking: false,
  positionPercent: 50,
  walkDirection: 'forward',
  isCompanionVisible: true,
  isEyeTrackingActive: true,

  setPose: (pose) => set({ currentPose: pose, isWalking: pose === 'walking' }),

  startWalking: (targetPercent = 80) => {
    const current = get().positionPercent;
    set({
      currentPose: 'walking',
      isWalking: true,
      walkDirection: targetPercent > current ? 'forward' : 'backward',
      positionPercent: targetPercent,
    });
  },

  stopWalking: () => {
    set({
      currentPose: 'briefing',
      isWalking: false,
    });
  },

  walkTo: (percent) => {
    const clamped = Math.max(5, Math.min(92, percent));
    const current = get().positionPercent;
    set({
      currentPose: 'walking',
      isWalking: true,
      walkDirection: clamped >= current ? 'forward' : 'backward',
      positionPercent: clamped,
    });
  },

  celebrate: () => {
    set({ currentPose: 'celebrate', isWalking: false });
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#DC2626', '#EF4444', '#F59E0B', '#38BDF8', '#FFFFFF'],
      });
    } catch {
      // safe fallback if canvas is unavailable
    }
    setTimeout(() => {
      if (get().currentPose === 'celebrate') {
        set({ currentPose: 'thumbsUp' });
      }
    }, 1800);
  },

  toggleCompanion: () => set((state) => ({ isCompanionVisible: !state.isCompanionVisible })),

  setEyeTracking: (active) => set({ isEyeTrackingActive: active }),

  handleSectionChange: (sectionName) => {
    switch (sectionName) {
      case 'hero':
        set({ currentPose: 'waving', isWalking: false });
        break;
      case 'pricing':
        set({ currentPose: 'pointing', isWalking: false });
        break;
      case 'customs':
        set({ currentPose: 'inspecting', isWalking: false });
        break;
      case 'tracking':
        set({ currentPose: 'binoculars', isWalking: false });
        break;
      case 'dispatch':
        set({ currentPose: 'dispatching', isWalking: false });
        break;
      default:
        set({ currentPose: 'briefing' });
    }
  },
}));
