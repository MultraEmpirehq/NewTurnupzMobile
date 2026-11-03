import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";

/**
 * Attendee or organiser: which app opens. Organisers and team members choose
 * once (we ask the first time we see they run events), and the app opens in
 * the mode they last used. `workspaceVendorId` is the organiser whose events
 * they're looking at: null for their own, else a team they're on.
 */
type TOrganiserStore = {
  mode: "attendee" | "organiser";
  workspaceVendorId: string | null;
  /** Asked "attendee or organiser?" already, for this account. */
  askedFor: string[];
  /** Signed in by the Organiser side of the sign-in screen; home takes it from there. */
  wantsToHost: boolean;
  setWantsToHost: (wantsToHost: boolean) => void;
  setMode: (mode: "attendee" | "organiser") => void;
  setWorkspace: (vendorId: string | null) => void;
  markAsked: (userId: string) => void;
  reset: () => void;
};

const storage = createMMKV({ id: "turnup-organiser" });

export const useOrganiserStore = create<TOrganiserStore>()(
  persist(
    (set) => ({
      mode: "attendee",
      workspaceVendorId: null,
      askedFor: [],
      wantsToHost: false,
      setMode: (mode) => set({ mode }),
      setWantsToHost: (wantsToHost) => set({ wantsToHost }),
      setWorkspace: (workspaceVendorId) => set({ workspaceVendorId }),
      markAsked: (userId) =>
        set((state) =>
          state.askedFor.includes(userId) ? state : { askedFor: [...state.askedFor, userId] }
        ),
      // Signing out: the next person starts as an attendee.
      reset: () => set({ mode: "attendee", workspaceVendorId: null, wantsToHost: false })
    }),
    {
      name: "organiser",
      storage: createJSONStorage(() => ({
        setItem: (name, value) => storage.set(name, value),
        getItem: (name) => storage.getString(name) ?? null,
        removeItem: (name) => storage.remove(name)
      }))
    }
  )
);
