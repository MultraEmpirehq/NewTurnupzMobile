import { isTwoFactorChallenge } from "@/shared/utils/trusted-device";
import React, { memo, useCallback, useState } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from "@env";
import { postData } from "@/api";
import TextComponent from "../text/text.component";

/**
 * "Continue with Google", the same exchange the web uses: Google's native
 * sign-in gives an ID token (issued for the web client, the audience the
 * backend verifies), which POST /auth/social trades for a Turnupz session.
 *
 * iOS also needs its own OAuth client (GOOGLE_IOS_CLIENT_ID, which app.config.js
 * turns into the URL scheme), so until that's set the button stays hidden there.
 * Android only needs the web client here; its client is matched by package and
 * signing key on Google's side.
 */

const IS_AVAILABLE =
  !!GOOGLE_WEB_CLIENT_ID &&
  (Platform.OS === "android" ||
    (Platform.OS === "ios" && !!GOOGLE_IOS_CLIENT_ID));

type TSocialAuthResponse = { accessToken?: string; twoFactorRequired?: boolean; challenge?: string };

type TGoogleSignInButtonProps = {
  /** Called with the Turnupz access token once the exchange succeeds. */
  onToken: (accessToken: string) => Promise<void> | void;
  /** Two-factor is on: ask for the code with this challenge. */
  onChallenge?: (challenge: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
};

// Loaded on first tap: a build made before the native module was added would
// otherwise fail as soon as this file is imported.
const loadGoogleSignIn = () =>
  require("@react-native-google-signin/google-signin") as typeof import("@react-native-google-signin/google-signin");

let isConfigured = false;

const GoogleSignInButton: React.FC<TGoogleSignInButtonProps> = ({
  onToken,
  onChallenge,
  onError,
  disabled
}) => {
  const [isBusy, setIsBusy] = useState(false);

  const signIn = useCallback(async () => {
    setIsBusy(true);
    try {
      const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } =
        loadGoogleSignIn();
      try {
        if (!isConfigured) {
          GoogleSignin.configure({
            webClientId: GOOGLE_WEB_CLIENT_ID,
            ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {})
          });
          isConfigured = true;
        }
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true
        });
        const response = await GoogleSignin.signIn();
        if (!isSuccessResponse(response)) return; // closed the Google sheet
        const idToken = response.data.idToken;
        if (!idToken) {
          onError("Google didn't return a sign-in token. Please try again.");
          return;
        }
        const { data } = await postData<
          { provider: "GOOGLE"; idToken: string },
          TSocialAuthResponse
        >("/auth/social", { provider: "GOOGLE", idToken });
        if (isTwoFactorChallenge(data?.data)) {
          onChallenge?.(data.data.challenge);
          return;
        }
        const accessToken = data?.data?.accessToken;
        if (!accessToken) {
          onError("We couldn't sign you in with Google. Please try again.");
          return;
        }
        await onToken(accessToken.replace(/^Bearer\s+/i, ""));
      } catch (error) {
        if (isErrorWithCode(error)) {
          if (error.code === statusCodes.IN_PROGRESS) return;
          if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            onError("Google Play services is needed to sign in with Google.");
            return;
          }
        }
        onError("We couldn't sign you in with Google. Please try again.");
      }
    } catch {
      onError("Google sign-in isn't available in this build of the app.");
    } finally {
      setIsBusy(false);
    }
  }, [onError, onToken, onChallenge]);

  if (!IS_AVAILABLE) return null;

  return (
    <Pressable
      onPress={signIn}
      disabled={disabled || isBusy}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      className="h-12 flex-row items-center justify-center gap-3 rounded-full border border-black/15 bg-white"
      style={({ pressed }) => ({ opacity: pressed || disabled ? 0.6 : 1 })}
    >
      {isBusy ? (
        <ActivityIndicator color="#0b1d2a" />
      ) : (
        <>
          <View>
            <Svg width={18} height={18} viewBox="0 0 48 48">
              <Path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
              />
              <Path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
              />
              <Path
                fill="#4CAF50"
                d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
              />
              <Path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
              />
            </Svg>
          </View>
          <TextComponent className="text-base font-medium text-black">
            Continue with Google
          </TextComponent>
        </>
      )}
    </Pressable>
  );
};

export default memo(GoogleSignInButton);

/** Whether the Google button will show in this build; screens use it to hide the "OR" divider. */
export const isGoogleSignInAvailable = IS_AVAILABLE;
