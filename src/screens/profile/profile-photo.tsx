import React, { memo } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { sizedImageUri } from "@/shared/utils/cloudinary-image";
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
 * Your photo on your own profile: a rounded square with a ring the colour of the
 * page, so it sits cleanly over the blue banner. Initials when there's no photo.
 */
export const ProfilePhoto = memo(
  ({
    uri,
    name,
    size,
    ringColor = "#F7F8FB"
  }: {
    uri?: string | null;
    name: string;
    size: number;
    ringColor?: string;
  }) => {
    const radius = Math.round(size * 0.29);
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
          borderWidth: 4,
          borderColor: ringColor
        }}
      >
        {uri ? (
          <Image
            source={{ uri: sizedImageUri(uri, size) }}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <TextComponent className="font-bold" style={{ color: BRAND.blueDeep, fontSize: size * 0.34 }}>
            {initialsOf(name)}
          </TextComponent>
        )}
      </View>
    );
  }
);
