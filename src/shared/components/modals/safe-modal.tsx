import React from "react";
import { Modal, ModalProps } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

/**
 * A React Native Modal that knows where the notch and home bar are. A modal is
 * its own window on iOS, so the app's safe-area measurements don't reach it:
 * without this, headers slide under the clock and their back buttons can't be
 * pressed. Use it in place of Modal everywhere.
 */
const SafeModal = ({ children, ...props }: ModalProps) => (
  <Modal {...props}>
    <SafeAreaProvider style={{ flex: 1 }}>{children}</SafeAreaProvider>
  </Modal>
);

export default SafeModal;
