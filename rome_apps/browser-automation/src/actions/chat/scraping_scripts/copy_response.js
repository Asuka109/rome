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

async function copyLatestChatGPTResponse() {
  const responses = getAssistantResponses();
  const latestResponse = responses[responses.length - 1] || null;
  if (!latestResponse) {
    return { copyConfirmed: false };
  }

  revealArticleActions(latestResponse);
  await sleep(200);

  const copyButton = getCopyButton(latestResponse);
  if (!copyButton) {
    return { copyConfirmed: false };
  }

  copyButton.scrollIntoView({ block: "center", inline: "nearest" });
  await sleep(1000);
  copyButton.click();

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const currentButton = getCopyButton(latestResponse);
    if (currentButton?.getAttribute("aria-label") === "Response copied") {
      return { copyConfirmed: true };
    }

    await sleep(200);
  }

  return { copyConfirmed: false };
}

if (globalThis.__ROME_CHATGPT_COPY_RESPONSE_AUTORUN__ !== false) {
  copyLatestChatGPTResponse().catch((err) => console.error(err));
}
