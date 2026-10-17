import { showMessage } from "react-native-flash-message";

/**
 * How long a message stays: long enough to read at an easy pace (about a
 * second per 15 characters), never under 5 seconds or over 10. Errors stay at
 * least 7, since they usually say what to do next.
 */
export const toastDuration = (message: string, type: "danger" | "success" | "info") => {
  const reading = 2500 + message.length * 65;
  const floor = type === "danger" ? 7000 : 5000;
  return Math.min(Math.max(reading, floor), 10000);
};

const show = (message: string, type: "danger" | "success" | "info") =>
  showMessage({ message, type, duration: toastDuration(message, type) });

export const onError = (message: string) => show(message, "danger"),
  onSuccess = (message: string) => show(message, "success"),
  onInfo = (message: string) => show(message, "info");
