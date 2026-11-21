import React, { memo, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useVideoPlayer, VideoView } from "expo-video";

/**
 * A clip in a post: plays on its own with the sound off and loops; the
 * speaker button turns the sound on and off. Pauses when it isn't the one on
 * show (`active` false).
 */
const ClipPlayer = ({ uri, active = true, fit = "cover" }: { uri: string; active?: boolean; fit?: "cover" | "contain" }) => {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  const toggleSound = () => {
    player.muted = !muted;
    setMuted(!muted);
  };

  return (
    <View className="size-full bg-black">
      <VideoView player={player} style={{ width: "100%", height: "100%" }} contentFit={fit} nativeControls={false} />
      <Pressable
        onPress={toggleSound}
        accessibilityRole="button"
        accessibilityLabel={muted ? "Turn sound on" : "Turn sound off"}
        hitSlop={8}
        className="absolute bottom-3 right-3 size-10 items-center justify-center rounded-full bg-black/60"
      >
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path d="M4 9h4l5-4v14l-5-4H4z" fill="#FFFFFF" />
          {muted ? (
            <Path d="M17 9l4 6M21 9l-4 6" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
          ) : (
            <Path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" fill="none" />
          )}
        </Svg>
      </Pressable>
    </View>
  );
};

export default memo(ClipPlayer);
