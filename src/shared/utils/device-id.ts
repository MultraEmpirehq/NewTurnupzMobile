import { Platform } from "react-native";
import { createMMKV } from "react-native-mmkv";

/**
 * A random id for this install, made once and kept. The api stores only its
 * hash, to notice one person rewarding themselves with several accounts. It
 * says nothing about the phone itself and resets if the app is reinstalled.
 */
const storage = Platform.OS === "web" ? null : createMMKV({ id: "turnupz-install" });
const KEY = "install-id";

const randomId = () =>
  Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");

let cached: string | null = null;

export const installId = () => {
  if (cached) return cached;
  try {
    const saved = storage?.getString(KEY);
    if (saved) return (cached = saved);
    const fresh = randomId();
    storage?.set(KEY, fresh);
    return (cached = fresh);
  } catch {
    return (cached = randomId());
  }
};
