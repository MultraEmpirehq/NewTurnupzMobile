import React, { useEffect, useState } from "react";
import { Keyboard, KeyboardAvoidingView, ViewProps } from "react-native";

/**
 * Moves a modal's content out of the keyboard's way. Use this inside a modal
 * instead of KeyboardAvoidingView: on edge-to-edge Android, that one keeps some
 * padding after the keyboard closes, leaving a gap at the bottom. This only
 * applies the padding while the keyboard is actually open.
 */
const ModalKeyboardAvoider = (props: ViewProps) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", () => setOpen(true));
    const hidden = Keyboard.addListener("keyboardDidHide", () => setOpen(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return <KeyboardAvoidingView behavior="padding" enabled={open} {...props} />;
};

export default ModalKeyboardAvoider;
