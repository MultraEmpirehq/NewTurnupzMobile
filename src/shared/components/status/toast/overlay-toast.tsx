import React, { memo, useEffect, useRef } from "react";
import FlashMessage, { FlashMessageManager } from "react-native-flash-message";
import ToastMessage from "./custom-toast-message.component";

/**
 * Put one inside any full-screen overlay (a Modal). While the overlay is open,
 * toasts show on top of it instead of behind it; when it closes, they go back
 * to the app's own toast. Overlays opened on top of each other stack the same way.
 */
/** The library's manager does have these; its type notes just leave them out. */
const manager = FlashMessageManager as unknown as {
  hold: (instance: FlashMessage) => void;
  unhold: () => void;
};

const OverlayToast = () => {
  const ref = useRef<FlashMessage>(null);
  useEffect(() => {
    const instance = ref.current;
    if (instance) manager.hold(instance);
    return () => manager.unhold();
  }, []);
  return <FlashMessage ref={ref} position="top" MessageComponent={ToastMessage} canRegisterAsDefault={false} />;
};

export default memo(OverlayToast);
