// Extends app.json with settings that come from the environment (.env).
//
// Native Google sign-in needs the iOS OAuth client's reversed ID as a URL
// scheme, so its plugin is only added once GOOGLE_IOS_CLIENT_ID is set; until
// then the app builds without it and the Google button stays hidden.
//
// It also sets the Android build number from CI and the update channel.
const iosClientId = process.env.GOOGLE_IOS_CLIENT_ID;

module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? [])];
  if (iosClientId) {
    plugins.push([
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme: `com.googleusercontent.apps.${iosClientId.replace(
          ".apps.googleusercontent.com",
          ""
        )}`
      }
    ]);
  }
  // CI sets the Android build number so every Play upload is one higher.
  const versionCode = Number(process.env.ANDROID_VERSION_CODE) || config.android?.versionCode;
  return {
    ...config,
    plugins,
    android: { ...config.android, versionCode },
    // Builds made outside EAS ask the update server for this channel.
    updates: {
      ...config.updates,
      requestHeaders: { "expo-channel-name": process.env.UPDATES_CHANNEL || "production" },
    },
  };
};
