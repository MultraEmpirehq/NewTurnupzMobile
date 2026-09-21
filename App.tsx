import ContainerComponent from "@/shared/components/container/container.component";
import "@styles/global.css";
import "@/shared/utils/css-interop";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";
import { themes } from "@/shared/utils/colors";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RefinedHomeFeedDesignScreen from "@/screens/home/screen/refined-home-feed-design.screen";

const queryClient = new QueryClient();

export default function App() {
  // const clearUserStore = useUserStore((state) => state.clearUserStore);
  // useEffect(() => {
  //   clearUserStore();
  // }, []);
  return (
    <GestureHandlerRootView className="flex-1">
      <QueryClientProvider client={queryClient}>
        <View className="flex-1" style={themes["light"]}>
          <SafeAreaProvider className="flex-1">
            <ContainerComponent>
              <RefinedHomeFeedDesignScreen />
            </ContainerComponent>
          </SafeAreaProvider>
        </View>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
