import { StyleSheet, Text, View } from "react-native";
import React, { memo } from "react";
import { NavigationContainer } from "@react-navigation/native";
import useUserStore from "@/shared/stores/user.store";
import AuthenticatedNavigator from "../authenticated-navigator/authenticated-navigator";
import UnauthenticatedNavigator from "../unauthenticated-navigator/unauthenticated-navigator";

const NavigationWrapper = () => {
  const userDetails = useUserStore((state) => state?.user);
  return (
    <NavigationContainer>
      {userDetails && <AuthenticatedNavigator />}
      {!userDetails && <UnauthenticatedNavigator />}
    </NavigationContainer>
  );
};

export default memo(NavigationWrapper);
