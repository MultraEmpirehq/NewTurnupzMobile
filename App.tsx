import ContainerComponent from "@/shared/components/container/container.component";
import "@styles/global.css";
import "@/shared/utils/css-interop";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";
import { themes } from "@/shared/utils/colors";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FlashMessage from "react-native-flash-message";
import ToastMessage from "@/shared/components/status/toast/custom-toast-message.component";
import NavigationWrapper from "@/navigation/navigator-wrapper/navigator-wrapper";
import { useFonts } from "expo-font";
import { BRAND_FONTS } from "@/shared/utils/fonts";
import BrandIntro from "@/shared/components/brand-intro/brand-intro.component";
import { useIntroStore } from "@/shared/stores/intro.store";

const queryClient = new QueryClient();

export default function App() {
  // Hold the first frame until Plus Jakarta Sans is ready so text doesn't flash in the
  // system font; if loading fails, carry on with the system font. The wait uses
  // the intro's base colour, so splash → intro reads as one piece.
  const [fontsLoaded, fontError] = useFonts(BRAND_FONTS);
  const introDone = useIntroStore((state) => state.introDone);
  const finishIntro = useIntroStore((state) => state.setIntroDone);
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
            <FlashMessage position="top" MessageComponent={ToastMessage} />
            {/* Plays over the app, which loads underneath in the meantime. */}
            {!introDone && <BrandIntro onFinish={finishIntro} />}
          </SafeAreaProvider>
        </View>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
