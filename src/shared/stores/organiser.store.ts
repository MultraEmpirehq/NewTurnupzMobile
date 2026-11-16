import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";

/**
 * Attendee or organiser: which side is showing. The app always opens as an
 * attendee, since that's who it mostly speaks to; organisers get there by the
 * Organiser sign-in, their profile, or the event-day banner on Home.
 * `workspaceVendorId` is the organiser whose events they're looking at: null
 * for their own, else a team they're on.
 */
type TOrganiserStore = {
  mode: "attendee" | "organiser";
  workspaceVendorId: string | null;
  /** Signed in by the Organiser side of the sign-in screen; home takes it from there. */
  wantsToHost: boolean;
  /** An event to open the scanner on when the organiser side next appears. */
  scanEventOnOpen: string | null;
  setWantsToHost: (wantsToHost: boolean) => void;
  setMode: (mode: "attendee" | "organiser") => void;
  setWorkspace: (vendorId: string | null) => void;
  setScanEventOnOpen: (eventId: string | null) => void;
  reset: () => void;
};

const storage = createMMKV({ id: "turnup-organiser" });

export const useOrganiserStore = create<TOrganiserStore>()(
  persist(
    (set) => ({
      mode: "attendee",
      workspaceVendorId: null,
      wantsToHost: false,
      scanEventOnOpen: null,
      setMode: (mode) => set({ mode }),
      setWantsToHost: (wantsToHost) => set({ wantsToHost }),
      setWorkspace: (workspaceVendorId) => set({ workspaceVendorId }),
      setScanEventOnOpen: (scanEventOnOpen) => set({ scanEventOnOpen }),
      // Signing out: the next person starts as an attendee.
      reset: () => set({ mode: "attendee", workspaceVendorId: null, wantsToHost: false, scanEventOnOpen: null })
    }),
    {
      name: "organiser",
      // The side isn't remembered: every open starts as an attendee, including
      // for phones that saved a side before this.
      partialize: ({ workspaceVendorId, wantsToHost }) => ({ workspaceVendorId, wantsToHost }),
      merge: (saved, current) => ({ ...current, ...(saved as object), mode: "attendee" }),
      storage: createJSONStorage(() => ({
        setItem: (name, value) => storage.set(name, value),
        getItem: (name) => storage.getString(name) ?? null,
        removeItem: (name) => storage.remove(name)
      }))
    }
  )
);
