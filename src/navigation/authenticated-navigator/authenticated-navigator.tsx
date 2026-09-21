import { StyleSheet, Text, View } from "react-native";
import React, { memo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabNavigator from "../tab-navigator/tab-navigator";
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
      <Stack.Screen name="tab" component={TabNavigator} />
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
