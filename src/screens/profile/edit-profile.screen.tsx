import React, { memo, useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View
} from "react-native";
import Svg, { Path } from "react-native-svg";
import TextComponent from "@/shared/components/text/text.component";
import { TUser } from "@/shared/stores/user.store";
import { BRAND } from "@/shared/utils/brand-colors";
import { useHardwareBack } from "@/shared/hooks/use-hardware-back";
import { BackHeader } from "@/screens/live/explore-details";
import ProfileInfoForm from "./profile-info.form";
import { updateProfile } from "./profile-api";
import { onError } from "@/shared/components/status/toast";
import { useQueryClient } from "@tanstack/react-query";
import { ProfilePhoto } from "./profile-photo";

/**
 * Edit profile, opened from the profile: your photo, then your details. Leaving
 * with changes not saved asks first, from the arrow or Android's back button.
 */
const EditProfileScreen = ({
  user,
  uploading,
  onChangePhoto,
  onBack
}: {
  user: TUser;
  uploading: boolean;
  onChangePhoto: () => void;
  onBack: () => void;
}) => {
  const [dirty, setDirty] = useState(false);
  const queryClient = useQueryClient();
  const [showCountry, setShowCountry] = useState(!!user.showCountry);
  const changeShowCountry = async (next: boolean) => {
    setShowCountry(next);
    try {
      await updateProfile({ showCountry: next });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch {
      setShowCountry(!next);
      onError("That didn't save. Please try again.");
    }
  };
  const name = user.name || [user.firstName, user.lastName].filter(Boolean).join(" ");

  const leave = useCallback(() => {
    if (!dirty) return onBack();
    Alert.alert("Discard your changes?", "You haven't saved them yet.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: onBack }
    ]);
  }, [dirty, onBack]);
  useHardwareBack(leave);

  return (
    <View className="flex-1" style={{ backgroundColor: "#F7F8FB" }}>
      <BackHeader title="Edit profile" onBack={leave} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48, gap: 24 }}
        >
          <View className="items-center gap-3">
            <ProfilePhoto uri={user.profileImage} name={name} size={104} />
            <Pressable
              onPress={onChangePhoto}
              disabled={uploading}
              accessibilityRole="button"
              className="flex-row items-center gap-2"
            >
              {uploading ? (
                <ActivityIndicator size="small" color={BRAND.blueDeep} />
              ) : (
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path
                    d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                    fill="none"
                    stroke={BRAND.blueDeep}
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
              <TextComponent className="text-sm font-bold" style={{ color: BRAND.blueDeep }}>
                {uploading ? "Uploading…" : "Change photo"}
              </TextComponent>
            </Pressable>
          </View>
          <ProfileInfoForm user={user} onDirtyChange={setDirty} onSaved={() => setDirty(false)} />
          <View className="flex-row items-center gap-3 rounded-2xl border bg-white px-4 py-3" style={{ borderColor: "#EEF0F4" }}>
            <View className="flex-1">
              <TextComponent className="text-sm font-bold text-zinc-950">Show my country on my profile</TextComponent>
              <TextComponent className="mt-0.5 text-xs text-zinc-500">
                {user.country ? `People will see ${user.country} under your name.` : "We don't have your country yet."}
              </TextComponent>
            </View>
            <Switch
              value={showCountry}
              onValueChange={(next) => void changeShowCountry(next)}
              disabled={!user.country}
              trackColor={{ true: BRAND.blueDeep, false: "#D4D4D8" }}
              thumbColor={BRAND.white}
              accessibilityLabel="Show my country on my profile"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default memo(EditProfileScreen);
