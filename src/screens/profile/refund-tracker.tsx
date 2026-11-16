import React, { memo } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import TextComponent from "@/shared/components/text/text.component";
import { BRAND } from "@/shared/utils/brand-colors";

type TRefund = {
  status: string;
  toCard: { amount: number };
  requestedAt: string;
  completedAt?: string | null;
};

type TStage = { label: string; date?: string; state: "done" | "now" | "next" | "delayed" };

const day = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : undefined;

/** Where the refund has got to, as steps; the same as on the website. */
const stagesOf = (refund: TRefund): TStage[] => {
  const approved: TStage = { label: "Refund approved", date: day(refund.requestedAt), state: "done" };
  if (refund.toCard.amount <= 0) {
    return [approved, { label: "Back in your Turnupz Credit", date: day(refund.requestedAt), state: "done" }];
  }
  if (refund.status === "failed") {
    return [approved, { label: "Delayed, we're retrying", state: "delayed" }, { label: "In your account", state: "next" }];
  }
  if (refund.status === "processing") {
    return [approved, { label: "Sending to your card", state: "now" }, { label: "In your account", state: "next" }];
  }
  return [
    approved,
    { label: "Sent to your card", date: day(refund.completedAt ?? refund.requestedAt), state: "done" },
    { label: "In your account in 5–10 working days", state: "now" }
  ];
};

const DOT: Record<TStage["state"], { backgroundColor: string; borderColor: string }> = {
  done: { backgroundColor: "#059669", borderColor: "#059669" },
  now: { backgroundColor: BRAND.blue, borderColor: BRAND.blue },
  next: { backgroundColor: "#FFFFFF", borderColor: "#D4D4D8" },
  delayed: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" }
};

const RefundTracker = ({ refund }: { refund: TRefund }) => {
  const stages = stagesOf(refund);
  return (
    <View className="flex-row items-start" accessibilityRole="progressbar">
      {stages.map((stage, index) => (
        <View key={stage.label} className="flex-1 items-center">
          {index > 0 && (
            <View
              style={{
                position: "absolute",
                top: 11,
                left: "-50%",
                right: "50%",
                height: 2,
                backgroundColor: stage.state === "next" ? "#E4E4E7" : "#059669"
              }}
            />
          )}
          <View
            className="size-6 items-center justify-center rounded-full"
            style={{ borderWidth: 2, ...DOT[stage.state] }}
          >
            {stage.state === "done" && (
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12l5 5L20 7" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            )}
          </View>
          <TextComponent className="mt-1 px-1 text-center text-[11px] font-semibold text-zinc-800">{stage.label}</TextComponent>
          {!!stage.date && <TextComponent className="text-[10px] text-zinc-500">{stage.date}</TextComponent>}
        </View>
      ))}
    </View>
  );
};

export default memo(RefundTracker);
