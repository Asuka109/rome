import { beforeEach, describe, expect, it, vi } from "vitest";

const mkdirMock = vi.fn(async () => undefined);
const readFileMock = vi.fn(async (_path: string, _encoding: string) => "");
const writeFileMock = vi.fn(async () => undefined);
const chmodMock = vi.fn(async () => undefined);
const rmMock = vi.fn(async () => undefined);
const symlinkMock = vi.fn(async () => undefined);
const lstatMock = vi.fn(
  async (_path: string): Promise<{ isSymbolicLink: () => boolean; isFile: () => boolean }> => ({
    isSymbolicLink: () => false,
    isFile: () => false,
  }),
);
const statMock = vi.fn(
  async (_path: string): Promise<{ uid: number; gid: number }> => ({ uid: 1000, gid: 1000 }),
);
const unlinkMock = vi.fn(async () => undefined);
const lchownMock = vi.fn(async () => undefined);
const readlinkMock = vi.fn(async (_path: string) => "");
const existsSyncMock = vi.fn((path: string) => path === "/home/rome/.rome/host-filesystem.json");

vi.mock("node:fs/promises", () => ({
  mkdir: mkdirMock,
  readFile: readFileMock,
  writeFile: writeFileMock,
  chmod: chmodMock,
  rm: rmMock,
  symlink: symlinkMock,
  lstat: lstatMock,
  stat: statMock,
  unlink: unlinkMock,
  lchown: lchownMock,
  readlink: readlinkMock,
}));

vi.mock("node:fs", () => ({
  existsSync: existsSyncMock,
}));

vi.mock("node:os", () => ({
  homedir: () => "/home/rome",
}));

describe("HostFilesystemManager", () => {
  const persistedConfig = {
    enabled: true,
    connection: {
      host: "100.64.0.1",
      port: 22,
      username: "yunfan",
      privateKey: "private-key",
    },
    mounts: [
      {
        name: "mount",
        remotePath: "/Users/yunfanye/.rome-desktop/mount",
        containerPath: "/home/user/mount",
      },
    ],
    remoteAccess: null,
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    existsSyncMock.mockImplementation(
      (path: string) => path === "/home/rome/.rome/host-filesystem.json",
    );
    readFileMock.mockImplementation(async (path: string) => {
      if (path === "/home/rome/.rome/host-filesystem.json") {
        return JSON.stringify({
          ...persistedConfig,
          updatedAt: "2026-03-27T00:00:00.000Z",
        });
      }

      throw new Error(`Unexpected readFile(${path})`);
    });
    lstatMock.mockImplementation(async (path: string) => {
      if (path === "/home/user/mount") {
        return {
          isSymbolicLink: () => true,
          isFile: () => false,
        };
      }

      throw Object.assign(new Error(`ENOENT: ${path}`), { code: "ENOENT" });
    });
    readlinkMock.mockResolvedValue("/var/lib/rome-hostfs/targets/home/user/mount");
  });

  it("keeps an existing alias symlink when restore sees the expected mount target", async () => {
    const { HostFilesystemManager } = await import("./host-filesystem.js");
    vi.spyOn(HostFilesystemManager.prototype as never, "runCommand").mockResolvedValue(undefined);
    vi.spyOn(HostFilesystemManager.prototype as never, "isMounted").mockResolvedValue(false);

    const manager = new HostFilesystemManager();
    await manager.restore();

    expect(unlinkMock).not.toHaveBeenCalledWith("/home/user/mount");
    expect(symlinkMock).not.toHaveBeenCalledWith(
      "/var/lib/rome-hostfs/targets/home/user/mount",
      "/home/user/mount",
    );
    expect(readlinkMock).toHaveBeenCalledWith("/home/user/mount");
    expect(lchownMock).toHaveBeenCalledWith(
      "/home/user/mount",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("preserves retained alias symlinks when reapplying the same config", async () => {
    const { HostFilesystemManager } = await import("./host-filesystem.js");
    vi.spyOn(HostFilesystemManager.prototype as never, "runCommand").mockResolvedValue(undefined);
    vi.spyOn(HostFilesystemManager.prototype as never, "isMounted").mockResolvedValue(false);

    const manager = new HostFilesystemManager();
    await manager.restore();
    await manager.configure(persistedConfig);

    expect(unlinkMock).not.toHaveBeenCalledWith("/home/user/mount");
    expect(readlinkMock).toHaveBeenCalledWith("/home/user/mount");
  });
});
