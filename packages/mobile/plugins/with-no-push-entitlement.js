const { withEntitlementsPlist } = require("expo/config-plugins");

/**
 * Removes the main app's APNs entitlement for builds that cannot use push.
 * Register before `expo-notifications` so this outer entitlement mod runs last.
 */
module.exports = function withNoPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults["aps-environment"];
    return config;
  });
};
