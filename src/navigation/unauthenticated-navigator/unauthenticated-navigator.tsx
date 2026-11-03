import { StyleSheet, Text, View } from "react-native";
import React, { memo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LandingScreen from "@/screens/landing/screen/landing.screen";
import CreatePasswordScreen from "@/screens/create-password/screen/create-password.screen";
import { EVerificationType } from "@/shared/utils/types";
import VerificationScreen from "@/screens/verification/screen/verification.screen";
import ForgotPasswordScreen from "@/screens/forgot-password/screen/forgot-password.screen";
import OnboardingScreen from "@/screens/onboarding/screen/onboarding.screen";
import ResetPasswordScreen from "@/screens/reset-password/screen/reset-password.screen";

export type UnauthenticatedStackParamList = {
  landing: undefined;
  "create-password": { token: string; email: string };
  verification: {
    type: EVerificationType;
    email?: string;
    phoneNumber?: string;
  };
  "reset-password": { token: string };
  "forgot-password": undefined;
  onboarding: undefined;
};
const Stack = createNativeStackNavigator<UnauthenticatedStackParamList>();

const UnauthenticatedNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationTypeForReplace: "pop",
        animationMatchesGesture: true,
        freezeOnBlur: true,
        contentStyle: {
          backgroundColor: "#ffffff"
        }
      }}
      initialRouteName="landing"
    >
      <Stack.Screen name="landing" component={LandingScreen} />
      <Stack.Screen name="create-password" component={CreatePasswordScreen} />
      <Stack.Screen name="verification" component={VerificationScreen} />
      <Stack.Screen name="forgot-password" component={ForgotPasswordScreen} />
      <Stack.Screen name="reset-password" component={ResetPasswordScreen} />
      <Stack.Screen name="onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
};

export default memo(UnauthenticatedNavigator);

const styles = StyleSheet.create({});
