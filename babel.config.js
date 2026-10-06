module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          // zustand's ESM middleware reads import.meta.env, which a classic
          // (non-module) web bundle can't parse — the page would load blank.
          unstable_transformImportMeta: true
        }
      ],
      "nativewind/babel"
    ],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          envName: "APP_ENV",
          moduleName: "@env",
          path: ".env",
          blocklist: null,
          allowlist: null,
          blacklist: null, // DEPRECATED
          whitelist: null, // DEPRECATED
          safe: false,
          allowUndefined: false,
          verbose: false
        }
      ],
      "@babel/plugin-proposal-export-namespace-from",
      "react-native-worklets/plugin"
    ]
  };
};
