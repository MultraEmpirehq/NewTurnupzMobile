import { ActionSheetIOS, Linking, Platform } from "react-native";

const inGoogleMaps = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/**
 * Opens a place in whichever maps app the person wants. On Android the phone asks
 * when more than one can take it. iPhones have no such chooser, so we ask.
 */
export const openInMaps = (query: string) => {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: query, options: ["Apple Maps", "Google Maps", "Cancel"], cancelButtonIndex: 2 },
      (choice) => {
        if (choice === 0) void Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(query)}`);
        if (choice === 1) void Linking.openURL(inGoogleMaps(query));
      }
    );
    return;
  }
  Linking.openURL(`geo:0,0?q=${encodeURIComponent(query)}`).catch(() =>
    Linking.openURL(inGoogleMaps(query)).catch(() => undefined)
  );
};
