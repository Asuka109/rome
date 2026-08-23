/**
 * Bootstrap: connects all modules together.
 */
(function () {
  const btnTheme = document.getElementById("btn-theme");

  const savedTheme = localStorage.getItem("cdp-theme") || "dark";
  document.documentElement.dataset.theme = savedTheme;

  btnTheme.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme;
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("cdp-theme", next);
  });

  Tabs.onSwitch((targetId, tab) => {
    if (targetId) {
      Canvas.showOverlay("Connecting...");
      WsClient.send({ type: "tab:switch", targetId });
      Nav.setUrl(tab ? tab.url : "");
    } else {
      Canvas.showOverlay("Select a tab to start viewing");
      Nav.setUrl("");
    }
  });

  WsClient.on("open", () => {
    // State will be pushed by server on connect
  });

  WsClient.on("close", () => {
    Canvas.showOverlay("Connection lost. Reconnecting...");
  });

  WsClient.on("error", (msg) => {
    if (msg && msg.message) {
      Canvas.showOverlay("Error: " + msg.message);
    }
  });

  WsClient.connect();
})();
