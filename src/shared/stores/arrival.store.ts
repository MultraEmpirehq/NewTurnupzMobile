import { createMMKV } from "react-native-mmkv";

/**
 * What brought someone to an event (a boost, a reminder…) and a promo code from
 * a promoter, kept for a day so the order can say where the sale came from.
 */
type TArrival = { src?: string; code?: string; at: number };

const KEEP_MS = 24 * 60 * 60 * 1000;
const storage = createMMKV({ id: "turnup-arrivals" });
const KEY = "arrivals";

const readAll = (): Record<string, TArrival> => {
  try {
    return JSON.parse(storage.getString(KEY) ?? "{}") as Record<string, TArrival>;
  } catch {
    return {};
  }
};

export const rememberArrival = (
  eventId: string,
  arrival: { src?: string | null; code?: string | null }
) => {
  if (!arrival.src && !arrival.code) return;
  const now = Date.now();
  const all = readAll();
  const current = all[eventId];
  all[eventId] = {
    src: arrival.src || current?.src,
    code: arrival.code || current?.code,
    at: now
  };
  // Old ones go as new ones come in.
  for (const [id, entry] of Object.entries(all)) {
    if (now - entry.at > KEEP_MS) delete all[id];
  }
  storage.set(KEY, JSON.stringify(all));
};

export const readArrival = (eventId: string): { src?: string; code?: string } => {
  const entry = readAll()[eventId];
  return entry && Date.now() - entry.at < KEEP_MS
    ? { src: entry.src, code: entry.code }
    : {};
};

/** `src` from a link such as "/explore/event/…?src=reminder". */
export const srcOfHref = (href?: string) => href?.match(/[?&]src=([a-z]+)/)?.[1];
