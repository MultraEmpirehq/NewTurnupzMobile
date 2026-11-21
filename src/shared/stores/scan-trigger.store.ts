import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";

/**
 * How the door scanner checks a ticket: as soon as the camera reads it
 * ("auto"), or when staff tap "Check ticket" ("tap"). Kept on this phone.
 */
type TScanTriggerStore = {
  trigger: "auto" | "tap";
  setTrigger: (trigger: "auto" | "tap") => void;
};

const storage = createMMKV({ id: "turnup-scan-trigger" });

export const useScanTriggerStore = create<TScanTriggerStore>()(
  persist(
    (set) => ({
      trigger: "auto",
      setTrigger: (trigger) => set({ trigger })
    }),
    {
      name: "scan-trigger",
      storage: createJSONStorage(() => ({
        getItem: (key) => storage.getString(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.remove(key)
      })),
      partialize: ({ trigger }) => ({ trigger })
    }
  )
);
