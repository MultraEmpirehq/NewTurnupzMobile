import React, { memo } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { sizedImageUri } from "@/shared/utils/cloudinary-image";
import TextComponent from "@/shared/components/text/text.component";
import { BRAND } from "@/shared/utils/brand-colors";

import { initialsOf } from "@/shared/utils/initials";

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
  /** A ring around it: white (true) for pictures on a coloured background, or a colour (the brand blue for people you follow). */
  ring?: boolean | string;
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
        borderWidth: ring ? (typeof ring === "string" ? 2.5 : 3) : 0,
        borderColor: typeof ring === "string" ? ring : BRAND.white
      }}
    >
      {uri ? (
        <Image
          source={{ uri: sizedImageUri(uri, size) }}
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
