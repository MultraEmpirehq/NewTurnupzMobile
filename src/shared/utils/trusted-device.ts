import { createMMKV } from "react-native-mmkv";

/**
 * The token that lets this phone skip the two-factor code for 30 days. Sent
 * only to the sign-in routes; losing it just means the code is asked for again.
 */
// Opened on first use, not on import: the API client imports this file, and
// nothing should touch native storage just by loading it.
let storage: ReturnType<typeof createMMKV> | null = null;
const store = () => (storage ??= createMMKV({ id: "turnup-two-factor" }));
const KEY = "trusted-device";

export const getTrustedDevice = () => {
  try {
    return store().getString(KEY) ?? null;
  } catch {
    return null;
  }
};

export const setTrustedDevice = (token?: string | null) => {
  if (token) store().set(KEY, token);
};

/** A sign-in answered "two-factor is on: send the code with this challenge". */
export type TTwoFactorChallenge = { twoFactorRequired: true; challenge: string };

export const isTwoFactorChallenge = (value: unknown): value is TTwoFactorChallenge =>
  !!value &&
  typeof value === "object" &&
  (value as { twoFactorRequired?: boolean }).twoFactorRequired === true &&
  typeof (value as { challenge?: unknown }).challenge === "string";
