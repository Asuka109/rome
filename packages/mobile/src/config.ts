import { Platform } from "react-native";

function requiredHttpsOrigin(name: string, value: string | undefined): string {
  if (!value) throw new Error(`[rome-mobile] ${name} is not set`);
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(`[rome-mobile] ${name} must be an exact HTTPS origin`);
  }
  return url.origin;
}

export const ROME_CLOUD_ORIGIN = requiredHttpsOrigin(
  "EXPO_PUBLIC_PANTHEON_ORIGIN",
  process.env.EXPO_PUBLIC_PANTHEON_ORIGIN,
);

const platform = Platform.OS;
if (platform !== "ios" && platform !== "android") {
  throw new Error("[rome-mobile] Native Cloud login requires iOS or Android");
}

export const MOBILE_OAUTH_CLIENT_ID =
  process.env.EXPO_PUBLIC_ROME_MOBILE_CLIENT_ID?.trim() || `rome-mobile-${platform}`;

export const MOBILE_OAUTH_REDIRECT_URI = "cc.romeos.mobile:/oauth/callback";

const appleTeamId = process.env.EXPO_PUBLIC_APPLE_TEAM_ID?.trim();
const iosBundleIdentifier =
  process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER?.trim() || "cc.romeos.mobile";
export const IOS_KEYCHAIN_ACCESS_GROUP =
  Platform.OS === "ios" && appleTeamId
    ? `${appleTeamId}.${iosBundleIdentifier}.credentials`
    : undefined;

if (Platform.OS === "ios" && !IOS_KEYCHAIN_ACCESS_GROUP) {
  throw new Error("[rome-mobile] EXPO_PUBLIC_APPLE_TEAM_ID is required for shared Keychain access");
}

export const PUSH_ENABLED = process.env.EXPO_PUBLIC_ROME_PUSH_ENABLED !== "false";

export function getApnsEnvironment(): "sandbox" | "production" {
  const value = process.env.EXPO_PUBLIC_APNS_ENVIRONMENT;
  if (value !== "sandbox" && value !== "production") {
    throw new Error("[rome-mobile] EXPO_PUBLIC_APNS_ENVIRONMENT must be sandbox or production");
  }
  return value;
}

if (Platform.OS === "ios" && PUSH_ENABLED) getApnsEnvironment();
