/**
 * chat_action.js
 *
 * Browser-side script for ChatGPT automation.
 * Designed to run inside a ChatGPT tab via CDP Runtime.evaluate.
 *
 * Supports both logged-in (article-based) and logged-out (heading-based) UI layouts.
 *
 * Entry point: chatWithChatGPT({ prompt, timeout })
 * Returns: { prompt, responseText, sources, timestamp }
 */

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getComposer() {
  return (
    document.querySelector("#prompt-textarea") ||
    document.querySelector('div[contenteditable="true"]')
  );
}

/**
 * Get all assistant response containers. Supports two UI layouts:
 *
 * 1. Logged-in layout: <article> elements containing [data-message-author-role="assistant"]
 * 2. Logged-out layout: Sections following <h4> headings with text "ChatGPT said:"
 *    The response container is the sibling element after the heading.
 */
function getAssistantResponses() {
  // Try logged-in layout first (article-based)
  const articles = Array.from(document.querySelectorAll("article")).filter((article) =>
    article.querySelector('[data-message-author-role="assistant"]'),
  );
  if (articles.length > 0) {
    return articles;
  }

  // Fallback: logged-out layout (heading-based)
  // Look for h4 headings with "ChatGPT said:" and return their next sibling containers
  const headings = Array.from(document.querySelectorAll("h4"));
  const responses = [];
  for (const h4 of headings) {
    if (h4.textContent?.trim() === "ChatGPT said:") {
      // The response content is the next sibling element after the heading
      const responseContainer = h4.nextElementSibling;
      if (responseContainer) {
        responses.push(responseContainer);
      }
    }
  }
  return responses;
}

/**
 * Wait until a CSS selector matches at least one element.
 */
async function waitForSelector(selector, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (document.querySelector(selector)) return true;
    await sleep(1000);
  }
  return false;
}

function setComposerValue(inputEl, prompt) {
  if (inputEl.tagName === "TEXTAREA") {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value",
    )?.set;

    if (!nativeInputValueSetter) {
      throw new Error("Failed to access the ChatGPT textarea setter");
    }

    nativeInputValueSetter.call(inputEl, prompt);
    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  inputEl.focus();
  document.execCommand("selectAll", false);
  document.execCommand("insertText", false, prompt);
  inputEl.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: prompt,
    }),
  );
}

function clickSendButton() {
  const sendButton =
    document.querySelector('button[data-testid="send-button"]') ||
    document.querySelector('button[aria-label="Send prompt"]');

  if (!sendButton) {
    throw new Error("ChatGPT send button not found");
  }

  sendButton.click();
}

const POLL_SCROLL_STEP_PX = 600;
const POLL_BOTTOM_THRESHOLD_PX = 96;

function getDefaultScrollRoot() {
  return document.scrollingElement || document.documentElement || document.body;
}

function isScrollableElement(element) {
  if (!element) {
    return false;
  }

  const style = window.getComputedStyle?.(element);
  const overflowY = style?.overflowY || style?.overflow || "";
  return (
    /(auto|scroll|overlay)/.test(overflowY) && element.scrollHeight > (element.clientHeight || 0)
  );
}

function findScrollableAncestor(element) {
  let current = element;
  while (current) {
    if (isScrollableElement(current)) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function getPollingScrollTarget() {
  const latestResponse = getAssistantResponses().slice(-1)[0] || null;
  const anchors = [
    latestResponse,
    getComposer(),
    document.querySelector("main"),
    document.querySelector('[role="main"]'),
    getDefaultScrollRoot(),
  ];

  for (const anchor of anchors) {
    const scrollableAncestor = findScrollableAncestor(anchor);
    if (scrollableAncestor) {
      return scrollableAncestor;
    }
  }

  return getDefaultScrollRoot();
}

function setScrollTop(target, top) {
  if (!target) {
    return;
  }

  if (typeof target.scrollTo === "function") {
    target.scrollTo({ top, behavior: "auto" });
  }

  target.scrollTop = top;

  if (target === getDefaultScrollRoot()) {
    window.scrollTo(0, top);
  }
}

function nudgePollingScroll(state = { lastScrollHeight: 0 }, step = POLL_SCROLL_STEP_PX) {
  const scrollTarget = getPollingScrollTarget();

  if (!scrollTarget) {
    return state;
  }

  const maxScrollTop = Math.max(0, scrollTarget.scrollHeight - (scrollTarget.clientHeight || 0));
  const distanceFromBottom = maxScrollTop - scrollTarget.scrollTop;
  const contentGrew = scrollTarget.scrollHeight > state.lastScrollHeight;
  const awayFromBottom = distanceFromBottom > POLL_BOTTOM_THRESHOLD_PX;

  if (!contentGrew && !awayFromBottom) {
    return {
      lastScrollHeight: scrollTarget.scrollHeight,
    };
  }

  const nextScrollTop = Math.min(scrollTarget.scrollTop + step, maxScrollTop);
  setScrollTop(scrollTarget, nextScrollTop);

  return {
    lastScrollHeight: scrollTarget.scrollHeight,
  };
}

function extractResponseText(container) {
  const markdownDivs = container.querySelectorAll(".markdown");
  if (markdownDivs.length > 0) {
    return Array.from(markdownDivs)
      .map((markdownDiv) => markdownDiv.innerText.trim())
      .filter(Boolean)
      .join("\n\n");
  }

  const message = container.querySelector('[data-message-author-role="assistant"]');
  return (message?.innerText || container.innerText || "").trim();
}

function extractSources(container) {
  const sources = [];
  const seenUrls = new Set();

  // Search within the container and its parent (for logged-out layout)
  const searchRoots = [container];
  if (container.parentElement) {
    searchRoots.push(container.parentElement);
  }

  for (const root of searchRoots) {
    for (const link of root.querySelectorAll("a[href]")) {
      const href = link.href;
      if (!href || seenUrls.has(href) || !href.startsWith("http")) {
        continue;
      }

      seenUrls.add(href);
      sources.push({
        title: (link.textContent || "").trim(),
        url: href,
      });
    }
  }

  return sources;
}

/**
 * Check if the response is still being generated.
 */
function isStillGenerating() {
  return !!(
    document.querySelector('button[aria-label="Stop generating"]') ||
    document.querySelector('button[data-testid="stop-button"]')
  );
}

/**
 * Send a prompt to ChatGPT and wait for the response.
 *
 * @param {Object} options
 * @param {string} options.prompt - The text prompt to send
 * @param {number} [options.timeout=1800000] - Max wait time in ms
 * @returns {Object} { prompt, responseText, sources, timestamp }
 */
async function chatWithChatGPT(options = {}) {
  const { prompt = "hello", timeout = 1800000 } = options;

  const inputSelector = '#prompt-textarea, div[contenteditable="true"]';
  const inputReady = await waitForSelector(inputSelector, 30000);
  if (!inputReady) {
    throw new Error("ChatGPT input field not found within 30s");
  }

  const inputEl = getComposer();
  if (!inputEl) {
    throw new Error("ChatGPT input element not found");
  }

  const existingResponseCount = getAssistantResponses().length;

  setComposerValue(inputEl, prompt);
  await sleep(500);
  clickSendButton();
  await sleep(1000);

  const deadline = Date.now() + timeout;
  const pollInterval = 1500;
  let pollScrollState = {
    lastScrollHeight: getPollingScrollTarget()?.scrollHeight || 0,
  };
  let lastResponseContainer = null;

  while (Date.now() < deadline) {
    pollScrollState = nudgePollingScroll(pollScrollState);

    const responses = getAssistantResponses();
    if (responses.length <= existingResponseCount) {
      await sleep(pollInterval);
      continue;
    }

    lastResponseContainer = responses[responses.length - 1];

    // Still generating — keep waiting
    if (isStillGenerating()) {
      await sleep(pollInterval);
      continue;
    }

    break;
  }

  if (!lastResponseContainer) {
    const responses = getAssistantResponses();
    lastResponseContainer = responses[responses.length - 1] || null;
  }

  if (!lastResponseContainer) {
    throw new Error("ChatGPT assistant response was not found");
  }

  const responseText = extractResponseText(lastResponseContainer);
  const sources = extractSources(lastResponseContainer);

  return {
    prompt,
    responseText,
    sources,
    timestamp: new Date().toISOString(),
  };
}

// Auto-invoke guard
if (globalThis.__ROME_CHATGPT_CHAT_AUTORUN__ !== false) {
  chatWithChatGPT().catch((err) => console.error(err));
}
