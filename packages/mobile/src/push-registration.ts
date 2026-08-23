import { registerDevice } from "./device-registration";

// Must match the stable channel ID Rome Cloud sets in the FCM payload.
// A payload whose channel_id matches this HIGH channel renders as a heads-up;
// Rome Cloud and the app each define it with the same value (not a shared dep).
export const NOTIFICATION_CHANNEL_ID = "rome-default";

// The subset of expo-notifications this routine uses. An interface (not the
// module type) so a test can inject a fake without the native module; the real
// `expo-notifications` namespace satisfies it structurally.
export interface NotificationsApi {
  setNotificationChannelAsync(
    channelId: string,
    channel: { name: string; importance: number },
  ): Promise<unknown>;
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  getDevicePushTokenAsync(): Promise<{ data: string }>;
  AndroidImportance: { HIGH: number };
}

export interface PushRegistrationArgs {
  platform: "ios" | "android";
  notifications: NotificationsApi;
  register: typeof registerDevice;
  fetchImpl: typeof fetch;
  romeCloudOrigin: string;
  // Called ONLY on the iOS branch, so an Android build never touches — and never
  // crashes on — the APNs-environment validation.
  getApnsEnvironment: () => "sandbox" | "production";
  // Injectable for tests; defaults to a real timer.
  delay?: (ms: number) => Promise<void>;
}

// The result of one registration attempt. The distinction matters to the
// caller's retry policy: "permission-denied" is terminal for the
// session — re-requesting on Android 13+ re-opens the system dialog, so the
// user's choice must be respected and not re-prompted on the next navigation.
// "not-registered" (no token / backend failure) stays retryable.
export type PushRegistrationOutcome = "registered" | "permission-denied" | "not-registered";

// Run the platform's push-registration sequence once. Extracted from App.tsx for
// testability; App.tsx owns the React in-flight/done/denied guards around it. On
// Android the order matters: the high-priority channel must exist before the
// permission prompt, or the prompt may not appear. iOS → APNs, Android → FCM.
export async function runPushRegistration(
  args: PushRegistrationArgs,
): Promise<PushRegistrationOutcome> {
  const { platform, notifications, register, fetchImpl, romeCloudOrigin, getApnsEnvironment } =
    args;
  const delay = args.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  if (platform === "android") {
    await notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: "Rome",
      importance: notifications.AndroidImportance.HIGH,
    });
  }

  const permission = await notifications.requestPermissionsAsync();
  if (!permission.granted) return "permission-denied";

  const token = (await notifications.getDevicePushTokenAsync()).data;
  if (!token) return "not-registered";

  const attempt = () =>
    platform === "android"
      ? register(fetchImpl, { provider: "fcm", platform: "android", romeCloudOrigin, token })
      : register(fetchImpl, {
          provider: "apns",
          platform: "ios",
          romeCloudOrigin,
          token,
          apnsEnvironment: getApnsEnvironment(),
        });

  const first = await attempt();
  if (first.ok) return "registered";
  // A 401 is the expected cookie-jar race; one bounded retry, awaited so it
  // stays within the caller's single in-flight attempt.
  if (first.status === 401) {
    await delay(3000);
    const second = await attempt();
    return second.ok ? "registered" : "not-registered";
  }
  return "not-registered";
}
