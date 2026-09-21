import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import React, { memo, useCallback, useEffect, useState } from "react";
import ContainerComponent from "@/shared/components/container/container.component";
import AuthNavHeaderComponent from "@/shared/components/headers/auth-nav-header/auth-nav-header.component";
import NumberKeyboardComponent from "@/shared/components/form/keyboards/number-keyboard.component";
import OtpFormComponent from "@/shared/components/form/otp-form/otp-form.component";
import OtpCountdownComponent from "@/shared/components/otp-countdown/otp-countdown.component";
import TextComponent from "@/shared/components/text/text.component";
import {
  NavigationProp,
  useIsFocused,
  useNavigation,
  useRoute
} from "@react-navigation/native";
import { UnauthenticatedStackParamList } from "@/navigation/unauthenticated-navigator/unauthenticated-navigator";
import { RouteProp } from "@react-navigation/native";
import { postData } from "@/api";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { EVerificationType } from "@/shared/utils/types";

const VerificationScreen = () => {
  const navigation =
    useNavigation<NavigationProp<UnauthenticatedStackParamList>>();
  const { params } =
    useRoute<RouteProp<UnauthenticatedStackParamList, "verification">>();
  const { email, phoneNumber, type } = params || {};
  const [isLoading, setIsLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | undefined>(undefined);
  const [timer, setTimer] = useState(0);
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState<string | undefined>(undefined);
  const isFocused = useIsFocused();

  const sendOTP = useCallback(async () => {
    if (!type) {
      onError("Verification type is required");
      return;
    }
    if (!email && !phoneNumber) {
      onError("Email or phone number is required");
      return;
    }
    if (email) {
      if (!email.includes("@")) {
        onError("Invalid email");
        return;
      }
    }
    if (phoneNumber) {
      if (!phoneNumber.startsWith("+")) {
        onError("Invalid phone number");
        return;
      }
    }
    setIsLoading(true);
    setOtpError(undefined);
    setOtp("");
    try {
      const payload = {
        otpType: type,
        email
      };
      const { data } = await postData<
        typeof payload,
        { token: string; expiresAt: Date }
      >("/auth/otp/send", payload);
      const token = data?.data?.token;
      if (!token) {
        onError("Failed to send OTP");
        return;
      }
      setToken(data?.data?.token || undefined);
    } catch (error) {
      const errorMessage = constructErrorMessage(
        error as TApiErrorResponseType,
        "Failed to send OTP"
      );
      onError(errorMessage);
      setOtpError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [type, email, phoneNumber]);

  const verifyOTP = useCallback(async () => {
    if (!token) {
      onError("Token is required");
      return;
    }
    if (!otp) {
      onError("OTP is required");
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        token,
        otp,
        otpType: type
      };
      const { data } = await postData<
        typeof payload,
        { message: string; token: string; expiresAt: Date }
      >("/auth/otp/verify", payload);
      const newToken = data?.data?.token;
      onSuccess("OTP verified successfully");
      if (type === EVerificationType.ACCOUNT_CREATION) {
        navigation.navigate("create-password", {
          token: newToken,
          email: email || ""
        });
        return;
      }
      if (type === EVerificationType.FORGOT_PASSWORD) {
        navigation.navigate("reset-password", { token: newToken });
        return;
      }
      navigation.navigate("landing");
    } catch (error) {
      const errorMessage = constructErrorMessage(
        error as TApiErrorResponseType,
        "Failed to verify OTP"
      );
      setOtpError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
      setOtp("");
    }
  }, [token, otp, type, navigation]);

  useEffect(() => {
    if (isFocused && !token) {
      sendOTP();
    }
  }, [token, isFocused, type, email, phoneNumber]);

  useEffect(() => {
    if (otp.length === 6) {
      verifyOTP();
    }
  }, [otp]);
  return (
    <>
      <ContainerComponent isSafeAreaView>
        <AuthNavHeaderComponent className="px-horizontal py-4" />
        <ContainerComponent>
          <ContainerComponent className="items-center justify-center gap-7">
            <View className="gap-2 items-center">
              <TextComponent className="font-bold text-xl text-center">
                OTP Verification
              </TextComponent>
              <TextComponent className="opacity-60 text-center">
                Please provide the code sent to your{" "}
                {email && `email: ${email}`}
                {phoneNumber && `mobile number: ${phoneNumber}`}
              </TextComponent>
            </View>
            <OtpFormComponent value={otp} totalBoxes={6} error={otpError} />
            <OtpCountdownComponent
              expiryTime={timer}
              loading={isLoading}
              resendOTP={sendOTP}
            />
          </ContainerComponent>
          <NumberKeyboardComponent
            value={otp}
            onChange={setOtp}
            disabled={isLoading || !isFocused || !token}
          />
        </ContainerComponent>
      </ContainerComponent>
      {isLoading && (
        <View className="size-full absolute inset-0 bg-black/50 items-center justify-center">
          <ActivityIndicator size="large" color="#05B5FF" />
        </View>
      )}
    </>
  );
};

export default memo(VerificationScreen);

const styles = StyleSheet.create({});
