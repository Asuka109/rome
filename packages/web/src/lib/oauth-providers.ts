export const OAUTH_PROVIDERS = ["google", "github"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export interface OAuthProviderDescriptor {
  id: OAuthProvider;
  label: string;
  description: string;
}

export const OAUTH_PROVIDER_DESCRIPTORS: Record<OAuthProvider, OAuthProviderDescriptor> = {
  google: {
    id: "google",
    label: "Google",
    description: "Workspace APIs, Drive, Gmail, Calendar, and Google identity.",
  },
  github: {
    id: "github",
    label: "GitHub",
    description: "Repositories, pull requests, issues, and GitHub identity.",
  },
};

export function isOAuthProvider(value: string): value is OAuthProvider {
  return OAUTH_PROVIDERS.includes(value as OAuthProvider);
}
