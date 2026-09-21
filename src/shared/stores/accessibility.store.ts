import { create } from "zustand";

export type TAccessibilityOptions = {
  largerText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  screenReaderHints: boolean;
  buttonLabels: boolean;
};

type TAccessibilityStore = TAccessibilityOptions & {
  toggleOption: (option: keyof TAccessibilityOptions) => void;
};

export const useAccessibilityStore = create<TAccessibilityStore>((set) => ({
  largerText: false,
  highContrast: false,
  reduceMotion: false,
  screenReaderHints: true,
  buttonLabels: true,
  toggleOption: (option) => set((state) => ({ [option]: !state[option] }))
}));
