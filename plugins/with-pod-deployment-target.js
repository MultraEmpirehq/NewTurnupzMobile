const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Xcode 27 refuses to build any target set below iOS 15, and a few pods'
 * resource bundles (react-native-svg, SDWebImage) still declare 9.0 / 12.4.
 * This raises every pod target to at least `minimum` in the Podfile's
 * post_install, so `expo prebuild` / `expo run:ios` keep building.
 */
const MARKER = "# with-pod-deployment-target";

const withPodDeploymentTarget = (config, { minimum = "15.1" } = {}) =>
  withDangerousMod(config, [
    "ios",
    (modConfig) => {
      const podfile = path.join(
        modConfig.modRequest.platformProjectRoot,
        "Podfile"
      );
      let contents = fs.readFileSync(podfile, "utf8");
      if (contents.includes(MARKER)) return modConfig;

      const hook = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        if build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${minimum}
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${minimum}'
        end
      end
    end`;

      contents = contents.replace(
        /(react_native_post_install\([\s\S]*?\n\s*\))/,
        `$1${hook}`
      );
      fs.writeFileSync(podfile, contents);
      return modConfig;
    }
  ]);

module.exports = withPodDeploymentTarget;
