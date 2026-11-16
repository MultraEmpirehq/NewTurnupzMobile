import { ONESIGNAL_APP_ID } from "@env";
import { LogLevel, NotificationClickEvent, OneSignal } from "react-native-onesignal";
import { create } from "zustand";

/**
 * Phone notifications, through OneSignal. The server sends each one to the
 * Turnupz user id, so this phone is linked to whoever is signed in (and
 * unlinked on sign-out, so the next person doesn't get the last one's alerts).
 */

let started = false;

/** Where a tapped notification should take them, picked up by Home. */
export const usePushTapStore = create<{
  tab: "tickets" | "favorites" | null;
  open: (tab: "tickets" | "favorites") => void;
  clear: () => void;
}>((set) => ({
  tab: null,
  open: (tab) => set({ tab }),
  clear: () => set({ tab: null })
}));

export const startPush = () => {
  if (started || !ONESIGNAL_APP_ID) return;
  started = true;
  try {
    if (__DEV__) OneSignal.Debug.setLogLevel(LogLevel.Warn);
    OneSignal.initialize(ONESIGNAL_APP_ID);
    OneSignal.Notifications.addEventListener("click", (event: NotificationClickEvent) => {
      const data = (event.notification.additionalData ?? {}) as { href?: string };
      // Orders and tickets open My Tickets; anything else opens Notifications,
      // where it's waiting at the top to tap.
      usePushTapStore
        .getState()
        .open(data.href?.startsWith("/orders") || data.href?.startsWith("/profile/orders") ? "tickets" : "favorites");
    });
  } catch {
    // A build without the native module (Expo Go): no push, nothing else breaks.
    started = false;
  }
};

/** Signed in: this phone gets their alerts. Asks permission once (Android 13+, iPhone). */
export const linkPush = async (userId: string) => {
  if (!started) return;
  try {
    OneSignal.login(userId);
    if (await OneSignal.Notifications.canRequestPermission()) {
      await OneSignal.Notifications.requestPermission(false);
    }
  } catch {
    // Push is a bonus: never block sign-in on it.
  }
};

/** Signed out: this phone stops getting their alerts. */
export const unlinkPush = () => {
  if (!started) return;
  try {
    OneSignal.logout();
  } catch {
    /* nothing to undo */
  }
};
