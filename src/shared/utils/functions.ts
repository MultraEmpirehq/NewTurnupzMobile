import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInMonths,
  isFuture
} from "date-fns";
import { Keyboard, LayoutChangeEvent } from "react-native";

export const dismissKeyboard = () => {
    const isKeyboardVisible = Keyboard.isVisible();
    if (!isKeyboardVisible) {
      return;
    }
    Keyboard.dismiss();
  },
  convertMilliseconds = (milliSeconds: number) => {
    const totalSeconds = Math.floor(milliSeconds / 1000);
    const rawHours = Math.floor(totalSeconds / 3600);
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
      2,
      "0"
    );
    const seconds = String(totalSeconds % 60).padStart(2, "0");

    const hours = rawHours > 0 ? String(rawHours).padStart(2, "0") : undefined;

    return { hours, minutes, seconds };
  };

export const getComponentLayoutProperties: (data: LayoutChangeEvent) => {
  x: number;
  y: number;
  width: number;
  height: number;
} = (data) => {
  const { x, y, width, height } = data?.nativeEvent?.layout || {};

  return { x, y, width, height };
};

export const maskSensitiveInfo = (text: string, type: "email" | "phone") => {
  if (!text || typeof text !== "string") return "";

  const functionCalls = {
    email: () => {
      const [username, domain] = text.split("@");
      if (!domain || username.length < 2) return text; // Invalid email, return as is
      const visibleChars = Math.min(username.length, 2);
      return `${username[0]}${"*".repeat(username.length - visibleChars)}${
        username[username.length - 1]
      }@${domain}`;
    },
    phone: () => {
      if (text.length < 7) return text; // Not enough digits to mask
      return `${text.slice(0, 3)}${"*".repeat(text.length - 5)}${text.slice(
        -2
      )}`;
    },
    card: () => {
      if (text.length < 12) return text; // Unusually short, might not be a real card
      return `${text.slice(0, 4)} ${"*".repeat(text.length - 8)} ${text.slice(
        -4
      )}`;
    }
  };
  const functionToRun = functionCalls[type];

  if (!functionToRun) {
    return text;
  }

  return functionToRun();
};

export const formatUpcomingTime = (targetDate: Date): string => {
  const now = new Date();

  if (!isFuture(targetDate)) {
    return "now";
  }

  const minutes = differenceInMinutes(targetDate, now);

  if (minutes < 1) {
    return "now";
  }

  if (minutes < 60) {
    return `in the next ${minutes} minute${minutes > 1 ? "s" : ""}`;
  }

  const hours = differenceInHours(targetDate, now);

  if (hours < 24) {
    return `in the next ${hours} hour${hours > 1 ? "s" : ""}`;
  }

  const days = differenceInDays(targetDate, now);

  if (days < 30) {
    return `in the next ${days} day${days > 1 ? "s" : ""}`;
  }

  const months = differenceInMonths(targetDate, now);

  return `in the next ${months} month${months > 1 ? "s" : ""}`;
};

export const capitalizeFirstLetter = (string: string) => {
  const firstLetter = string[0];
  const restOfTheString = string.slice(1);
  return `${firstLetter.toUpperCase()}${restOfTheString?.toLowerCase()}`;
};
