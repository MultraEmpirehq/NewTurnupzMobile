import { showMessage } from "react-native-flash-message";

/**
 * How long a toast stays: errors a little longer, since they usually say what
 * to do next. Tap to close sooner. The library's own fade-in is off: it never
 * runs on the new renderer, which left every toast invisible, so toasts simply
 * appear.
 */
export const TOAST_DURATION = { danger: 6000, success: 4000, info: 4000 } as const;

const show = (message: string, type: "danger" | "success" | "info") =>
  showMessage({ message, type, duration: TOAST_DURATION[type], animated: false });

export const onError = (message: string) => show(message, "danger"),
  onSuccess = (message: string) => show(message, "success"),
  onInfo = (message: string) => show(message, "info");
