import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";

/** Display options the app reads as it draws (kept on this phone). */
export type TAccessibilityOptions = {
  /** Bigger text everywhere (read by the text component). */
  largerText: boolean;
  /** Darker text for more contrast (read by the text component). */
  highContrast: boolean;
  /** Words under the bottom navigation icons (off: the bar is icons only). */
  buttonLabels: boolean;
  /** Extra spoken hints on the navigation for screen readers. */
  screenReaderHints: boolean;
};

type TAccessibilityStore = TAccessibilityOptions & {
  toggleOption: (option: keyof TAccessibilityOptions) => void;
};

const storage = createMMKV({ id: "turnup-accessibility" });

export const useAccessibilityStore = create<TAccessibilityStore>()(
  persist(
    (set) => ({
      largerText: false,
      highContrast: false,
      screenReaderHints: true,
      buttonLabels: false,
      toggleOption: (option) => set((state) => ({ [option]: !state[option] }))
    }),
    {
      name: "accessibility",
      // v1: the bar became icons only, so labels start off for everyone.
      version: 1,
      migrate: (persisted) => ({
        ...(persisted as Partial<TAccessibilityOptions>),
        buttonLabels: false
      }),
      partialize: ({ largerText, highContrast, buttonLabels, screenReaderHints }) => ({
        largerText,
        highContrast,
        buttonLabels,
        screenReaderHints
      }),
      storage: createJSONStorage(() => ({
        setItem: (name, value) => storage.set(name, value),
        getItem: (name) => storage.getString(name) ?? null,
        removeItem: (name) => storage.remove(name)
      }))
    }
  )
);
