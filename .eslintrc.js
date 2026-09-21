// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: ["expo", "prettier"],
  plugins: ["prettier"],
  rules: {
    "no-console": ["error", { allow: ["error"] }],
    "prettier/prettier": "error",
    "@typescript-eslint/no-wrapper-object-types": "off"
  }
};
