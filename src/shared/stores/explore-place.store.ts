import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";

/** A country, or one of its cities, that Explore's sections are about. */
export type TExplorePlace = { countryCode: string; country: string; city?: string };

/**
 * Where Explore is looking: "Trending in Lagos" and the rest. Kept on the
 * phone so it opens where you left it. `null` is everywhere; unset means not
 * chosen yet (Explore starts in the phone's own country).
 */
type TExplorePlaceStore = {
  place?: TExplorePlace | null;
  setPlace: (place: TExplorePlace | null) => void;
};

const storage = createMMKV({ id: "turnup-explore-place" });

export const useExplorePlaceStore = create<TExplorePlaceStore>()(
  persist(
    (set) => ({
      place: undefined,
      setPlace: (place) => set({ place })
    }),
    {
      name: "explore-place",
      partialize: (state) => ({ place: state.place }),
      storage: createJSONStorage(() => ({
        setItem: (name, value) => storage.set(name, value),
        getItem: (name) => storage.getString(name) ?? null,
        removeItem: (name) => storage.remove(name)
      }))
    }
  )
);

export const placeLabel = (place?: TExplorePlace | null) =>
  place ? place.city ?? place.country : "everywhere";
