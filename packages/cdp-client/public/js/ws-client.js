/**
 * WebSocket client with auto-reconnect.
 * Exposes a global `WsClient` object.
 */
window.WsClient = (function () {
  let ws = null;
  let reconnectTimer = null;
  const RECONNECT_DELAY = 2000;
  const listeners = {};

  function getWsUrl() {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${location.host}/ws`;
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    ws = new WebSocket(getWsUrl());

    ws.onopen = () => {
      emit("open");
    };

    ws.onmessage = (evt) => {
      let msg;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        return;
      }
      emit("message", msg);
      if (msg.type) {
        emit(msg.type, msg);
      }
    };

    ws.onclose = () => {
      emit("close");
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, RECONNECT_DELAY);
  }

  function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  }

  function off(event, fn) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter((f) => f !== fn);
  }

  function emit(event, data) {
    if (!listeners[event]) return;
    for (const fn of listeners[event]) {
      try {
        fn(data);
      } catch (e) {
        console.error("[WsClient]", event, e);
      }
    }
  }

  function isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
  }

  return { connect, disconnect, send, on, off, isConnected };
})();
