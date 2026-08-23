import { ipcMain } from "electron";
import { z } from "zod";
import { getDb } from "./db/database";
import { settings } from "./db/schema";
import { eq } from "drizzle-orm";
import type { RuntimeManager } from "./runtime/manager";

interface IpcHandlerOptions {
  openSettingsWindow: () => void;
}

const settingsGetSchema = z.tuple([z.string().min(1)]);
const settingsSetSchema = z.tuple([z.string().min(1), z.string()]);

export function registerIpcHandlers(
  runtimeManager: RuntimeManager,
  options: IpcHandlerOptions,
): void {
  const db = getDb();

  // ── Settings ──

  ipcMain.handle("settings:get", (_event, ...args: unknown[]) => {
    const [key] = settingsGetSchema.parse(args);
    const row = db.select().from(settings).where(eq(settings.key, key)).get();
    return row?.value ?? null;
  });

  ipcMain.handle("settings:set", (_event, ...args: unknown[]) => {
    const [key, value] = settingsSetSchema.parse(args);
    const now = new Date().toISOString();

    db.insert(settings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: now },
      })
      .run();
  });

  ipcMain.handle("settings:openWindow", () => {
    options.openSettingsWindow();
  });

  // ── Local Runtime ──

  ipcMain.handle("runtime:getStatus", () => {
    return runtimeManager.getStatus();
  });

  ipcMain.handle("runtime:ensureReady", async () => {
    await runtimeManager.ensureReady();
    return runtimeManager.getStatus();
  });

  ipcMain.handle("runtime:upgrade", async () => {
    await runtimeManager.upgradeRuntime();
    return runtimeManager.getStatus();
  });

  ipcMain.handle("runtime:openInstallPage", async () => {
    await runtimeManager.openInstallPage();
  });

  ipcMain.handle("runtime:startRuntimeApp", async () => {
    await runtimeManager.startRuntimeApp();
  });

  ipcMain.handle("runtime:openRuntimeFolder", async () => {
    await runtimeManager.openRuntimeFolder();
  });

  ipcMain.handle("runtime:openLogs", async () => {
    await runtimeManager.openLogs();
  });
}
