import React, { memo } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import TextComponent from "@/shared/components/text/text.component";
import { BRAND } from "@/shared/utils/brand-colors";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

/**
 * A person's (or place's) picture in a circle, or their initials when there's
 * no picture. Size, radius and clipping are set as plain styles on both the
 * frame and the image, so it's round on every platform.
 */
const RoundAvatar = ({
  uri,
  name,
  size,
  ring
}: {
  uri?: string | null;
  name: string;
  size: number;
  /** A white ring around it, for pictures on a coloured background. */
  ring?: boolean;
}) => {
  const radius = size / 2;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        backgroundColor: BRAND.blueTint,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: ring ? 3 : 0,
        borderColor: BRAND.white
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          contentFit="cover"
          transition={150}
          accessibilityIgnoresInvertColors
          style={{ width: "100%", height: "100%", borderRadius: radius }}
        />
      ) : (
        <TextComponent
          className="font-bold"
          style={{ color: BRAND.blueDeep, fontSize: size * 0.36 }}
        >
          {initialsOf(name)}
        </TextComponent>
      )}
    </View>
  );
};

export default memo(RoundAvatar);
