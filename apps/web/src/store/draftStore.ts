import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DraftItem {
  id: string;
  type: 'quotation' | 'shipment' | 'customs' | 'invoice';
  title: string;
  data: any;
  updatedAt: string;
}

interface DraftState {
  drafts: Record<string, DraftItem>;
  saveDraft: (type: DraftItem['type'], key: string, title: string, data: any) => void;
  getDraft: (type: DraftItem['type'], key: string) => DraftItem | undefined;
  removeDraft: (type: DraftItem['type'], key: string) => void;
  clearAllDrafts: () => void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      drafts: {},

      saveDraft: (type, key, title, data) => {
        const draftId = `${type}_${key}`;
        set((state) => ({
          drafts: {
            ...state.drafts,
            [draftId]: {
              id: draftId,
              type,
              title,
              data,
              updatedAt: new Date().toISOString(),
            },
          },
        }));
      },

      getDraft: (type, key) => {
        const draftId = `${type}_${key}`;
        return get().drafts[draftId];
      },

      removeDraft: (type, key) => {
        const draftId = `${type}_${key}`;
        set((state) => {
          const newDrafts = { ...state.drafts };
          delete newDrafts[draftId];
          return { drafts: newDrafts };
        });
      },

      clearAllDrafts: () => set({ drafts: {} }),
    }),
    {
      name: 'banna_drafts_storage',
    }
  )
);
