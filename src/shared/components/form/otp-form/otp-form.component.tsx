import { View } from "react-native";
import React, { memo, useEffect, useMemo, useState } from "react";
import { cva } from "class-variance-authority";
import { WINDOW_WIDTH } from "@utils/variables";
import TextComponent from "../../text/text.component";
import CircleExclamationIcon from "@icons/circle-exclamation.icon";

const getActiveBoxClassName = cva("!rounded-md", {
  variants: {
    isActive: {
      false: null,
      true: "border border-primary"
    },
    hasValue: {
      true: "bg-primary/5",
      false: "bg-black/5 dark:bg-white/5"
    }
  },
  defaultVariants: {
    isActive: false,
    hasValue: false
  }
});

const TOTAL_BOX_CONTAINER_GAP = 40;

/** Largest a box gets on a wide screen. */
const MAX_BOX_SIZE = 56;

// Sized from the space the boxes actually have, not the whole screen: inside
// a card, the screen width made the last box spill over the edge.
const getBoxesSize = (count: number, available: number) => {
  const gapSize = Math.min(10, TOTAL_BOX_CONTAINER_GAP / (count - 1));
  const boxSize = Math.min(MAX_BOX_SIZE, (available - gapSize * (count - 1)) / count);
  return { boxSize, gapSize };
};

const OTPInputBox: React.FC<{
  size: number;
  value: string;
  isActive?: boolean;
}> = ({ size, value, isActive = false }) => {
  return (
    <View
      style={{ width: size, height: size, maxHeight: 65 }}
      className={getActiveBoxClassName({ isActive, hasValue: !!value })}
    >
      <View className="items-center justify-center w-full h-full rounded-md">
        <TextComponent className="text-xl font-bold text-primary">
          {value}
        </TextComponent>
      </View>
    </View>
  );
};

const MemorizedOTPBox = memo(OTPInputBox);

const OtpFormComponent: React.FC<{
  totalBoxes?: number;
  value: string;
  error?: string;
}> = ({ value = "", totalBoxes = 6, error }) => {
  const [otp, setOTP] = useState(new Array(totalBoxes).fill(""));
  useEffect(() => {
    const joinedOtp = otp.join("");
    if (joinedOtp !== value && joinedOtp.length <= totalBoxes) {
      setOTP((prevState) => prevState.map((_, index) => value[index] || ""));
    }
  }, [value, otp, totalBoxes]);
  // Until it's measured, a safe guess for a phone screen.
  const [available, setAvailable] = useState(WINDOW_WIDTH - 100);
  const boxMeasurement = useMemo(() => getBoxesSize(totalBoxes, available), [totalBoxes, available]);
  return (
    <View className="gap-3">
      <View
        style={{ gap: boxMeasurement?.gapSize }}
        className="flex w-full flex-row items-stretch justify-center"
        onLayout={(event) => {
          const width = Math.floor(event.nativeEvent.layout.width);
          if (width > 0 && width !== available) setAvailable(width);
        }}
      >
        {otp.map((otpValue, index) => (
          <MemorizedOTPBox
            value={otpValue}
            key={index}
            size={boxMeasurement?.boxSize}
            isActive={value.length === index}
          />
        ))}
      </View>
      {error && (
        <View className="flex flex-row items-center justify-center gap-2">
          <CircleExclamationIcon color="#ef4444" />
          <TextComponent className="text-sm text-red-500">
            {error}
          </TextComponent>
        </View>
      )}
    </View>
  );
};

export default memo(OtpFormComponent);
