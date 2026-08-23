function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAssistantResponses() {
  const articles = Array.from(document.querySelectorAll("article")).filter((article) =>
    article.querySelector('[data-message-author-role="assistant"]'),
  );
  if (articles.length > 0) {
    return articles;
  }

  const headings = Array.from(document.querySelectorAll("h4"));
  const responses = [];
  for (const h4 of headings) {
    if (h4.textContent?.trim() === "ChatGPT said:") {
      const responseContainer = h4.nextElementSibling;
      if (responseContainer) {
        responses.push(responseContainer);
      }
    }
  }

  return responses;
}

function getCopyButton(container) {
  const selectors = ['button[aria-label="Copy response"]', 'button[aria-label="Response copied"]'];

  if (container) {
    for (const selector of selectors) {
      const button = container.querySelector(selector);
      if (button) {
        return button;
      }
    }

    const parent = container.parentElement;
    if (parent) {
      for (const selector of selectors) {
        const button = parent.querySelector(selector);
        if (button) {
          return button;
        }
      }
    }
  }

  for (const selector of selectors) {
    const buttons = document.querySelectorAll(selector);
    if (buttons.length > 0) {
      return buttons[buttons.length - 1];
    }
  }

  return null;
}

function revealArticleActions(container) {
  container.scrollIntoView({ block: "center", inline: "nearest" });
  const target = container.parentElement || container;
  for (const eventName of ["mouseenter", "mouseover", "mousemove"]) {
    target.dispatchEvent(
      new MouseEvent(eventName, {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
  }
}

function isResponseComplete(container) {
  if (getCopyButton(container)) {
    return true;
  }

  if (container) {
    const thumbs =
      container.querySelector('button[aria-label="Good response"]') ||
      container.querySelector('button[aria-label="Bad response"]');
    if (thumbs) {
      return true;
    }
  }

  const parent = container?.parentElement;
  if (parent) {
    const shareBtn = parent.querySelector('button[aria-label="Share"]');
    if (shareBtn) {
      return true;
    }
  }

  return false;
}

async function waitForLatestChatGPTResponseComplete(options = {}) {
  const timeout =
    typeof options.timeout === "number" && options.timeout > 0 ? options.timeout : 5000;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const responses = getAssistantResponses();
    const latestResponse = responses[responses.length - 1] || null;
    if (!latestResponse) {
      await sleep(200);
      continue;
    }

    revealArticleActions(latestResponse);
    if (isResponseComplete(latestResponse)) {
      return { complete: true };
    }

    await sleep(200);
  }

  return { complete: false };
}

if (globalThis.__ROME_CHATGPT_CHECK_RESPONSE_COMPLETE_AUTORUN__ !== false) {
  waitForLatestChatGPTResponseComplete().catch((err) => console.error(err));
}
