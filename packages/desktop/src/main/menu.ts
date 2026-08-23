import { app, Menu, BrowserWindow } from "electron";
import { requestStopAndQuit } from "./lifecycle";

export function setupApplicationMenu(
  showDashboard: () => void,
  openSettings: () => BrowserWindow,
  checkForUpdates: () => void | Promise<unknown>,
): void {
  const isMac = process.platform === "darwin";

  // Tray-resident model: red dot / ⌘W only hide windows. Cmd+Q and the
  // explicit "Stop agent and quit" surfaces go through the real shutdown
  // path. Closing the focused window invokes its `close` handler, which
  // window.ts intercepts to hide unless lifecycle.isQuitting() is true.
  const hideFocusedWindow = (): void => {
    const focused = BrowserWindow.getFocusedWindow();
    if (focused && !focused.isDestroyed()) {
      focused.close();
    }
  };

  const stopAndQuitItem: Electron.MenuItemConstructorOptions = {
    label: "Stop agent and quit",
    accelerator: "Shift+CmdOrCtrl+Q",
    click: () => requestStopAndQuit(),
  };

  const hideWindowItem: Electron.MenuItemConstructorOptions = {
    label: isMac ? "Close Window" : "Close",
    accelerator: "CmdOrCtrl+W",
    click: hideFocusedWindow,
  };

  const quitItem: Electron.MenuItemConstructorOptions = {
    label: "Quit Rome",
    accelerator: "CmdOrCtrl+Q",
    click: () => requestStopAndQuit(),
  };

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              {
                label: "Settings…",
                accelerator: "CmdOrCtrl+,",
                click: () => openSettings(),
              },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              quitItem,
              stopAndQuitItem,
            ],
          } as Electron.MenuItemConstructorOptions,
        ]
      : []),

    // File menu
    {
      label: "File",
      submenu: [
        {
          label: "Settings…",
          accelerator: isMac ? undefined : "CmdOrCtrl+,",
          click: () => openSettings(),
        },
        { type: "separator" },
        hideWindowItem,
        ...(isMac ? [] : [stopAndQuitItem]),
      ],
    },

    // Edit menu (standard copy/paste support)
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },

    // View menu
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },

    // Window menu
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        // Carries an accelerator because this is the only way back when a
        // provider's OAuth page has taken over the window: there is no back
        // affordance to reach for, and a menu nobody thinks to open is not one.
        {
          label: "Web Dashboard",
          accelerator: "CmdOrCtrl+Shift+D",
          click: () => showDashboard(),
        },
        {
          label: "Settings",
          click: () => openSettings(),
        },
        ...(isMac ? [{ type: "separator" as const }, { role: "front" as const }] : []),
      ],
    },

    // Help menu
    {
      label: "Help",
      submenu: [
        {
          label: "Update Rome",
          click: () => {
            void checkForUpdates();
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
