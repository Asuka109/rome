const developmentBundleIdentifier = process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER?.trim();
const appleTeamId = process.env.EXPO_PUBLIC_APPLE_TEAM_ID?.trim();
const pushEnabled = process.env.EXPO_PUBLIC_ROME_PUSH_ENABLED !== "false";

module.exports = ({ config }) => {
  const bundleIdentifier = developmentBundleIdentifier || config.ios.bundleIdentifier;
  const keychainAccessGroup = appleTeamId ? `${appleTeamId}.${bundleIdentifier}.credentials` : null;
  const widgetPlugin = [
    "expo-widgets",
    {
      bundleIdentifier: `${bundleIdentifier}.ExpoWidgetsTarget`,
      groupIdentifier: `group.${bundleIdentifier}`,
      enablePushNotifications: false,
      widgets: [
        {
          name: "TokenUsageWidget",
          displayName: "Rome AI Usage",
          description: "Track Codex and Claude usage at a glance.",
          ios: {
            supportedFamilies: ["systemSmall", "systemMedium"],
            contentMarginsDisabled: true,
            configuration: {
              title: "Providers",
              description: "Choose which providers appear in the small widget.",
              parameters: {
                showCodex: {
                  title: "Show Codex",
                  type: "boolean",
                  default: true,
                },
                showClaude: {
                  title: "Show Claude",
                  type: "boolean",
                  default: true,
                },
              },
            },
          },
        },
      ],
    },
  ];

  return {
    ...config,
    ios: {
      ...config.ios,
      bundleIdentifier,
      ...(appleTeamId ? { appleTeamId } : {}),
      entitlements: keychainAccessGroup
        ? {
            ...(config.ios?.entitlements ?? {}),
            "keychain-access-groups": [keychainAccessGroup],
          }
        : config.ios?.entitlements,
      // Mobile OAuth returns through the app's private URL scheme. Keeping this
      // unset avoids an Associated Domains entitlement, including for
      // Personal Team development builds.
      associatedDomains: undefined,
    },
    plugins: [
      ...(!pushEnabled ? ["./plugins/with-no-push-entitlement"] : []),
      ...(config.plugins ?? []),
      ...(keychainAccessGroup
        ? [["./plugins/with-widget-native-session", { keychainAccessGroup }]]
        : []),
      widgetPlugin,
    ],
  };
};
