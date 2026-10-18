import { useEffect, useRef } from "react";
import { BackHandler } from "react-native";
import { useScreenActive } from "./use-screen-active";

/**
 * Android's back button (or back gesture) does what the page's own back arrow
 * does. The page opened last answers first, so back always steps out of the
 * page on screen. Return false from the handler to let it fall through to the
 * page underneath. Does nothing on iOS, which has no back button. A page on a
 * tab you've left doesn't answer until you're back on that tab.
 */
export const useHardwareBack = (
  onBack?: (() => void | boolean) | null,
  enabled = true
) => {
  const latest = useRef(onBack);
  latest.current = onBack;
  const active = useScreenActive() && enabled;

  useEffect(() => {
    if (!active) return;
    // Registered once per page, so a page re-rendering never jumps the queue.
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      const handler = latest.current;
      if (!handler) return false;
      return handler() !== false;
    });
    return () => subscription.remove();
  }, [active]);
};
