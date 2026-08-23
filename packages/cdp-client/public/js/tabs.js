/**
 * Tab strip rendering, new tab detection, tab switching.
 * Exposes a global `Tabs` object.
 */
window.Tabs = (function () {
  const strip = document.getElementById("tab-strip");
  const btnNewTab = document.getElementById("btn-new-tab");

  let tabsList = [];
  let activeTabId = null;
  let onSwitchCallback = null;

  function onSwitch(cb) {
    onSwitchCallback = cb;
  }

  function setTabs(tabs) {
    tabsList = tabs;
    render();
  }

  function getActive() {
    return activeTabId;
  }

  function switchTo(targetId) {
    const changed = activeTabId !== targetId;
    activeTabId = targetId;
    if (changed) render();
    // Look up the tab's URL for the nav bar
    const tab = tabsList.find((t) => t.id === targetId);
    if (onSwitchCallback) onSwitchCallback(targetId, tab);
  }

  function render() {
    // Preserve existing tab elements for smooth animations
    const existingEls = {};
    for (const el of strip.querySelectorAll(".tab")) {
      existingEls[el.dataset.id] = el;
    }

    const fragment = document.createDocumentFragment();
    const currentIds = new Set();

    for (const tab of tabsList) {
      currentIds.add(tab.id);
      let el = existingEls[tab.id];
      const isNew = !el;

      if (isNew) {
        el = createTabElement(tab);
      } else {
        updateTabElement(el, tab);
      }

      el.classList.toggle("active", tab.id === activeTabId);
      fragment.appendChild(el);
    }

    strip.innerHTML = "";
    strip.appendChild(fragment);

    // If active tab was removed, clear selection
    if (activeTabId && !currentIds.has(activeTabId)) {
      activeTabId = null;
      if (onSwitchCallback) onSwitchCallback(null);
    }
  }

  function createTabElement(tab) {
    const el = document.createElement("div");
    el.className = "tab";
    el.dataset.id = tab.id;

    // Favicon
    const faviconWrap = document.createElement("span");
    if (tab.faviconUrl && !tab.url.startsWith("about:")) {
      const img = document.createElement("img");
      img.className = "tab-favicon";
      img.src = tab.faviconUrl;
      img.onerror = () => {
        img.replaceWith(createFaviconPlaceholder());
      };
      faviconWrap.appendChild(img);
    } else {
      faviconWrap.appendChild(createFaviconPlaceholder());
    }
    el.appendChild(faviconWrap);

    // Title
    const title = document.createElement("span");
    title.className = "tab-title";
    title.textContent = tab.title || tab.url || "New Tab";
    el.appendChild(title);

    // Close button
    const close = document.createElement("button");
    close.className = "tab-close";
    close.innerHTML = "&times;";
    close.title = "Close tab";
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      WsClient.send({ type: "tab:close", targetId: tab.id });
    });
    el.appendChild(close);

    // Click to switch
    el.addEventListener("click", () => switchTo(tab.id));

    // Middle-click to close
    el.addEventListener("mousedown", (e) => {
      if (e.button === 1) {
        e.preventDefault();
        WsClient.send({ type: "tab:close", targetId: tab.id });
      }
    });

    return el;
  }

  function updateTabElement(el, tab) {
    const title = el.querySelector(".tab-title");
    if (title) title.textContent = tab.title || tab.url || "New Tab";
  }

  function createFaviconPlaceholder() {
    const placeholder = document.createElement("span");
    placeholder.className = "tab-favicon-placeholder";
    placeholder.innerHTML =
      '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1" fill="none"/></svg>';
    return placeholder;
  }

  // New tab button
  btnNewTab.addEventListener("click", () => {
    WsClient.send({ type: "tab:new", url: "about:blank" });
  });

  // Listen for tab list updates
  WsClient.on("tabs:list", (msg) => {
    setTabs(msg.tabs);
    // Auto-switch to first tab if none selected
    if (!activeTabId && msg.tabs.length > 0) {
      switchTo(msg.tabs[0].id);
    }
  });

  // On WS reconnect, re-send tab:switch for the active tab
  WsClient.on("open", () => {
    if (activeTabId) {
      WsClient.send({ type: "tab:switch", targetId: activeTabId });
    }
  });

  return { onSwitch, getActive, switchTo, setTabs };
})();
