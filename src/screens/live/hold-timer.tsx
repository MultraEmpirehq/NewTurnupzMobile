import React, { memo, useEffect, useState } from "react";
import { View } from "react-native";
import TextComponent from "@/shared/components/text/text.component";

/** How long the API holds seats while someone pays (ORDER_HOLD_MS there). */
const HOLD_MS = 15 * 60 * 1000;
/** From here the countdown turns amber, to hurry them along. */
const NEARLY_MS = 2 * 60 * 1000;

const clock = (ms: number) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

/** Time left until `until`, ticking every second. */
export const useTimeLeft = (until?: string | null) => {
  const end = until ? new Date(until).getTime() : NaN;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (Number.isNaN(end)) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [end]);
  return Number.isNaN(end) ? null : Math.max(0, end - now);
};

/**
 * How long their seats stay held while they pay: a countdown and a bar that
 * empties. Once it runs out the seats may go to someone else, though opening
 * the payment page again holds them afresh if they're still free.
 */
const HoldTimer = ({ until }: { until?: string | null }) => {
  const left = useTimeLeft(until);
  if (left === null) return null;

  const over = left <= 0;
  const nearly = !over && left <= NEARLY_MS;
  const tone = over ? "#dc2626" : nearly ? "#d97706" : "#00B2FF";
  const share = Math.min(1, left / HOLD_MS);

  return (
    <View
      className="w-full rounded-2xl border bg-white px-4 py-3"
      style={{ borderColor: over ? "#fecaca" : nearly ? "#fde68a" : "#e4e4e7" }}
      accessibilityRole="timer"
      accessibilityLabel={
        over ? "Your seats are no longer held" : `Seats held for ${clock(left)}`
      }
    >
      <View className="flex-row items-center justify-between">
        <TextComponent className="text-sm font-semibold text-zinc-700">
          {over ? "Your hold has ended" : "Your seats are held for"}
        </TextComponent>
        {!over && (
          <TextComponent
            className="text-lg font-bold"
            style={{ color: tone, fontVariant: ["tabular-nums"] }}
          >
            {clock(left)}
          </TextComponent>
        )}
      </View>
      <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <View
          className="h-full rounded-full"
          style={{ width: `${share * 100}%`, backgroundColor: tone }}
        />
      </View>
      {(over || nearly) && (
        <TextComponent className="mt-2 text-xs text-zinc-600">
          {over
            ? "Someone else can buy these seats now. Open the payment page again and we'll hold them for you if they're still free."
            : "Finish paying soon, or the seats go back on sale."}
        </TextComponent>
      )}
    </View>
  );
};

export default memo(HoldTimer);
