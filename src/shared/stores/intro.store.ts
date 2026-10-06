import { create } from "zustand";

/**
 * Whether the launch intro has finished. The app loads underneath while it
 * plays, so screens use this to hold back anything that would show over it,
 * like a keyboard from an auto-focused field.
 */
type TIntroStore = {
  introDone: boolean;
  setIntroDone: () => void;
};

export const useIntroStore = create<TIntroStore>((set) => ({
  introDone: false,
  setIntroDone: () => set({ introDone: true })
}));
