// Signs Android release builds with the Turnupz release key.
//
// The key and its passwords never live in the repo: they're read from Gradle
// properties (TURNUPZ_UPLOAD_*), usually set in ~/.gradle/gradle.properties.
// Without them a release build falls back to the debug key, so anyone can
// still build; it just won't match the key Google sign-in is registered with.
const { withAppBuildGradle } = require("@expo/config-plugins");

const RELEASE_CONFIG = `
        release {
            if (project.hasProperty('TURNUPZ_UPLOAD_STORE_FILE')) {
                storeFile file(TURNUPZ_UPLOAD_STORE_FILE)
                storePassword TURNUPZ_UPLOAD_STORE_PASSWORD
                keyAlias TURNUPZ_UPLOAD_KEY_ALIAS
                keyPassword TURNUPZ_UPLOAD_KEY_PASSWORD
            }
        }`;

module.exports = (config) =>
  withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;
    if (gradle.includes("TURNUPZ_UPLOAD_STORE_FILE")) return mod;

    // Add a release signing config next to the debug one.
    gradle = gradle.replace(
      /(signingConfigs\s*\{\s*debug\s*\{[^}]*\})/,
      `$1${RELEASE_CONFIG}`
    );
    // Release builds use it when the key is there, else the debug key.
    gradle = gradle.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig project.hasProperty('TURNUPZ_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug"
    );
    mod.modResults.contents = gradle;
    return mod;
  });
