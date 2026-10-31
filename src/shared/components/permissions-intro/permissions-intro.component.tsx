import React, { memo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { BRAND } from "@/shared/utils/brand-colors";
import { usePermissionsIntroStore } from "@/shared/stores/permissions-intro.store";

const PinIcon = () => (
  <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"
      stroke={BRAND.blueDeep}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={9.5} r={2.6} stroke={BRAND.blueDeep} strokeWidth={1.8} />
  </Svg>
);

const CameraIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z"
      stroke={BRAND.grey}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={13.5} r={3.2} stroke={BRAND.grey} strokeWidth={1.7} />
  </Svg>
);

/**
 * Shown once, straight after the launch intro on a new install: asks for
 * location before anything else, saying what it's for. The camera isn't asked
 * for here; it's only needed to scan tickets, and is asked for on Scan, where
 * a "no" can't lock an organiser out before they ever need it.
 */
const PermissionsIntro = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const finish = usePermissionsIntroStore((state) => state.finish);
  const [asking, setAsking] = useState(false);

  const allow = async () => {
    setAsking(true);
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {
      // Whatever the answer (or an error), the app carries on; Home copes either way.
    }
    finish(false);
  };

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={[
        StyleSheet.absoluteFill,
        styles.screen,
        { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }
      ]}
      accessibilityViewIsModal
    >
      <StatusBar style="dark" />
      <View style={styles.body}>
        <View style={styles.iconTile}>
          <PinIcon />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {t("permissionsIntro.title")}
        </Text>
        <Text style={styles.text}>{t("permissionsIntro.location")}</Text>
        <Text style={styles.small}>{t("permissionsIntro.locationPrivacy")}</Text>

        <View style={styles.note}>
          <CameraIcon />
          <Text style={styles.noteText}>{t("permissionsIntro.camera")}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => void allow()}
          disabled={asking}
          accessibilityRole="button"
          style={[styles.primary, asking && styles.pressed]}
        >
          {asking ? (
            <ActivityIndicator color={BRAND.white} />
          ) : (
            <Text style={styles.primaryText}>{t("permissionsIntro.allow")}</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => finish(true)}
          disabled={asking}
          accessibilityRole="button"
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>{t("permissionsIntro.notNow")}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#f7fbff",
    paddingHorizontal: 24,
    justifyContent: "space-between",
    zIndex: 50
  },
  body: { flex: 1, justifyContent: "center", gap: 14 },
  iconTile: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: BRAND.blueTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6
  },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "700", color: BRAND.ink },
  text: { fontSize: 16, lineHeight: 24, color: BRAND.ink },
  small: { fontSize: 14, lineHeight: 20, color: BRAND.grey },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.greyLine
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19, color: BRAND.grey },
  actions: { gap: 10 },
  primary: {
    height: 54,
    borderRadius: 16,
    backgroundColor: BRAND.blueDeep,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryText: { color: BRAND.white, fontSize: 16, fontWeight: "700" },
  secondary: { height: 48, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: BRAND.grey, fontSize: 15, fontWeight: "600" },
  pressed: { opacity: 0.7 }
});

export default memo(PermissionsIntro);
