// Extends app.json with settings that come from the environment (.env).
//
// Native Google sign-in needs the iOS OAuth client's reversed ID as a URL
// scheme, so its plugin is only added once GOOGLE_IOS_CLIENT_ID is set; until
// then the app builds without it and the Google button stays hidden.
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
  return { ...config, plugins };
};
