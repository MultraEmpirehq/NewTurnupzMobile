import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";

/** Where the phone is, as far as the home feed needs: the city and country. */
export type THomePlace = {
  city?: string;
  country?: string;
  countryCode: string;
};

type THomePlaceStore = {
  place: THomePlace | null;
  checkedAt: number;
  setPlace: (place: THomePlace | null) => void;
};

const storage = createMMKV({ id: "turnup-home-place" });

export const useHomePlaceStore = create<THomePlaceStore>()(
  persist(
    (set) => ({
      place: null,
      checkedAt: 0,
      setPlace: (place) => set({ place, checkedAt: Date.now() })
    }),
    {
      name: "home-place",
      storage: createJSONStorage(() => ({
        getItem: (key) => storage.getString(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.remove(key)
      }))
    }
  )
);

/** Looked up again after this long; in between, the last place is used. */
const FRESH_FOR = 6 * 60 * 60 * 1000;
/** The feed never waits longer than this for a location. */
const GIVE_UP_AFTER = 6000;

const withTimeout = <T>(work: Promise<T>, ms: number) =>
  Promise.race([
    work,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))
  ]);

/** Asks the first time; true when the app may use the phone's location. */
const locationAllowed = async () => {
  let permission = await Location.getForegroundPermissionsAsync();
  if (permission.status === "undetermined" && permission.canAskAgain) {
    permission = await Location.requestForegroundPermissionsAsync();
  }
  return permission.status === "granted";
};

/** The city and country the phone is in, from a recent or rough fix. */
const findPlace = async (): Promise<THomePlace | null> => {
  const position =
    (await Location.getLastKnownPositionAsync({ maxAge: FRESH_FOR })) ??
    (await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low
    }));
  const [address] = await Location.reverseGeocodeAsync(position.coords);
  if (!address?.isoCountryCode) return null;
  return {
    city: address.city ?? address.subregion ?? undefined,
    country: address.country ?? undefined,
    countryCode: address.isoCountryCode.toUpperCase()
  };
};

/**
 * Where to show events from on the home feed. Asks for location the first
 * time; if it's allowed, the feed shows events where you are, otherwise
 * events from everywhere. `ready` is false only while the first look-up runs.
 */
export const useHomePlace = () => {
  const { place, checkedAt, setPlace } = useHomePlaceStore();
  const fresh = !!place && Date.now() - checkedAt < FRESH_FOR;
  const [ready, setReady] = useState(fresh);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // Asked (once) without a time limit: people take a moment to answer.
        if (!(await locationAllowed())) {
          if (!cancelled) setPlace(null);
          return;
        }
        if (fresh) return;
        const found = await withTimeout(findPlace(), GIVE_UP_AFTER);
        // Too slow this time: keep the last place we knew, if any.
        if (!cancelled && found) setPlace(found);
      } catch {
        // No way to name where the phone is: show events from everywhere.
        if (!cancelled && !useHomePlaceStore.getState().place) setPlace(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { ready, place: useHomePlaceStore((state) => state.place) };
};
