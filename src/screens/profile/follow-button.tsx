import React, { memo, useState } from "react";
import { ActivityIndicator, Pressable } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import TextComponent from "@/shared/components/text/text.component";
import { onError } from "@/shared/components/status/toast";
import useUserStore from "@/shared/stores/user.store";
import { constructErrorMessage } from "@/api/functions";
import {
  TFollowTargetType,
  TFollowedItem,
  toggleFollow,
  useFollows
} from "./profile-api";

const BLUE = "#00b2ff";

/**
 * Follow or unfollow a performer, venue or planner. What you follow shows on
 * your profile. Hidden when signed out.
 */
const FollowButton = ({
  type,
  id,
  name,
  size = "md"
}: {
  type: TFollowTargetType;
  id?: string | null;
  name: string;
  size?: "sm" | "md";
}) => {
  const queryClient = useQueryClient();
  const isSignedIn = !!useUserStore((state) => state.userToken);
  const follows = useFollows(isSignedIn);
  const [busy, setBusy] = useState(false);
  if (!isSignedIn || !id) return null;

  const following = !!follows.data?.some(
    (item) => item.targetType === type && item.targetId === id
  );

  const press = async () => {
    setBusy(true);
    try {
      const now = await toggleFollow(type, id);
      // Show it straight away; the list refetches with names and pictures.
      queryClient.setQueryData<TFollowedItem[]>(["follows"], (current = []) =>
        now
          ? current
          : current.filter((item) => !(item.targetType === type && item.targetId === id))
      );
      void queryClient.invalidateQueries({ queryKey: ["follows"] });
    } catch (error) {
      onError(
        constructErrorMessage(error as TApiErrorResponseType, "Couldn't update who you follow.")
      );
    } finally {
      setBusy(false);
    }
  };

  const small = size === "sm";
  return (
    <Pressable
      onPress={() => void press()}
      disabled={busy || follows.isLoading}
      accessibilityRole="button"
      accessibilityState={{ selected: following }}
      accessibilityLabel={following ? `Unfollow ${name}` : `Follow ${name}`}
      className={
        small
          ? "h-8 min-w-24 items-center justify-center rounded-full px-4"
          : "h-11 min-w-32 items-center justify-center rounded-full px-6"
      }
      style={
        following
          ? { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)" }
          : { backgroundColor: BLUE }
      }
    >
      {busy ? (
        <ActivityIndicator size="small" color={following ? BLUE : "#ffffff"} />
      ) : (
        <TextComponent
          className={small ? "text-xs font-bold" : "text-sm font-bold"}
          style={{ color: following ? "#18181b" : "#ffffff" }}
        >
          {following ? "Following" : "Follow"}
        </TextComponent>
      )}
    </Pressable>
  );
};

export default memo(FollowButton);
