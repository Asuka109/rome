import * as mac from "./mac";
import * as win from "./win";
import type { BrowserExecutable } from "./types";

export type { BrowserExecutable, BrowserKind, SshSettingsTarget } from "./types";

function getPlatformModule() {
  if (process.platform === "darwin") {
    return mac;
  }

  if (process.platform === "win32") {
    return win;
  }

  throw new Error(`Desktop platform ${process.platform} is not supported`);
}

export const platform = {
  supportsCookieImport() {
    return process.platform === "darwin";
  },

  findBrowserExecutables() {
    return getPlatformModule().findBrowserExecutables();
  },

  getUserDataDir(kind: BrowserExecutable["kind"]) {
    return getPlatformModule().getUserDataDir(kind);
  },

  getKeychainPassword(kind: BrowserExecutable["kind"]) {
    return getPlatformModule().getKeychainPassword(kind);
  },

  deriveKey(keychainPassword: string) {
    return getPlatformModule().deriveKey(keychainPassword);
  },

  decryptCookieValue(encrypted: Buffer, derivedKey: Buffer, dbVersion: number) {
    return getPlatformModule().decryptCookieValue(encrypted, derivedKey, dbVersion);
  },

  getSshSettingsTarget() {
    return getPlatformModule().getSshSettingsTarget();
  },

  openSshSettings() {
    return getPlatformModule().openSshSettings();
  },
};
