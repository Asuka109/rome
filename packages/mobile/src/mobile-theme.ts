/**
 * Native subset of Rome's default Ember light theme.
 *
 * Keep the semantic names aligned with packages/web/src/lib/themes.ts. Mobile
 * is intentionally not a consumer of @rome-os/ui, so it owns this small,
 * platform-native mapping instead of depending on the dashboard theme runtime.
 */
export const EMBER = {
  background: "#f4f3ef",
  foreground: "#1a130f",
  surface: "#fdfcf9",
  surfaceMuted: "#efe9e1",
  surfaceElevated: "#ffffff",
  surfaceHover: "#eae6df",
  mutedForeground: "#7a6857",
  subtleForeground: "#b0a294",
  border: "#ece6de",
  borderStrong: "#e0d8cd",
  primary: "#d86f4c",
  primaryForeground: "#ffffff",
  primaryPressed: "#c2410c",
  primaryTint: "rgba(216, 111, 76, 0.1)",
  destructiveForeground: "#a20711",
  destructivePressed: "#7c2621",
  destructiveBackground: "#ffece7",
  success: "#5b7a4a",
  overlaySurface: "rgba(253, 252, 249, 0.96)",
} as const;
