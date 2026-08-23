const SPECIAL_KEYS = {
  enter: { keysym: 0xff0d, code: "Enter" },
  tab: { keysym: 0xff09, code: "Tab" },
};

const PASTE_MODIFIER_KEYS = {
  control: [
    { keysym: 0xffe3, code: "ControlLeft" },
    { keysym: 0xffe4, code: "ControlRight" },
  ],
  meta: [
    { keysym: 0xffe7, code: "MetaLeft" },
    { keysym: 0xffe8, code: "MetaRight" },
    { keysym: 0xffe9, code: "AltLeft" },
    { keysym: 0xffea, code: "AltRight" },
    { keysym: 0xffeb, code: "SuperLeft" },
    { keysym: 0xffec, code: "SuperRight" },
  ],
};

function toRemoteKeysym(character) {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) {
    return null;
  }

  if (codePoint <= 0xff) {
    return codePoint;
  }

  return 0x01000000 | codePoint;
}

export function buildPasteKeySequence(text) {
  const normalizedText = text.replace(/\r\n?/g, "\n");
  const sequence = [];

  for (const character of normalizedText) {
    if (character === "\n") {
      sequence.push(SPECIAL_KEYS.enter);
      continue;
    }

    if (character === "\t") {
      sequence.push(SPECIAL_KEYS.tab);
      continue;
    }

    const keysym = toRemoteKeysym(character);
    if (keysym === null) {
      continue;
    }

    sequence.push({ keysym });
  }

  return sequence;
}

export function sendTextToRemote(rfb, text) {
  for (const { keysym, code } of buildPasteKeySequence(text)) {
    if (code) {
      rfb.sendKey(keysym, code);
      continue;
    }

    rfb.sendKey(keysym);
  }
}

export function isPasteShortcut(event) {
  return (
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    String(event.key).toLowerCase() === "v"
  );
}

function isPasteReleaseEvent(event) {
  const key = String(event.key).toLowerCase();
  return key === "v" || key === "meta" || key === "control";
}

export function createDeferredPasteController({ readClipboardText, onPasteText, onPasteError }) {
  let pendingPaste = null;

  async function flushPendingPaste() {
    if (pendingPaste === null) {
      return;
    }

    const { textPromise, modifiers } = pendingPaste;
    pendingPaste = null;

    try {
      const text = await textPromise;
      if (!text) {
        onPasteError("Local clipboard is empty.");
        return;
      }

      onPasteText(text, modifiers);
    } catch {
      onPasteError("Browser blocked clipboard read.");
    }
  }

  return {
    handleKeyDown(event) {
      if (!isPasteShortcut(event)) {
        return false;
      }

      event.preventDefault();
      event.stopPropagation();

      if (pendingPaste === null) {
        pendingPaste = {
          textPromise: readClipboardText(),
          modifiers: {
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
          },
        };
      }

      return true;
    },

    handleKeyUp(event) {
      if (pendingPaste === null || !isPasteReleaseEvent(event)) {
        return false;
      }

      if (event.metaKey || event.ctrlKey) {
        return true;
      }

      void flushPendingPaste();
      return true;
    },
  };
}

export function isTouchDevice() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

export function computeFitTransform({ frameWidth, frameHeight, contentWidth, contentHeight }) {
  if (!frameWidth || !frameHeight || !contentWidth || !contentHeight) {
    return { scale: 1, tx: 0, ty: 0 };
  }
  const scale = Math.min(frameWidth / contentWidth, frameHeight / contentHeight);
  return {
    scale,
    tx: (frameWidth - contentWidth * scale) / 2,
    ty: (frameHeight - contentHeight * scale) / 2,
  };
}

export function computeGestureTransform({ start, current, scaleBounds }) {
  const rawScale = start.scale * (current.distance / start.distance);
  const scale = Math.min(Math.max(rawScale, scaleBounds.min), scaleBounds.max);
  const k = scale / start.scale;
  return {
    scale,
    tx: current.center.x - (start.center.x - start.tx) * k,
    ty: current.center.y - (start.center.y - start.ty) * k,
  };
}

function getRelativePoint(clientX, clientY, frameRect) {
  return { x: clientX - frameRect.left, y: clientY - frameRect.top };
}

const SYNTHETIC_FLAG = "__romeSyntheticPointer";

function pointerSummary(pointers) {
  const points = [...pointers.values()];
  if (points.length < 2) {
    return null;
  }
  const [a, b] = points;
  return {
    center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
  };
}

export function createTouchViewport({
  frame,
  wrap,
  getContentSize,
  cancelPointer,
  scaleBounds = { min: 0.25, max: 4 },
}) {
  const pointers = new Map();
  let gestureStart = null;
  let scale = 1;
  let tx = 0;
  let ty = 0;

  function applyTransform() {
    const content = getContentSize();
    wrap.style.left = `${tx}px`;
    wrap.style.top = `${ty}px`;
    wrap.style.width = `${content.width * scale}px`;
    wrap.style.height = `${content.height * scale}px`;
  }

  function fitToFrame() {
    const frameRect = frame.getBoundingClientRect();
    const content = getContentSize();
    const fit = computeFitTransform({
      frameWidth: frameRect.width,
      frameHeight: frameRect.height,
      contentWidth: content.width,
      contentHeight: content.height,
    });
    scale = fit.scale;
    tx = fit.tx;
    ty = fit.ty;
    applyTransform();
  }

  function clampScaleBounds() {
    const content = getContentSize();
    const frameRect = frame.getBoundingClientRect();
    const fit = computeFitTransform({
      frameWidth: frameRect.width,
      frameHeight: frameRect.height,
      contentWidth: content.width,
      contentHeight: content.height,
    });
    return {
      min: fit.scale * 0.9,
      max: fit.scale * 6,
    };
  }

  function trackPointer(event) {
    if (event.pointerType !== "touch") {
      return false;
    }
    const frameRect = frame.getBoundingClientRect();
    pointers.set(event.pointerId, getRelativePoint(event.clientX, event.clientY, frameRect));
    return true;
  }

  function handlePointerDown(event) {
    if (event[SYNTHETIC_FLAG]) return;
    if (!trackPointer(event)) return;
    if (pointers.size >= 2 && !gestureStart) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const summary = pointerSummary(pointers);
      gestureStart = {
        center: summary.center,
        distance: summary.distance,
        scale,
        tx,
        ty,
      };
      for (const id of pointers.keys()) {
        if (id !== event.pointerId) {
          cancelPointer(id);
        }
      }
    } else if (gestureStart) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  function handlePointerMove(event) {
    if (event[SYNTHETIC_FLAG]) return;
    if (!pointers.has(event.pointerId)) return;
    if (event.pointerType !== "touch") return;
    const frameRect = frame.getBoundingClientRect();
    pointers.set(event.pointerId, getRelativePoint(event.clientX, event.clientY, frameRect));
    if (!gestureStart) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const summary = pointerSummary(pointers);
    if (!summary) return;
    const next = computeGestureTransform({
      start: gestureStart,
      current: summary,
      scaleBounds: { ...scaleBounds, ...clampScaleBounds() },
    });
    scale = next.scale;
    tx = next.tx;
    ty = next.ty;
    applyTransform();
  }

  function handlePointerEnd(event) {
    if (event[SYNTHETIC_FLAG]) return;
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (gestureStart) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (pointers.size < 2) {
        gestureStart = null;
      }
    }
  }

  frame.addEventListener("pointerdown", handlePointerDown, { capture: true });
  frame.addEventListener("pointermove", handlePointerMove, { capture: true, passive: false });
  frame.addEventListener("pointerup", handlePointerEnd, { capture: true });
  frame.addEventListener("pointercancel", handlePointerEnd, { capture: true });

  const resizeObserver =
    typeof ResizeObserver === "function" ? new ResizeObserver(() => fitToFrame()) : null;
  resizeObserver?.observe(frame);

  return {
    fitToFrame,
    getTransform: () => ({ scale, tx, ty }),
    destroy() {
      frame.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      frame.removeEventListener("pointermove", handlePointerMove, { capture: true });
      frame.removeEventListener("pointerup", handlePointerEnd, { capture: true });
      frame.removeEventListener("pointercancel", handlePointerEnd, { capture: true });
      resizeObserver?.disconnect();
    },
  };
}

const KEYSYM_BACKSPACE = 0xff08;
const KEYSYM_ENTER = 0xff0d;
const KEYSYM_TAB = 0xff09;

function characterToKeysym(character) {
  if (character === "\n") return { keysym: KEYSYM_ENTER, code: "Enter" };
  if (character === "\t") return { keysym: KEYSYM_TAB, code: "Tab" };
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) return null;
  const keysym = codePoint <= 0xff ? codePoint : 0x01000000 | codePoint;
  return { keysym, code: undefined };
}

function setupKeyboardToolbar(rfb, screen) {
  const toggle = document.getElementById("kb-toggle");
  const input = document.getElementById("keyboard-input");
  if (!toggle || !input) return;

  let lastValue = "";

  function showKeyboard() {
    input.value = "";
    lastValue = "";
    input.removeAttribute("readonly");
    input.focus({ preventScroll: true });
  }

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    if (document.activeElement === input) {
      input.blur();
      screen.focus();
    } else {
      showKeyboard();
    }
  });

  // Soft keyboards on iOS/Android often suppress keydown events. Translate
  // input changes into keysyms so typing still reaches the remote.
  input.addEventListener("input", () => {
    const next = input.value;
    const oldLen = [...lastValue].length;
    const newLen = [...next].length;
    if (newLen < oldLen) {
      for (let i = 0; i < oldLen - newLen; i++) {
        rfb.sendKey(KEYSYM_BACKSPACE, "Backspace");
      }
    } else if (newLen > oldLen) {
      const added = [...next].slice(oldLen).join("");
      for (const character of added) {
        const mapped = characterToKeysym(character);
        if (!mapped) continue;
        if (mapped.code) {
          rfb.sendKey(mapped.keysym, mapped.code);
        } else {
          rfb.sendKey(mapped.keysym);
        }
      }
    }
    lastValue = next;
    if (next.length > 64) {
      input.value = "";
      lastValue = "";
    }
  });

  // Hardware keyboards still fire keydown on the input — forward those too.
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      rfb.sendKey(KEYSYM_ENTER, "Enter");
    } else if (e.key === "Backspace" && input.value === "") {
      e.preventDefault();
      rfb.sendKey(KEYSYM_BACKSPACE, "Backspace");
    } else if (e.key === "Tab") {
      e.preventDefault();
      rfb.sendKey(KEYSYM_TAB, "Tab");
    }
  });
}

function dispatchSyntheticPointerCancel(target, pointerId) {
  if (!target || typeof PointerEvent !== "function") return;
  try {
    const event = new PointerEvent("pointercancel", {
      pointerId,
      bubbles: true,
      cancelable: true,
      pointerType: "touch",
    });
    Object.defineProperty(event, SYNTHETIC_FLAG, { value: true });
    target.dispatchEvent(event);
  } catch {}
}

export async function initDesktopVnc() {
  const { default: RFB } = await import("/desktop-proxy/core/rfb.js");
  const screen = document.getElementById("screen");
  const wrap = document.getElementById("screen-wrap");
  const frame = document.getElementById("viewport-frame");

  if (
    !(screen instanceof HTMLElement) ||
    !(wrap instanceof HTMLElement) ||
    !(frame instanceof HTMLElement)
  ) {
    throw new Error("Desktop VNC UI is missing required elements.");
  }

  const params = new URLSearchParams(window.location.search);
  const path = params.get("path") ?? "desktop-proxy/websockify";
  const resize = params.get("resize") ?? "remote";
  const touchOverride = params.get("touch");
  const touchMode = touchOverride === "1" ? true : touchOverride === "0" ? false : isTouchDevice();
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = `${protocol}://${window.location.host}/${path}`;

  const rfb = new RFB(screen, wsUrl);

  function focusRemote() {
    screen.focus();
    rfb.focus();
  }

  function remoteHasFocus(target) {
    if (target instanceof Node && screen.contains(target)) {
      return true;
    }

    const activeElement = document.activeElement;
    return activeElement instanceof Node && screen.contains(activeElement);
  }

  function releasePasteModifiers(modifiers) {
    if (modifiers?.ctrlKey) {
      for (const key of PASTE_MODIFIER_KEYS.control) {
        rfb.sendKey(key.keysym, key.code, false);
      }
    }

    if (modifiers?.metaKey) {
      for (const key of PASTE_MODIFIER_KEYS.meta) {
        rfb.sendKey(key.keysym, key.code, false);
      }
    }
  }

  function pasteTextToRemote(text, modifiers) {
    focusRemote();
    releasePasteModifiers(modifiers);
    rfb.clipboardPasteFrom(text);
    sendTextToRemote(rfb, text);
  }

  const deferredPaste = createDeferredPasteController({
    readClipboardText: () => navigator.clipboard.readText(),
    onPasteText: pasteTextToRemote,
    onPasteError: () => {},
  });

  rfb.viewOnly = false;

  let touchViewport = null;

  if (touchMode) {
    frame.classList.add("touch-mode");
    document.body.classList.add("touch-mode");
    rfb.scaleViewport = true;
    rfb.clipViewport = false;
    rfb.dragViewport = false;
    rfb.resizeSession = false;
  } else {
    rfb.scaleViewport = resize === "scale";
    rfb.resizeSession = resize === "remote";
  }

  function getCanvas() {
    return screen.querySelector("canvas");
  }

  function getCanvasSize() {
    const canvas = getCanvas();
    if (!canvas || !canvas.width || !canvas.height) {
      return { width: 1, height: 1 };
    }
    return { width: canvas.width, height: canvas.height };
  }

  rfb.addEventListener("connect", () => {
    focusRemote();
    if (touchMode) {
      touchViewport = createTouchViewport({
        frame,
        wrap,
        getContentSize: getCanvasSize,
        cancelPointer: (id) => dispatchSyntheticPointerCancel(getCanvas(), id),
      });
      touchViewport.fitToFrame();
    }
  });

  if (touchMode) {
    const refit = () => touchViewport?.fitToFrame();
    rfb.addEventListener("desktopname", refit);
    window.addEventListener("resize", refit);
    setupKeyboardToolbar(rfb, screen);
  }

  rfb.addEventListener("clipboard", async (event) => {
    const text = event.detail.text ?? "";
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  });

  document.addEventListener(
    "keydown",
    (event) => {
      if (!remoteHasFocus(event.target)) {
        return;
      }

      deferredPaste.handleKeyDown(event);
    },
    { capture: true },
  );
  document.addEventListener(
    "keyup",
    (event) => {
      deferredPaste.handleKeyUp(event);
    },
    { capture: true },
  );

  window.addEventListener("pointerdown", () => {
    focusRemote();
  });

  focusRemote();
}
