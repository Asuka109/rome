import type { OAuthProvider } from "@/lib/oauth-providers";

export interface OAuthProviderConnectionSummary {
  provider: OAuthProvider;
  label: string;
  description: string;
  /** Grant state is not `unauthorized` — a degraded grant is still connected. */
  connected: boolean;
  /** Grant state is `degraded` — connected but the credential is broken; the
   *  dashboard surfaces it as needs-reconnect. */
  degraded: boolean;
  connectUrl: string | null;
  available: boolean;
  unavailableReason: string | null;
  displayName: string | null;
  email: string | null;
  login: string | null;
  avatarUrl: string | null;
  scopes: string[];
  tokenExpiresAt: string | null;
}

export interface ComposioCliStatus {
  installed: boolean;
  loggedIn: boolean;
  loginPending: boolean;
  webUrl: string | null;
  orgId: string | null;
  testUserId: string | null;
  error: string | null;
}
