import { execFile } from "child_process";
import { shell } from "electron";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { pbkdf2, createDecipheriv } from "crypto";
import type { BrowserExecutable, SshSettingsTarget } from "./types";

// ── Chrome executable locations on macOS ──

const MAC_BROWSERS: Array<{
  kind: BrowserExecutable["kind"];
  name: string;
  paths: string[];
}> = [
  {
    kind: "chrome",
    name: "Google Chrome",
    paths: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      `${homedir()}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
    ],
  },
  {
    kind: "chromium",
    name: "Chromium",
    paths: [
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      `${homedir()}/Applications/Chromium.app/Contents/MacOS/Chromium`,
    ],
  },
  {
    kind: "brave",
    name: "Brave Browser",
    paths: [
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      `${homedir()}/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`,
    ],
  },
  {
    kind: "edge",
    name: "Microsoft Edge",
    paths: [
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      `${homedir()}/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`,
    ],
  },
];

export function findBrowserExecutables(): BrowserExecutable[] {
  const found: BrowserExecutable[] = [];
  for (const browser of MAC_BROWSERS) {
    for (const p of browser.paths) {
      if (existsSync(p)) {
        found.push({ kind: browser.kind, path: p, name: browser.name });
        break; // Take first match per browser kind
      }
    }
  }
  return found;
}

// ── User data directories on macOS ──

const USER_DATA_DIRS: Record<BrowserExecutable["kind"], string> = {
  chrome: join(homedir(), "Library/Application Support/Google/Chrome"),
  chromium: join(homedir(), "Library/Application Support/Chromium"),
  brave: join(homedir(), "Library/Application Support/BraveSoftware/Brave-Browser"),
  edge: join(homedir(), "Library/Application Support/Microsoft Edge"),
};

export function getUserDataDir(kind: BrowserExecutable["kind"]): string {
  return USER_DATA_DIRS[kind];
}

// ── Keychain access ──

const KEYCHAIN_SERVICE: Record<BrowserExecutable["kind"], { service: string; account: string }> = {
  chrome: { service: "Chrome Safe Storage", account: "Chrome" },
  chromium: { service: "Chromium Safe Storage", account: "Chromium" },
  brave: { service: "Brave Safe Storage", account: "Brave" },
  edge: { service: "Microsoft Edge Safe Storage", account: "Microsoft Edge" },
};

export function getKeychainPassword(kind: BrowserExecutable["kind"]): Promise<string> {
  const { service, account } = KEYCHAIN_SERVICE[kind];
  return new Promise((resolve, reject) => {
    execFile(
      "security",
      ["find-generic-password", "-s", service, "-a", account, "-w"],
      { timeout: 10_000 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`Keychain access failed for ${service}: ${stderr || err.message}`));
          return;
        }
        resolve(stdout.trim());
      },
    );
  });
}

// ── Cookie decryption ──

const PBKDF2_SALT = "saltysalt";
const PBKDF2_ITERATIONS = 1003;
const PBKDF2_KEY_LENGTH = 16;
const AES_IV = Buffer.alloc(16, " "); // 16 space characters

/**
 * Derive AES key from Keychain password using PBKDF2-HMAC-SHA1.
 */
export function deriveKey(keychainPassword: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    pbkdf2(
      keychainPassword,
      PBKDF2_SALT,
      PBKDF2_ITERATIONS,
      PBKDF2_KEY_LENGTH,
      "sha1",
      (err, key) => {
        if (err) reject(err);
        else resolve(key);
      },
    );
  });
}

/**
 * Decrypt a single Chrome cookie value (macOS).
 *
 * @param encrypted - Raw encrypted_value from the Cookies DB
 * @param derivedKey - AES key derived from Keychain password
 * @param dbVersion - Cookie DB meta.version (≥24 means Chrome 130+ with SHA256 prefix)
 * @returns Decrypted cookie value, or null if decryption fails
 */
export function decryptCookieValue(
  encrypted: Buffer,
  derivedKey: Buffer,
  dbVersion: number,
): string | null {
  try {
    // Check for v10 prefix (macOS Chrome encryption marker)
    if (encrypted.length < 3) return null;
    const prefix = encrypted.subarray(0, 3).toString("ascii");
    if (prefix !== "v10") return null;

    const ciphertext = encrypted.subarray(3);
    const decipher = createDecipheriv("aes-128-cbc", derivedKey, AES_IV);
    decipher.setAutoPadding(true);

    let decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    // Chrome 130+ (DB version ≥ 24): first 32 bytes are a SHA256 domain hash — strip them
    if (dbVersion >= 24 && decrypted.length > 32) {
      decrypted = decrypted.subarray(32);
    }

    return decrypted.toString("utf-8");
  } catch {
    return null;
  }
}

const PRIMARY_SSH_SETTINGS_URL = "x-apple.systempreferences:com.apple.Sharing-Settings.extension";
const FALLBACK_SSH_SETTINGS_URL = "x-apple.systempreferences:com.apple.preferences.sharing";
const SYSTEM_SETTINGS_APP_PATH = "/System/Applications/System Settings.app";

export function getSshSettingsTarget(): SshSettingsTarget {
  return {
    available: true,
    label: "Open System Settings",
    helpText: "Enable Remote Login in System Settings so the host can accept SSH connections.",
    searchTerm: "Remote Login",
  };
}

export async function openSshSettings(): Promise<void> {
  try {
    await shell.openExternal(PRIMARY_SSH_SETTINGS_URL);
    return;
  } catch {
    // Fall through to older pane identifiers and the app-level fallback.
  }

  try {
    await shell.openExternal(FALLBACK_SSH_SETTINGS_URL);
    return;
  } catch {
    // Fall through to the app-level fallback.
  }

  const error = await shell.openPath(SYSTEM_SETTINGS_APP_PATH);
  if (error) {
    throw new Error(error);
  }
}
