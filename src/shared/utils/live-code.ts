import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";
import { createMMKV } from "react-native-mmkv";

/**
 * A ticket's live QR code, made on the phone (offline too) from the ticket's
 * secret and the time. It changes every 30 seconds, so a screenshot stops
 * working within about 90 seconds. Must match the API's format exactly:
 *
 *   TZ1.<ticket code>.<30-second window>.<12 hex characters of HMAC-SHA256>
 */

const storage = createMMKV({ id: "turnup-clock" });
const OFFSET_KEY = "server-offset-ms";

/** How far the phone's clock is from Turnupz's, learnt whenever tickets load. */
export const rememberServerTime = (serverTime: string, receivedAt = Date.now()) => {
  const offset = new Date(serverTime).getTime() - receivedAt;
  // A reading wildly off is a bad response, not a bad clock.
  if (Number.isFinite(offset) && Math.abs(offset) < 7 * 24 * 60 * 60 * 1000) {
    storage.set(OFFSET_KEY, offset);
  }
};

/** Now, on Turnupz's clock: right even when the phone's time is set wrong. */
export const serverNow = () => Date.now() + (storage.getNumber(OFFSET_KEY) ?? 0);

export const liveCodeFor = (secret: string, code: string, windowSeconds = 30, at = serverNow()) => {
  const window = Math.floor(at / 1000 / windowSeconds);
  const mac = bytesToHex(hmac(sha256, utf8ToBytes(secret), utf8ToBytes(`${code}.${window}`)))
    .slice(0, 12)
    .toUpperCase();
  return {
    value: `TZ1.${code}.${window}.${mac}`,
    /** Seconds until the next code. */
    secondsLeft: windowSeconds - (Math.floor(at / 1000) % windowSeconds)
  };
};
