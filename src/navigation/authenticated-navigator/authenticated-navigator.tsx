import { StyleSheet, Text, View } from "react-native";
import React, { memo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
// The home feed screen carries its own bottom bar and tabs, so it's the whole
// signed-in app; the old tab navigator would draw a second bar under it.
import RefinedHomeFeedDesignScreen from "@/screens/home/screen/refined-home-feed-design.screen";
import SearchScreen from "@screens/search/screen/search.screen";

export type AuthenticatedStackParamList = {
  tab: undefined;
  search: undefined;
};

const Stack = createNativeStackNavigator<AuthenticatedStackParamList>();

const AuthenticatedNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        freezeOnBlur: true,
        contentStyle: {
          backgroundColor: "#ffffff"
        }
      }}
      initialRouteName="tab"
    >
      <Stack.Screen name="tab" component={RefinedHomeFeedDesignScreen} />
      <Stack.Screen
        name="search"
        options={{ animation: "fade_from_bottom" }}
        component={SearchScreen}
      />
    </Stack.Navigator>
  );
};

export default memo(AuthenticatedNavigator);

const styles = StyleSheet.create({});
