import { shell } from "electron";
import { existsSync } from "fs";
import { join } from "path";
import type { BrowserExecutable, SshSettingsTarget } from "./types";

const PROGRAM_FILES = process.env.ProgramFiles ?? "C:\\Program Files";
const PROGRAM_FILES_X86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
const LOCAL_APP_DATA = process.env.LOCALAPPDATA ?? "";

const WINDOWS_BROWSERS: Array<{
  kind: BrowserExecutable["kind"];
  name: string;
  paths: string[];
}> = [
  {
    kind: "chrome",
    name: "Google Chrome",
    paths: [
      join(PROGRAM_FILES, "Google", "Chrome", "Application", "chrome.exe"),
      join(PROGRAM_FILES_X86, "Google", "Chrome", "Application", "chrome.exe"),
      join(LOCAL_APP_DATA, "Google", "Chrome", "Application", "chrome.exe"),
    ],
  },
  {
    kind: "chromium",
    name: "Chromium",
    paths: [
      join(PROGRAM_FILES, "Chromium", "Application", "chrome.exe"),
      join(PROGRAM_FILES_X86, "Chromium", "Application", "chrome.exe"),
      join(LOCAL_APP_DATA, "Chromium", "Application", "chrome.exe"),
    ],
  },
  {
    kind: "brave",
    name: "Brave Browser",
    paths: [
      join(PROGRAM_FILES, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
      join(PROGRAM_FILES_X86, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
      join(LOCAL_APP_DATA, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
    ],
  },
  {
    kind: "edge",
    name: "Microsoft Edge",
    paths: [
      join(PROGRAM_FILES, "Microsoft", "Edge", "Application", "msedge.exe"),
      join(PROGRAM_FILES_X86, "Microsoft", "Edge", "Application", "msedge.exe"),
      join(LOCAL_APP_DATA, "Microsoft", "Edge", "Application", "msedge.exe"),
    ],
  },
];

const USER_DATA_DIRS: Record<BrowserExecutable["kind"], string> = {
  chrome: join(LOCAL_APP_DATA, "Google", "Chrome", "User Data"),
  chromium: join(LOCAL_APP_DATA, "Chromium", "User Data"),
  brave: join(LOCAL_APP_DATA, "BraveSoftware", "Brave-Browser", "User Data"),
  edge: join(LOCAL_APP_DATA, "Microsoft", "Edge", "User Data"),
};

export function findBrowserExecutables(): BrowserExecutable[] {
  const found: BrowserExecutable[] = [];
  for (const browser of WINDOWS_BROWSERS) {
    for (const p of browser.paths) {
      if (p && existsSync(p)) {
        found.push({ kind: browser.kind, path: p, name: browser.name });
        break;
      }
    }
  }
  return found;
}

export function getUserDataDir(kind: BrowserExecutable["kind"]): string {
  return USER_DATA_DIRS[kind];
}

export async function getKeychainPassword(_kind: BrowserExecutable["kind"]): Promise<string> {
  throw new Error("Cookie import is not supported on Windows yet");
}

export async function deriveKey(_keychainPassword: string): Promise<Buffer> {
  throw new Error("Cookie import is not supported on Windows yet");
}

export function decryptCookieValue(
  _encrypted: Buffer,
  _derivedKey: Buffer,
  _dbVersion: number,
): string | null {
  throw new Error("Cookie import is not supported on Windows yet");
}

const WINDOWS_SSH_SETTINGS_URL = "ms-settings:optionalfeatures";

export function getSshSettingsTarget(): SshSettingsTarget {
  return {
    available: true,
    label: "Open Windows Settings",
    helpText:
      "Install OpenSSH Server in Optional Features, then ensure the sshd service is running.",
    searchTerm: "OpenSSH Server",
  };
}

export async function openSshSettings(): Promise<void> {
  await shell.openExternal(WINDOWS_SSH_SETTINGS_URL);
}
