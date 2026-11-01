import { create } from "zustand";
import { createMMKV } from "react-native-mmkv";

/**
 * The one-time permissions step after the launch intro: whether it's been
 * shown on this phone, and whether they chose "Not now" for location (so Home
 * doesn't ask again straight away).
 */
const storage = createMMKV({ id: "turnup-permissions-intro" });
const SEEN = "seen";
const LOCATION_SKIPPED = "locationSkipped";

type TPermissionsIntroStore = {
  seen: boolean;
  locationSkipped: boolean;
  finish: (locationSkipped: boolean) => void;
};

export const usePermissionsIntroStore = create<TPermissionsIntroStore>((set) => ({
  seen: storage.getBoolean(SEEN) ?? false,
  locationSkipped: storage.getBoolean(LOCATION_SKIPPED) ?? false,
  finish: (locationSkipped) => {
    storage.set(SEEN, true);
    storage.set(LOCATION_SKIPPED, locationSkipped);
    set({ seen: true, locationSkipped });
  }
}));

/** Read outside React, e.g. from the home place look-up. */
export const locationWasSkipped = () => usePermissionsIntroStore.getState().locationSkipped;
