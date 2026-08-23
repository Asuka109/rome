/**
 * Device registration client. Sends the push token to
 * Rome Cloud's session-authed `POST /api/devices`; authentication rides the
 * shared cookie jar (the on-device B1 gate). Carries the CSRF client header
 * (§7). Never throws — a failed registration degrades to "no push on this
 * device"; the caller decides retry policy (a single bounded retry on 401,
 * since the WebView→shared-jar cookie sync is asynchronous).
 *
 * Two provider shapes: iOS/APNs carries the `apns_environment` (selects the
 * APNs host); Android/FCM carries no environment and no APNs field.
 */
export type RegisterDeviceInput =
  | {
      provider: "apns";
      platform: "ios";
      romeCloudOrigin: string;
      token: string;
      apnsEnvironment: "sandbox" | "production";
    }
  | { provider: "fcm"; platform: "android"; romeCloudOrigin: string; token: string };

export async function registerDevice(
  fetchImpl: typeof fetch,
  input: RegisterDeviceInput,
): Promise<{ ok: boolean; status: number }> {
  const body =
    input.provider === "apns"
      ? {
          provider: "apns" as const,
          token: input.token,
          platform: "ios" as const,
          apns_environment: input.apnsEnvironment,
        }
      : { provider: "fcm" as const, token: input.token, platform: "android" as const };
  try {
    const response = await fetchImpl(`${input.romeCloudOrigin}/api/devices`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-rome-device-client": "1" },
      body: JSON.stringify(body),
    });
    // A non-2xx (notably 401 before the cookie-jar sync lands) is an expected,
    // caller-retried outcome — reported via the return value, not logged, to
    // avoid polluting production breadcrumbs on a benign path. Only a genuine
    // network failure (below) is unexpected enough to warn.
    return { ok: response.ok, status: response.status };
  } catch (error) {
    console.warn("[rome-mobile] device registration failed", error);
    return { ok: false, status: 0 };
  }
}
