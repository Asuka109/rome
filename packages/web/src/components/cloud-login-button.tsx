import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { beginCloudLogin } from "@/lib/cloud-login";

// "Sign in with Rome Cloud" affordance shared by /login and /connect;
// rendered only when the backend reports `cloudAuthEnabled`. On success the
// browser navigates to Rome Cloud, so this only re-enables itself on a start
// failure. Callback failures come back as ?cloud=error&reason=… and are surfaced
// by the host page, not here.
export function CloudLoginButton({ onStartError }: { onStartError: (message: string) => void }) {
  const { t } = useTranslation("auth");
  const [starting, setStarting] = useState(false);

  async function start() {
    setStarting(true);
    onStartError("");
    const result = await beginCloudLogin();
    if (!result.ok) {
      onStartError(result.reason === "network" ? t("networkError") : t("cloud.errorStart"));
      setStarting(false);
    }
  }

  return (
    <Button
      type="button"
      size="md"
      variant="outline"
      className="w-full touch-target"
      disabled={starting}
      onClick={() => void start()}
    >
      {starting ? t("cloud.connecting") : t("cloud.signIn")}
    </Button>
  );
}

// The reasons the cloud-login callback can hand back. Anything outside
// the set falls through to the generic fallback message.
const CLOUD_ERROR_REASONS = new Set([
  "state",
  "expired",
  "denied",
  "iss",
  "unconfigured",
  "exchange",
  "malformed",
  "network",
  "account_mismatch",
  "not_owner",
  "revoked",
]);

export function cloudErrorReasonKey(reason: string | null): string {
  if (reason && CLOUD_ERROR_REASONS.has(reason)) {
    const camel = reason.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase());
    return `cloud.error${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
  }
  return "cloud.errorFallback";
}
