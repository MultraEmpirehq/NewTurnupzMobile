import { Platform } from "react-native";
import ContainerComponent from "@/shared/components/container/container.component";
import "@styles/global.css";
import "@/shared/utils/css-interop";
import "@/shared/i18n";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";
import { themes } from "@/shared/utils/colors";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import FlashMessage from "react-native-flash-message";
import { FullWindowOverlay } from "react-native-screens";
import ToastMessage from "@/shared/components/status/toast/custom-toast-message.component";
import NavigationWrapper from "@/navigation/navigator-wrapper/navigator-wrapper";
import { useFonts } from "expo-font";
import { BRAND_FONTS } from "@/shared/utils/fonts";
import BrandIntro from "@/shared/components/brand-intro/brand-intro.component";
import { useIntroStore } from "@/shared/stores/intro.store";
import PermissionsIntro from "@/shared/components/permissions-intro/permissions-intro.component";
import { usePermissionsIntroStore } from "@/shared/stores/permissions-intro.store";

import { queryClient } from "@/shared/query-client";
import { useEffect } from "react";
import useUserStore from "@/shared/stores/user.store";
import { linkPush, startPush, unlinkPush } from "@/shared/push/push";

// Phone notifications start with the app, before anyone signs in.
startPush();

export default function App() {
  // Hold the first frame until Plus Jakarta Sans is ready so text doesn't flash in the
  // system font; if loading fails, carry on with the system font. The wait uses
  // the intro's base colour, so splash → intro reads as one piece.
  const [fontsLoaded, fontError] = useFonts(BRAND_FONTS);
  const introDone = useIntroStore((state) => state.introDone);
  const finishIntro = useIntroStore((state) => state.setIntroDone);
  // On a new install, permissions come first, straight after the intro.
  const permissionsSeen = usePermissionsIntroStore((state) => state.seen);
  // This phone gets the signed-in person's alerts, and stops on sign-out.
  const userId = useUserStore((state) => state.user?.id);
  const signedIn = useUserStore((state) => !!state.userToken);
  useEffect(() => {
    if (userId && signedIn) void linkPush(userId);
    else unlinkPush();
  }, [userId, signedIn]);
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: "#f7fbff" }} />;
  }

  // const clearUserStore = useUserStore((state) => state.clearUserStore);
  // useEffect(() => {
  //   clearUserStore();
  // }, []);
  return (
    <GestureHandlerRootView className="flex-1">
      <QueryClientProvider client={queryClient}>
        <View className="flex-1" style={themes["light"]}>
          <SafeAreaProvider className="flex-1">
            {/* Sign-in comes first; once signed in, the home feed is the app. */}
            <ContainerComponent>
              <NavigationWrapper />
            </ContainerComponent>
            {/* On iPhone, inside a full-window overlay so toasts sit above every screen
                (native screens otherwise cover them). */}
            {Platform.OS === "ios" ? (
              <FullWindowOverlay>
                <FlashMessage position="top" MessageComponent={ToastMessage} />
              </FullWindowOverlay>
            ) : (
              <FlashMessage position="top" MessageComponent={ToastMessage} />
            )}
            {/* Plays over the app, which loads underneath in the meantime. */}
            {!introDone && <BrandIntro onFinish={finishIntro} />}
            {introDone && !permissionsSeen && <PermissionsIntro />}
          </SafeAreaProvider>
        </View>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
