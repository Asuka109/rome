export type BrowserKind = "chrome" | "chromium" | "brave" | "edge";

export interface BrowserExecutable {
  kind: BrowserKind;
  path: string;
  name: string;
}

export interface SshSettingsTarget {
  available: boolean;
  label: string | null;
  helpText: string | null;
  searchTerm: string | null;
}
