import React, { memo } from "react";
import { Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";
import { onInfo } from "../status/toast";
import TextComponent from "../text/text.component";

/**
 * "Continue with Apple", in Apple's black style. Not wired up yet: Apple
 * sign-in is switched off on the backend for now, so tapping it says so
 * instead of starting a flow that can't finish. Once it's on, this exchanges
 * Apple's identity token at POST /auth/social like the Google button.
 */
const AppleSignInButton: React.FC<{ disabled?: boolean }> = ({ disabled }) => (
  <Pressable
    onPress={() => onInfo("Sign in with Apple is coming soon.")}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel="Continue with Apple"
    className="h-12 flex-row items-center justify-center gap-3 rounded-full bg-black"
    style={({ pressed }) => ({ opacity: pressed || disabled ? 0.7 : 1 })}
  >
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        fill="#ffffff"
        d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z"
      />
    </Svg>
    <TextComponent className="text-base font-medium text-white">
      Continue with Apple
    </TextComponent>
  </Pressable>
);

export default memo(AppleSignInButton);
