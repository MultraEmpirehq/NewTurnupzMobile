import { Text, TextProps } from "react-native";
import React, { forwardRef, memo } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/shared/utils/classnames";
import { useAccessibilityStore } from "@/shared/stores/accessibility.store";
import { brandFontStyle } from "@/shared/utils/fonts";
const getTextClassName = cva(["text-text"], {
  variants: {
    size: {
      small: "text-xs",
      medium: "text-base",
      large: "text-lg",
    },
  },
  defaultVariants: {
    size: "medium",
  },
});
export type TTextComponentProp = {
  size?: "small" | "medium" | "large";
} & TextProps;
const TextComponent = forwardRef<
  React.ComponentRef<typeof Text>,
  TTextComponentProp
>(({ size, className, children, style, ...props }, ref) => {
  const largerText = useAccessibilityStore((state) => state.largerText);
  const highContrast = useAccessibilityStore((state) => state.highContrast);
  const accessibleFontSize = largerText
    ? className?.includes("text-[10px]")
      ? 12
      : className?.includes("text-xs")
        ? 14
        : className?.includes("text-sm")
          ? 16
          : className?.includes("text-lg")
            ? 21
            : className?.includes("text-xl")
              ? 24
              : className?.includes("text-2xl")
                ? 29
                : className?.includes("text-3xl")
                  ? 35
                  : className?.includes("text-5xl")
                    ? 54
                    : size === "small"
                      ? 14
                      : size === "large"
                        ? 21
                        : 18
    : undefined;
  const textStyle = [
    style,
    accessibleFontSize ? { fontSize: accessibleFontSize } : undefined,
    highContrast ? { fontWeight: "700" as const } : undefined
  ];
  return (
    <Text
      className={cn(getTextClassName({ size }), className)}
      ref={ref}
      style={[textStyle, brandFontStyle(className, textStyle)]}
      {...props}
    >
      {children}
    </Text>
  );
});

TextComponent.displayName = "Text component";

export default memo(TextComponent);
