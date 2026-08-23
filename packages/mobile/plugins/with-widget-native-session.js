const fs = require("node:fs");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

function insertPlistValue(source, value) {
  const marker = "</dict>";
  const index = source.lastIndexOf(marker);
  if (index === -1) throw new Error("Generated plist had no root dictionary");
  return `${source.slice(0, index)}${value}${source.slice(index)}`;
}

module.exports = function withWidgetNativeSession(config, { keychainAccessGroup }) {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const iosRoot = modConfig.modRequest.platformProjectRoot;
      const targetRoot = path.join(iosRoot, "ExpoWidgetsTarget");
      const entitlementsPath = path.join(targetRoot, "ExpoWidgetsTarget.entitlements");
      const infoPath = path.join(targetRoot, "Info.plist");
      const sourcePath = path.join(targetRoot, "TokenUsageWidget.swift");
      const supportPath = path.join(
        modConfig.modRequest.projectRoot,
        "ios-support",
        "RomeNativeWidgetSession.swift",
      );

      const entitlements = insertPlistValue(
        fs.readFileSync(entitlementsPath, "utf8"),
        `\t<key>keychain-access-groups</key>\n\t<array>\n\t\t<string>${keychainAccessGroup}</string>\n\t</array>\n`,
      );
      fs.writeFileSync(entitlementsPath, entitlements);

      const info = insertPlistValue(
        fs.readFileSync(infoPath, "utf8"),
        `\t<key>RomeKeychainAccessGroup</key>\n\t<string>${keychainAccessGroup}</string>\n`,
      );
      fs.writeFileSync(infoPath, info);

      let source = fs.readFileSync(sourcePath, "utf8");
      source = source.replace("import AppIntents\n", "import AppIntents\nimport Security\n");
      source = source.replace(
        /(^  func snapshot\([^\n]+\n)/m,
        "$1    if !context.isPreview { _ = await RomeWidgetRefreshEngine.shared.refresh() }\n",
      );
      source = source.replace(
        /(^  func timeline\([^\n]+\n)/m,
        "$1    let nextRefreshAt = await RomeWidgetRefreshEngine.shared.refresh()\n",
      );
      source = source.replace(
        "let timeline = Timeline<TokenUsageWidgetTimelineEntry>(entries: entries, policy: .atEnd)",
        "let policy: TimelineReloadPolicy = nextRefreshAt.map { .after($0) } ?? .never\n    let timeline = Timeline<TokenUsageWidgetTimelineEntry>(entries: entries, policy: policy)",
      );
      if (
        !source.includes("RomeWidgetRefreshEngine.shared.refresh()") ||
        !source.includes("let policy: TimelineReloadPolicy")
      ) {
        throw new Error("Expo Widgets generated an unexpected TokenUsageWidget.swift");
      }
      source += `\n${fs.readFileSync(supportPath, "utf8")}\n`;
      fs.writeFileSync(sourcePath, source);
      return modConfig;
    },
  ]);
};
