import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";

/**
 * Whether money shows as an amount or as ₦•••••, like a banking app: your
 * Turnupz Credit, and an organiser's sales and earnings. Hidden until you tap
 * the eye. Kept on this phone only; "-v2" starts everyone hidden once.
 */
type TBalancePrivacyStore = {
  hideBalance: boolean;
  toggleHideBalance: () => void;
};

const storage = createMMKV({ id: "turnup-balance-privacy" });

export const useBalancePrivacyStore = create<TBalancePrivacyStore>()(
  persist(
    (set) => ({
      hideBalance: true,
      toggleHideBalance: () => set((state) => ({ hideBalance: !state.hideBalance }))
    }),
    {
      name: "balance-privacy-v2",
      storage: createJSONStorage(() => ({
        getItem: (key) => storage.getString(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.remove(key)
      })),
      partialize: ({ hideBalance }) => ({ hideBalance })
    }
  )
);

/** "₦1,000.00" → "₦•••••": keeps the currency sign, hides the amount. */
export const maskAmount = (formatted?: string | null) => {
  const sign = (formatted ?? "").match(/^[^\d\s-]+/)?.[0] ?? "";
  return `${sign}•••••`;
};
