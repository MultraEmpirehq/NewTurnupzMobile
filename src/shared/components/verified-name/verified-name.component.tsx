import React, { memo } from "react";
import { View } from "react-native";
import TextComponent from "@/shared/components/text/text.component";
import BadgeCheckIcon from "@/shared/assets/icons/badge-check.icon";
import { BRAND } from "@/shared/utils/brand-colors";

/**
 * A performer's name, with the blue verified tick when the Turnupz team has
 * approved them. Organisers can bill performers who aren't verified yet; they
 * just show without the tick.
 */
const VerifiedName = ({
  name,
  verified,
  className,
  tickSize = 14,
  numberOfLines = 1,
  centered
}: {
  name: string;
  verified?: boolean;
  className?: string;
  tickSize?: number;
  numberOfLines?: number;
  centered?: boolean;
}) => (
  <View
    className={
      centered
        ? "flex-row items-center justify-center gap-1"
        : "flex-row items-center gap-1"
    }
    accessible
    accessibilityLabel={verified ? `${name}, verified` : name}
  >
    <TextComponent
      numberOfLines={numberOfLines}
      className={className}
      style={{ flexShrink: 1 }}
    >
      {name}
    </TextComponent>
    {verified && (
      <BadgeCheckIcon size={tickSize} color={BRAND.blue} color2={BRAND.blueDeep} />
    )}
  </View>
);

export default memo(VerifiedName);
