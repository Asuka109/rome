import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const DEFAULT_LOCK_LEASE_MS = 30_000;
const DEFAULT_LOCK_POLL_MS = 200;
const LOCK_LEASE_FILENAME = "lease.json";

interface ClipboardLockLease {
  ownerId: string;
  createdAt: number;
  expiresAt: number;
  pid: number;
}

export interface ChatGPTClipboardLockOptions {
  lockDir?: string;
  leaseMs?: number;
  pollMs?: number;
  now?: () => number;
}

export interface ChatGPTClipboardLockHandle {
  lockDir: string;
  ownerId: string;
  release(): Promise<void>;
}

export async function acquireChatGPTClipboardLock(
  options: ChatGPTClipboardLockOptions = {},
): Promise<ChatGPTClipboardLockHandle> {
  const leaseMs = options.leaseMs ?? DEFAULT_LOCK_LEASE_MS;
  const pollMs = options.pollMs ?? DEFAULT_LOCK_POLL_MS;
  const now = options.now ?? Date.now;
  const lockDir = options.lockDir ?? getDefaultChatGPTClipboardLockDir();
  const leasePath = join(lockDir, LOCK_LEASE_FILENAME);
  const ownerId = `${process.pid}:${randomUUID()}`;

  await mkdir(dirname(lockDir), { recursive: true });

  for (;;) {
    const lease: ClipboardLockLease = {
      ownerId,
      createdAt: now(),
      expiresAt: now() + leaseMs,
      pid: process.pid,
    };

    try {
      await mkdir(lockDir);
      try {
        await writeFile(leasePath, JSON.stringify(lease), "utf8");
      } catch (error) {
        await rm(lockDir, { recursive: true, force: true });
        throw error;
      }

      let released = false;
      const autoReleaseTimer = setTimeout(() => {
        void removeLockDirIfOwned(lockDir, ownerId);
      }, leaseMs);
      autoReleaseTimer.unref?.();

      return {
        lockDir,
        ownerId,
        release: async () => {
          if (released) {
            return;
          }
          released = true;
          clearTimeout(autoReleaseTimer);
          await removeLockDirIfOwned(lockDir, ownerId);
        },
      };
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        throw error;
      }
    }

    if (await clearExpiredLockDir(lockDir, leasePath, leaseMs, now)) {
      continue;
    }

    await sleep(pollMs);
  }
}

async function clearExpiredLockDir(
  lockDir: string,
  leasePath: string,
  leaseMs: number,
  now: () => number,
): Promise<boolean> {
  const lease = await readLeaseFile(leasePath);
  if (lease) {
    if (lease.expiresAt > now()) {
      return false;
    }

    await rm(lockDir, { recursive: true, force: true });
    return true;
  }

  try {
    const lockStats = await stat(lockDir);
    if (now() - lockStats.mtimeMs < Math.min(leaseMs, 1_000)) {
      return false;
    }
  } catch (error) {
    if (isMissingError(error)) {
      return true;
    }
    throw error;
  }

  await rm(lockDir, { recursive: true, force: true });
  return true;
}

async function readLeaseFile(leasePath: string): Promise<ClipboardLockLease | null> {
  try {
    const raw = await readFile(leasePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<ClipboardLockLease>;
    if (
      typeof parsed.ownerId !== "string" ||
      typeof parsed.createdAt !== "number" ||
      typeof parsed.expiresAt !== "number" ||
      typeof parsed.pid !== "number"
    ) {
      return null;
    }
    return {
      ownerId: parsed.ownerId,
      createdAt: parsed.createdAt,
      expiresAt: parsed.expiresAt,
      pid: parsed.pid,
    };
  } catch (error) {
    if (isMissingError(error)) {
      return null;
    }
    return null;
  }
}

async function removeLockDirIfOwned(lockDir: string, ownerId: string): Promise<void> {
  const lease = await readLeaseFile(join(lockDir, LOCK_LEASE_FILENAME));
  if (!lease || lease.ownerId !== ownerId) {
    return;
  }

  await rm(lockDir, { recursive: true, force: true });
}

function getDefaultChatGPTClipboardLockDir(): string {
  const profile = process.env.ROME_PROFILE?.trim() || "default";
  return join(homedir(), ".rome", profile, "locks", "chatgpt-chat-copy.lock");
}

function isAlreadyExistsError(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "EEXIST";
}

function isMissingError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
