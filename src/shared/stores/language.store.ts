import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";

/** The languages Turnupz speaks. */
export const LANGUAGES = ["en-GB", "en-US", "fr"] as const;
export type TLanguage = (typeof LANGUAGES)[number];

/** What's picked in Settings: a language, or whatever the phone is set to. */
export type TLanguageChoice = TLanguage | "system";

type TLanguageStore = {
  choice: TLanguageChoice;
  setChoice: (choice: TLanguageChoice) => void;
};

const storage = createMMKV({ id: "turnup-language" });

/** The phone's own language, matched to the nearest one Turnupz has. */
export const phoneLanguage = (): TLanguage => {
  let locale = "en-GB";
  try {
    locale = Intl.DateTimeFormat().resolvedOptions().locale ?? locale;
  } catch {
    // No Intl: British English.
  }
  const [language, region] = locale.split(/[-_]/);
  if (language === "fr") return "fr";
  if (language === "en" && region === "US") return "en-US";
  return "en-GB";
};

export const resolveLanguage = (choice: TLanguageChoice): TLanguage =>
  choice === "system" ? phoneLanguage() : choice;

/** The language picked on this phone (kept on this phone). */
export const useLanguageStore = create<TLanguageStore>()(
  persist(
    (set) => ({
      choice: "system",
      setChoice: (choice) => set({ choice })
    }),
    {
      name: "language",
      partialize: ({ choice }) => ({ choice }),
      storage: createJSONStorage(() => ({
        setItem: (name, value) => storage.set(name, value),
        getItem: (name) => storage.getString(name) ?? null,
        removeItem: (name) => storage.remove(name)
      }))
    }
  )
);
