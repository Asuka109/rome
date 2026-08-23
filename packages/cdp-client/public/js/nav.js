/**
 * Navigation bar: URL bar, back/forward/reload, CDP settings.
 * Exposes a global `Nav` object.
 */
window.Nav = (function () {
  const urlBar = document.getElementById("url-bar");
  const statusDot = document.getElementById("nav-status-dot");
  const btnBack = document.getElementById("btn-back");
  const btnForward = document.getElementById("btn-forward");
  const btnReload = document.getElementById("btn-reload");
  const btnSettings = document.getElementById("btn-settings");
  const settingsDropdown = document.getElementById("settings-dropdown");
  const cdpHostInput = document.getElementById("cdp-host");
  const cdpPortInput = document.getElementById("cdp-port");
  const btnCdpConnect = document.getElementById("btn-cdp-connect");
  const connectionStatus = document.getElementById("cdp-connection-status");
  const canvas = document.getElementById("screen");

  function focusCanvas() {
    canvas.focus();
  }

  // URL bar: Enter to navigate
  urlBar.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      let url = urlBar.value.trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      WsClient.send({ type: "nav:go", url });
      focusCanvas();
    }
    if (e.key === "Escape") {
      focusCanvas();
    }
  });

  // Select all on focus
  urlBar.addEventListener("focus", () => {
    setTimeout(() => urlBar.select(), 0);
  });

  // Nav buttons
  btnBack.addEventListener("click", () => {
    WsClient.send({ type: "nav:back" });
    focusCanvas();
  });

  btnForward.addEventListener("click", () => {
    WsClient.send({ type: "nav:forward" });
    focusCanvas();
  });

  btnReload.addEventListener("click", () => {
    WsClient.send({ type: "nav:reload" });
    focusCanvas();
  });

  // Settings dropdown toggle
  btnSettings.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!settingsDropdown.contains(e.target) && e.target !== btnSettings) {
      settingsDropdown.classList.add("hidden");
    }
  });

  // CDP connect
  btnCdpConnect.addEventListener("click", () => {
    const host = cdpHostInput.value.trim() || "localhost";
    const port = parseInt(cdpPortInput.value, 10) || 9222;
    WsClient.send({ type: "cdp:connect", host, port });
    settingsDropdown.classList.add("hidden");
  });

  cdpPortInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnCdpConnect.click();
  });

  cdpHostInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnCdpConnect.click();
  });

  // CDP status updates
  function updateCdpStatus(status) {
    const state = status.connected ? "connected" : "disconnected";
    statusDot.className = "status-dot " + state;
    statusDot.title = status.connected
      ? `Connected to ${status.host}:${status.port}`
      : "Disconnected";
    connectionStatus.className = "status-badge " + state;
    connectionStatus.textContent = status.connected
      ? `${status.host}:${status.port}`
      : "Disconnected";
    cdpHostInput.value = status.host || "";
    cdpPortInput.value = status.port || "";
  }

  // URL updates from server
  function setUrl(url) {
    if (document.activeElement !== urlBar) {
      urlBar.value = url || "";
    }
  }

  WsClient.on("cdp:status", (msg) => updateCdpStatus(msg));
  WsClient.on("nav:url", (msg) => setUrl(msg.url));

  WsClient.on("open", () => {
    statusDot.className = "status-dot connecting";
    statusDot.title = "WebSocket connected, waiting for CDP status...";
  });

  WsClient.on("close", () => {
    statusDot.className = "status-dot disconnected";
    statusDot.title = "WebSocket disconnected";
    connectionStatus.className = "status-badge disconnected";
    connectionStatus.textContent = "Disconnected";
  });

  return { setUrl, updateCdpStatus };
})();
