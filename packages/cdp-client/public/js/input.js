/**
 * Mouse, keyboard, and clipboard event capture on the canvas.
 * Forwards to server via WsClient.
 */
window.Input = (function () {
  const canvas = Canvas.getElement();
  const urlBar = document.getElementById("url-bar");
  const cdpHost = document.getElementById("cdp-host");
  const cdpPort = document.getElementById("cdp-port");

  const KEY_MAP = {
    Enter: 13,
    Backspace: 8,
    Tab: 9,
    Escape: 27,
    ArrowLeft: 37,
    ArrowUp: 38,
    ArrowRight: 39,
    ArrowDown: 40,
    Delete: 46,
    Home: 36,
    End: 35,
    PageUp: 33,
    PageDown: 34,
  };

  function isUiElement(el) {
    return (
      el === urlBar ||
      el === cdpHost ||
      el === cdpPort ||
      (el && el.tagName === "INPUT") ||
      (el && el.tagName === "SELECT") ||
      (el && el.tagName === "TEXTAREA")
    );
  }

  function modifiers(e) {
    let m = 0;
    if (e.altKey) m |= 1;
    if (e.ctrlKey) m |= 2;
    if (e.metaKey) m |= 4;
    if (e.shiftKey) m |= 8;
    return m;
  }

  canvas.addEventListener("mousedown", (e) => {
    const { x, y } = Canvas.toDeviceCoords(e);
    const button = e.button === 2 ? "right" : e.button === 1 ? "middle" : "left";
    WsClient.send({
      type: "input:mouse",
      params: { type: "mousePressed", x, y, button, clickCount: 1 },
    });
  });

  canvas.addEventListener("mouseup", (e) => {
    const { x, y } = Canvas.toDeviceCoords(e);
    const button = e.button === 2 ? "right" : e.button === 1 ? "middle" : "left";
    WsClient.send({
      type: "input:mouse",
      params: { type: "mouseReleased", x, y, button, clickCount: 1 },
    });
  });

  canvas.addEventListener("mousemove", (e) => {
    const { x, y } = Canvas.toDeviceCoords(e);
    WsClient.send({
      type: "input:mouse",
      params: { type: "mouseMoved", x, y },
    });
  });

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const { x, y } = Canvas.toDeviceCoords(e);
      WsClient.send({
        type: "input:mouse",
        params: {
          type: "mouseWheel",
          x,
          y,
          deltaX: e.deltaX,
          deltaY: e.deltaY,
        },
      });
    },
    { passive: false },
  );

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  document.addEventListener("keydown", (e) => {
    if (isUiElement(e.target)) return;

    // Copy: intercept Ctrl/Cmd+C
    if (e.key === "c" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      WsClient.send({ type: "input:copy" });
      return;
    }

    // Paste: let paste event handle it
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      return;
    }

    // Focus URL bar on Cmd/Ctrl+L
    if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      urlBar.focus();
      return;
    }

    e.preventDefault();
    const kc = KEY_MAP[e.key] || e.keyCode;
    const params = {
      modifiers: modifiers(e),
      key: e.key,
      code: e.code,
      windowsVirtualKeyCode: kc,
      nativeVirtualKeyCode: kc,
    };
    WsClient.send({ type: "input:key", params: { type: "keyDown", ...params } });

    // Send char event for printable keys
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      WsClient.send({
        type: "input:key",
        params: {
          type: "char",
          modifiers: modifiers(e),
          text: e.key,
          key: e.key,
          unmodifiedText: e.key,
        },
      });
    }
  });

  document.addEventListener("keyup", (e) => {
    if (isUiElement(e.target)) return;
    e.preventDefault();
    const kc = KEY_MAP[e.key] || e.keyCode;
    WsClient.send({
      type: "input:key",
      params: {
        type: "keyUp",
        modifiers: modifiers(e),
        key: e.key,
        code: e.code,
        windowsVirtualKeyCode: kc,
        nativeVirtualKeyCode: kc,
      },
    });
  });

  document.addEventListener("paste", (e) => {
    if (isUiElement(e.target)) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    if (text) WsClient.send({ type: "input:paste", text });
  });

  WsClient.on("copy:result", (msg) => {
    if (msg.text) {
      navigator.clipboard.writeText(msg.text).catch(() => {});
    }
  });

  return {};
})();
