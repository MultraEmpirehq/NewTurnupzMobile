import { ImageStyle, StyleProp, View } from "react-native";
import React, { forwardRef, memo, useEffect, useMemo, useState } from "react";
import { Image, ImageProps } from "expo-image";
import { cn } from "@/shared/utils/classnames";
import { DefaultImage } from "@images/index";
import { sizedImageUri } from "@/shared/utils/cloudinary-image";

type TCustomImageProps = {
  imageClassName?: string;
  imageStyle?: StyleProp<ImageStyle>;
} & ImageProps;

const CustomImage = forwardRef<
  React.ComponentRef<typeof Image>,
  TCustomImageProps
>(
  (
    {
      imageClassName,
      onError = () => {},
      onLoadEnd = () => {},
      onLoad,
      placeholder,
      contentFit,
      source,
      className,
      style,
      imageStyle,
      ...props
    },
    ref
  ) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [hasLoadError, setHasLoadError] = useState(false);
    // Cloudinary pictures are fetched at the size they're shown, once it's known.
    const [shownWidth, setShownWidth] = useState(0);
    const remoteUri =
      source && typeof source === "object" && !Array.isArray(source) && "uri" in source
        ? source.uri
        : undefined;
    const isCloudinary = !!remoteUri && remoteUri.includes("res.cloudinary.com");
    const sizedSource = useMemo(
      () =>
        isCloudinary && remoteUri && shownWidth > 0
          ? { ...(source as object), uri: sizedImageUri(remoteUri, shownWidth) }
          : source,
      [isCloudinary, remoteUri, shownWidth, source]
    );
    const waitForSize = isCloudinary && shownWidth === 0;
    // A new picture starts afresh: an earlier one's error mustn't cover it.
    const shownUri =
      sizedSource && typeof sizedSource === "object" && !Array.isArray(sizedSource) && "uri" in sizedSource
        ? sizedSource.uri
        : undefined;
    useEffect(() => {
      setImageLoaded(false);
      setHasLoadError(false);
    }, [shownUri]);
    return (
      <View
        style={style}
        className={cn("relative size-28 overflow-hidden", className)}
        onLayout={
          isCloudinary
            ? (event) => {
                const width = Math.round(event.nativeEvent.layout.width);
                // Only a real change in size asks for a new picture.
                if (width > 0 && Math.abs(width - shownWidth) > 40) setShownWidth(width);
              }
            : undefined
        }
      >
        <Image
          ref={ref}
          style={imageStyle}
          className={cn("size-full", imageClassName)}
          source={waitForSize ? undefined : sizedSource || DefaultImage}
          onError={(e) => {
            // Android reports "Received null model" for the moment before a
            // picture is attached (and while it waits for its size). That isn't
            // a failure: treating it as one left the placeholder over the photo.
            if (waitForSize || /null model/i.test(String(e?.error ?? ""))) return;
            setHasLoadError(true);
            onError(e);
          }}
          onLoad={(e) => {
            // Shown: whatever went before, this picture loaded.
            setImageLoaded(true);
            setHasLoadError(false);
            onLoad?.(e);
          }}
          contentFit={source ? contentFit : "cover"}
          placeholderContentFit="cover"
          placeholder={placeholder || DefaultImage}
          onLoadEnd={onLoadEnd}
          {...props}
        />
        {(!imageLoaded || hasLoadError) && (
          <View className="absolute inset-0">
            {!imageLoaded && (
              <View className="flex-1 size-full">
                <Image
                  source={DefaultImage}
                  contentFit="cover"
                  contentPosition={"center"}
                  className="size-full"
                />
              </View>
            )}
            {hasLoadError && (
              <View className="flex-1 size-full">
                <Image
                  source={DefaultImage}
                  contentFit="cover"
                  contentPosition={"center"}
                  className="size-full"
                />
              </View>
            )}
          </View>
        )}
      </View>
    );
  }
);

CustomImage.displayName = "Custom image";

export default memo(CustomImage);
