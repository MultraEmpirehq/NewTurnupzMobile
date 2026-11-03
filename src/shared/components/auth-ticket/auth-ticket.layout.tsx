import React, { memo, useId } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ContainerComponent from "../container/container.component";
import TextComponent from "../text/text.component";
import BrandWordmark from "../brand-wordmark/brand-wordmark.component";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { BLUE, BLUE_DEEP } from "../brand-intro/intro-timeline";

/**
 * The sign-in stage, shared with the web: the brand's night sky (stars and two
 * soft glows), the wordmark, and the form drawn as a ticket (a gradient stub, a
 * tear line, then the form). Every auth screen sits in one.
 */

/** The night sky; the ticket's notches are cut in it. */
export const AUTH_NIGHT = "#00121a";

// Fixed positions, so the sky is the same every time.
const STARS = Array.from({ length: 34 }, (_, index) => ({
  top: `${(index * 37 + 5) % 100}%` as const,
  left: `${(index * 61 + 13) % 100}%` as const,
  size: index % 5 === 0 ? 3 : 2,
  opacity: 0.35 + ((index * 13) % 6) / 10
}));

const NightSky = () => {
  // Own ids per screen: stacked screens would otherwise share one gradient.
  const id = useId().replace(/:/g, "");
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={`${id}-blue`} cx="0%" cy="0%" r="75%">
            <Stop offset="0" stopColor={BLUE} stopOpacity="0.32" />
            <Stop offset="1" stopColor={BLUE} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={`${id}-pink`} cx="100%" cy="100%" r="80%">
            <Stop offset="0" stopColor={BLUE_DEEP} stopOpacity="0.3" />
            <Stop offset="1" stopColor={BLUE_DEEP} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id}-blue)`} />
        <Rect width="100%" height="100%" fill={`url(#${id}-pink)`} />
      </Svg>
      {STARS.map((star, index) => (
        <View
          key={index}
          style={{
            position: "absolute",
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            borderRadius: star.size,
            backgroundColor: "#ffffff",
            opacity: star.opacity
          }}
        />
      ))}
    </View>
  );
};

type TAuthTicketLayoutProps = {
  /** Small coloured line above the title, e.g. "Log in or sign up". */
  eyebrow: string;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  /** Shows a back arrow in the header. */
  onBack?: () => void;
  /** Sits under the ticket, e.g. the terms line. */
  footer?: React.ReactNode;
  /** The ticket's stub; organisers get their own ("All access"). */
  stubKicker?: string;
  stubTitle?: string;
};

const AuthTicketLayout: React.FC<TAuthTicketLayoutProps> = ({
  eyebrow,
  title,
  subtitle,
  children,
  onBack,
  footer,
  stubKicker = "ADMIT ONE",
  stubTitle = "Your pass to Turnupz"
}) => (
  <ContainerComponent isSafeAreaView className="flex-1" style={styles.page}>
    <NightSky />

    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
    >
      <ScrollView
        contentContainerClassName="grow px-horizontal pb-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="h-14 flex-row items-center justify-between">
          <BrandWordmark height={28} color="#ffffff" />
          {onBack && (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={12}
              className="rounded-full px-3 py-2"
            >
              <TextComponent className="text-sm font-medium text-white/70">
                ← Back
              </TextComponent>
            </Pressable>
          )}
        </View>

        <View className="flex-1 justify-center py-6">
          {/* Shadow outside, clipping inside: iOS drops a shadow on a view
              that clips. */}
          <View style={styles.ticketShadow}>
            <View style={styles.ticket}>
              {/* The stub. */}
              <LinearGradient
                colors={[BLUE, BLUE, BLUE_DEEP]}
                locations={[0, 0.45, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.stub}
              >
                <View className="flex-row items-start justify-between">
                  <View>
                    <TextComponent style={styles.admit}>
                      {stubKicker}
                    </TextComponent>
                    <TextComponent className="mt-1 text-xl font-bold text-white">
                      {stubTitle}
                    </TextComponent>
                  </View>
                  <View style={styles.serial}>
                    <TextComponent className="text-[11px] font-semibold text-white">
                      No. 0001
                    </TextComponent>
                  </View>
                </View>
              </LinearGradient>

              {/* The tear line, with a notch punched out of each side. */}
              <View style={styles.tear}>
                <View style={[styles.notch, styles.notchLeft]} />
                <View style={styles.dashes} />
                <View style={[styles.notch, styles.notchRight]} />
              </View>

              <View className="gap-6 px-6 pb-7 pt-6">
                <View className="gap-2">
                  <TextComponent style={styles.eyebrow}>
                    {eyebrow.toUpperCase()}
                  </TextComponent>
                  <TextComponent className="text-3xl font-bold text-black">
                    {title}
                  </TextComponent>
                  {typeof subtitle === "string" ? (
                    <TextComponent className="text-base text-black/60">
                      {subtitle}
                    </TextComponent>
                  ) : (
                    subtitle
                  )}
                </View>
                {children}
              </View>
            </View>
          </View>
          {footer && <View className="mt-5">{footer}</View>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </ContainerComponent>
);

export default memo(AuthTicketLayout);

const NOTCH = 26;

const styles = StyleSheet.create({
  page: {
    backgroundColor: AUTH_NIGHT
  },
  ticketShadow: {
    borderRadius: 28,
    backgroundColor: "#ffffff",
    shadowColor: "#0b1d2a",
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 6
  },
  ticket: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(11, 29, 42, 0.05)"
  },
  stub: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 26
  },
  admit: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
    letterSpacing: 2.6
  },
  serial: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  tear: {
    height: 0,
    flexDirection: "row",
    alignItems: "center"
  },
  notch: {
    position: "absolute",
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: AUTH_NIGHT
  },
  notchLeft: {
    left: -NOTCH / 2
  },
  notchRight: {
    right: -NOTCH / 2
  },
  dashes: {
    position: "absolute",
    left: 24,
    right: 24,
    borderTopWidth: 2,
    borderStyle: "dashed",
    borderColor: "#e3eef7"
  },
  eyebrow: {
    color: BLUE_DEEP,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2
  }
});
