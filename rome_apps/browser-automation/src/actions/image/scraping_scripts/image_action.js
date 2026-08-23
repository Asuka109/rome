/**
 * image_action.js
 *
 * Browser-side script for ChatGPT image generation via the main chatgpt.com page.
 * Uses the "Create image" toggle in the composer menu to enable image mode,
 * then sends the prompt and waits for the image generation to complete.
 *
 * Entry point: generateChatGPTImage({ prompt, timeout })
 * Returns: { prompt, conversationUrl }
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Find the ChatGPT composer input element.
 * Supports multiple UI variants (textarea, contenteditable div).
 */
function getComposer() {
  return (
    document.querySelector("#prompt-textarea") ||
    document.querySelector('div[contenteditable="true"][role="textbox"]') ||
    document.querySelector('div[contenteditable="true"]') ||
    document.querySelector('textarea[placeholder*="ChatGPT"]') ||
    document.querySelector('textarea[placeholder*="image"]')
  );
}

/**
 * Find the send button using multiple selector strategies.
 */
function getSendButton() {
  const btn =
    document.querySelector('button[data-testid="send-button"]') ||
    document.querySelector('button[aria-label="Send prompt"]');

  if (btn && !btn.disabled) return btn;

  const composerForm = document.querySelector("form") || getComposer()?.closest("div[class]");
  if (composerForm) {
    const buttons = composerForm.querySelectorAll("button");
    for (const b of buttons) {
      const label = (b.getAttribute("aria-label") || "").toLowerCase();
      const testId = b.getAttribute("data-testid") || "";
      if ((label.includes("send") || testId.includes("send")) && !b.disabled) {
        return b;
      }
    }
  }

  return null;
}

/**
 * Check if ChatGPT is still generating a response.
 */
function isStillGenerating() {
  return !!(
    document.querySelector('button[aria-label="Stop generating"]') ||
    document.querySelector('button[data-testid="stop-button"]') ||
    document.querySelector('button[aria-label="Stop streaming"]')
  );
}

/**
 * Set the composer value, handling both textarea and contenteditable elements.
 */
function setComposerValue(inputEl, prompt) {
  if (inputEl.tagName === "TEXTAREA") {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    if (!setter) {
      throw new Error("Failed to access the ChatGPT textarea setter");
    }
    setter.call(inputEl, prompt);
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  // contenteditable div
  inputEl.focus();
  document.execCommand("selectAll", false);
  document.execCommand("delete", false);
  document.execCommand("insertText", false, prompt);
  inputEl.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: prompt,
    }),
  );
}

/**
 * Simulate a real user click with full pointer/mouse event sequence.
 * Radix UI menus require proper pointer events, not just el.click().
 */
function simulateRealClick(el) {
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const opts = {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    pointerId: 1,
  };
  el.dispatchEvent(new PointerEvent("pointerdown", opts));
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  el.dispatchEvent(new PointerEvent("pointerup", opts));
  el.dispatchEvent(new MouseEvent("mouseup", opts));
  el.dispatchEvent(new MouseEvent("click", opts));
}

/**
 * Toggle the "Create image" mode on via the composer "+" menu.
 * Opens the menu, clicks the "Create image" menuitemradio, and verifies
 * the image pill appears in the composer.
 */
async function enableCreateImageMode() {
  // Check if image mode is already active (pill present)
  const existingPill = document.querySelector('button[aria-label="Image, click to remove"]');
  if (existingPill) {
    return; // Already toggled on
  }

  // Click the "+" button to open the menu
  const plusBtn = document.querySelector('button[data-testid="composer-plus-btn"]');
  if (!plusBtn) {
    throw new Error(
      'Could not find the composer "+" button (data-testid="composer-plus-btn"). The ChatGPT UI may have changed.',
    );
  }
  simulateRealClick(plusBtn);
  await sleep(2000);

  // Find the "Create image" menuitemradio
  const menuItems = document.querySelectorAll('[role="menuitemradio"]');
  let createImageItem = null;
  for (const item of menuItems) {
    if (item.textContent.trim() === "Create image") {
      createImageItem = item;
      break;
    }
  }

  if (!createImageItem) {
    // Close menu and throw
    document.body.click();
    await sleep(200);
    throw new Error(
      'Could not find "Create image" option in the composer menu. The ChatGPT UI may have changed.',
    );
  }

  // Click to toggle image mode on
  simulateRealClick(createImageItem);
  await sleep(800);

  // Verify the image pill appeared
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const pill = document.querySelector('button[aria-label="Image, click to remove"]');
    if (pill) return;
    await sleep(300);
  }

  throw new Error(
    'Clicked "Create image" but the image mode pill did not appear. The toggle may not have worked.',
  );
}

/**
 * Check if the image generation response is complete.
 */
function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function isVisibleElement(el) {
  if (!el || el.getClientRects().length === 0) {
    return false;
  }

  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
}

function getImageCreatedStatusSpan() {
  const scope = document.querySelector("main") || document;
  const candidates = [];

  for (const span of scope.querySelectorAll("span")) {
    if (!isVisibleElement(span)) {
      continue;
    }

    const text = normalizeText(span.textContent || "");
    if (!text.startsWith("image created")) {
      continue;
    }

    candidates.push({
      element: span,
      textLength: text.length,
      depth: span.querySelectorAll("span").length,
    });
  }

  candidates.sort((left, right) => {
    if (left.textLength !== right.textLength) {
      return left.textLength - right.textLength;
    }
    return left.depth - right.depth;
  });

  return candidates[0]?.element || null;
}

function isImageResponseComplete() {
  return !!getImageCreatedStatusSpan();
}

/**
 * Wait for ChatGPT to show the "Image created" completion label.
 * The status label is a more stable completion signal for image jobs than
 * response action buttons or the transient stop button state.
 */
async function waitForGenerationComplete(timeoutMs) {
  const deadline = Date.now() + Math.min(timeoutMs, 60_000);

  let generationSeen = false;
  while (Date.now() < deadline) {
    if (isImageResponseComplete()) {
      await sleep(1000);
      return true;
    }

    generationSeen = generationSeen || isStillGenerating();
    await sleep(generationSeen ? 500 : 300);
  }

  console.error(
    generationSeen
      ? 'Timed out waiting for ChatGPT to show the "Image created" label; continuing'
      : 'Timed out waiting for ChatGPT to start generating and show the "Image created" label; continuing',
  );
  return false;
}

/**
 * Main entry point: generate an image via ChatGPT.
 *
 * Workflow:
 * 1. Wait for the composer to appear
 * 2. Toggle on "Create image" mode via the "+" menu
 * 3. Enter the prompt and click send
 * 4. Wait for SPA navigation to /c/... conversation page
 * 5. Wait for image generation to complete by observing the "Image created" label
 * 6. Return the conversation URL so a follow-up download script can run after refresh
 *
 * @param {Object} options
 * @param {string} options.prompt - The image description prompt
 * @param {number} [options.timeout=900000] - Max wait time in ms
 * @returns {{ prompt, conversationUrl }}
 */
async function generateChatGPTImage({ prompt, timeout = 900000 }) {
  const initialUrl = window.location.href;

  // Wait for the composer to appear (React hydration may take several seconds)
  const composerDeadline = Date.now() + 30_000;
  let composer = null;
  while (Date.now() < composerDeadline) {
    composer = getComposer();
    if (composer) break;
    await sleep(1000);
  }
  if (!composer) {
    throw new Error(
      "ChatGPT composer was not found. Make sure you are logged in at https://chatgpt.com.",
    );
  }

  // "Create image" mode is optional in the current flow.
  try {
    await enableCreateImageMode();
  } catch (error) {
    console.warn("Failed to enable ChatGPT Create image mode:", error);
  }

  // Enter the prompt
  // Re-acquire composer in case DOM changed after toggling image mode
  composer = getComposer();
  if (!composer) {
    throw new Error("Composer disappeared after toggling image mode.");
  }
  setComposerValue(composer, prompt);
  await sleep(500);

  // Wait for the send button to become available and enabled
  const sendDeadline = Date.now() + 10_000;
  let sendButton = null;
  while (Date.now() < sendDeadline) {
    sendButton = getSendButton();
    if (sendButton && !sendButton.disabled) break;
    sendButton = null;
    await sleep(500);
  }
  if (!sendButton) {
    throw new Error(
      "ChatGPT send button is unavailable or disabled. The page may not be fully loaded.",
    );
  }
  sendButton.click();

  // Wait for navigation to the conversation page (/c/...).
  // ChatGPT does a SPA (pushState) navigation, so our JS context survives.
  const navDeadline = Date.now() + 60_000;
  let navigated = false;
  while (Date.now() < navDeadline) {
    if (window.location.href !== initialUrl) {
      navigated = true;
      break;
    }
    if (isStillGenerating()) break;
    await sleep(500);
  }

  // After navigation, wait for the new page DOM to stabilize.
  if (navigated) {
    await sleep(3000);
  }

  // Wait for generation to complete by observing the "Image created" label.
  await waitForGenerationComplete(timeout);

  return {
    prompt,
    conversationUrl: window.location.href,
  };
}
