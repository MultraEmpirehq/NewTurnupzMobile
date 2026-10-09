import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";
import { getData, postData } from "@/api";

/**
 * Events the person has hidden ("Hide"). The api keeps the list (and leaves
 * hidden events out of the feeds it returns); a copy is kept on the phone so
 * cards disappear the moment they're hidden and stay hidden offline.
 */

const storage = createMMKV({ id: "turnup-hidden-events" });

type THiddenEventsStore = {
  hiddenEventIds: string[];
  /** Hides the event, or brings it back. Resolves to whether it's now hidden. */
  toggleHidden: (eventId: string) => Promise<boolean>;
  /** Pulls the signed-in person's hidden list from the api. */
  sync: () => Promise<void>;
};

const isMissingRoute = (error: unknown) =>
  (error as { response?: { status?: number } })?.response?.status === 404;

export const useHiddenEventsStore = create<THiddenEventsStore>()(
  persist(
    (set, get) => ({
      hiddenEventIds: [],
      toggleHidden: async (eventId) => {
        const before = get().hiddenEventIds;
        const hide = !before.includes(eventId);
        set({
          hiddenEventIds: hide
            ? [...before, eventId]
            : before.filter((id) => id !== eventId)
        });
        try {
          const { data } = await postData<undefined, { isHidden: boolean }>(
            `/events/hidden/${eventId}`
          );
          return data?.data?.isHidden ?? hide;
        } catch (error) {
          // An api without hidden events yet: keep it on this phone only.
          if (isMissingRoute(error)) return hide;
          set({ hiddenEventIds: before });
          throw error;
        }
      },
      sync: async () => {
        try {
          const { data } = await getData<string[]>("/events/hidden");
          if (Array.isArray(data?.data)) set({ hiddenEventIds: data.data });
        } catch {
          // Keep what's on the phone.
        }
      }
    }),
    {
      name: "hidden-events",
      partialize: (state) => ({ hiddenEventIds: state.hiddenEventIds }),
      storage: createJSONStorage(() => ({
        setItem: (name, value) => storage.set(name, value),
        getItem: (name) => storage.getString(name) ?? null,
        removeItem: (name) => storage.remove(name)
      }))
    }
  )
);
