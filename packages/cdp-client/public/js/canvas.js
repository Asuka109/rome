/**
 * Screencast frame rendering and coordinate mapping.
 * Exposes a global `Canvas` object.
 */
window.Canvas = (function () {
  const canvas = document.getElementById("screen");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("canvas-overlay");

  let deviceWidth = 1920;
  let deviceHeight = 1080;
  let hasFrame = false;

  function showOverlay(message) {
    overlay.classList.remove("hidden");
    overlay.querySelector("p").textContent = message;
    hasFrame = false;
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function renderFrame(msg) {
    const img = new Image();
    img.onload = () => {
      deviceWidth = msg.metadata.deviceWidth || img.width;
      deviceHeight = msg.metadata.deviceHeight || img.height;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      if (!hasFrame) {
        hasFrame = true;
        hideOverlay();
      }
    };
    img.src = "data:image/jpeg;base64," + msg.data;
  }

  /** Convert a DOM mouse event to device coordinates. */
  function toDeviceCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = deviceWidth / rect.width;
    const scaleY = deviceHeight / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  }

  function focus() {
    canvas.focus();
  }

  function getElement() {
    return canvas;
  }

  // Listen for screencast frames
  WsClient.on("screencast:frame", renderFrame);

  return { showOverlay, hideOverlay, toDeviceCoords, renderFrame, focus, getElement };
})();
