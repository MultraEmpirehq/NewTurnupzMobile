import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";

/**
 * Whether your Turnupz Credit shows as an amount or as ₦•••••, like a banking
 * app. Kept on this phone only.
 */
type TBalancePrivacyStore = {
  hideBalance: boolean;
  toggleHideBalance: () => void;
};

const storage = createMMKV({ id: "turnup-balance-privacy" });

export const useBalancePrivacyStore = create<TBalancePrivacyStore>()(
  persist(
    (set) => ({
      hideBalance: false,
      toggleHideBalance: () => set((state) => ({ hideBalance: !state.hideBalance }))
    }),
    {
      name: "balance-privacy",
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
