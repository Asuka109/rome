import { unwrapEvaluateResult } from "./chatgpt-memory-helpers.mjs";

export const CHATGPT_MEMORY_URL = "https://chatgpt.com/#settings/Personalization";

function cleanFunctionSource() {
  return String.raw`function clean(value) {
    return typeof value === "string"
      ? value.replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ").trim()
      : "";
  }`;
}

function memoryDialogFunctionSource() {
  return String.raw`function findMemoryDialog() {
    return Array.from(document.querySelectorAll("[role=dialog]")).find(function(candidate) {
      var heading = candidate.querySelector("h1, h2");
      return /^(?:Memory summary|记忆摘要)$/i.test(clean(heading && heading.textContent));
    }) || null;
  }`;
}

export function buildPersonalizationProbeScript() {
  return String.raw`(function() {
    ${cleanFunctionSource()}
    ${memoryDialogFunctionSource()}
    function isVisible(node) {
      if (!node || typeof node.getBoundingClientRect !== "function") return false;
      var style = window.getComputedStyle(node);
      var rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden"
        && rect.width > 0 && rect.height > 0;
    }

    var controls = Array.from(document.querySelectorAll("a, button"));
    var loginControl = controls.find(function(node) {
      var label = clean((node.textContent || "") + " " + (node.getAttribute("aria-label") || ""));
      return isVisible(node) && /^(?:log in|login|sign in|sign up)$/i.test(label);
    });
    var authWall = /(?:^|\.)auth\.openai\.com$/i.test(location.hostname || "")
      || /^\/(?:auth|login)(?:\/|$)/i.test(location.pathname || "")
      || Boolean(loginControl);
    var tab = document.querySelector('[data-testid="personalization-tab"]');
    var selected = Boolean(tab && tab.getAttribute("aria-selected") === "true");
    if (tab && !selected && typeof tab.click === "function") tab.click();

    return {
      current_url: location.href || "",
      auth_wall: authWall,
      personalization_found: Boolean(tab),
      personalization_selected: selected,
      summary_open: Boolean(findMemoryDialog()),
    };
  })()`;
}

export function buildOpenMemorySummaryScript() {
  return String.raw`(function() {
    ${cleanFunctionSource()}
    ${memoryDialogFunctionSource()}
    if (findMemoryDialog()) {
      return { clicked: false, summary_open: true, manage_found: true };
    }

    var tab = document.querySelector('[data-testid="personalization-tab"]');
    var panelId = tab && tab.getAttribute("aria-controls");
    var scope = (panelId && document.getElementById(panelId))
      || document.querySelector('[role="tabpanel"][data-state="active"]')
      || document;
    var buttons = Array.from(scope.querySelectorAll("button"));
    var matches = buttons.filter(function(node) {
      return /^(?:Manage|管理)$/i.test(clean(node.textContent));
    });
    var button = matches[0] || null;
    if (matches.length > 1) {
      button = matches.find(function(candidate) {
        var parent = candidate.parentElement;
        while (parent && parent !== scope) {
          if (/Memory summary|记忆摘要/i.test(clean(parent.innerText))) return true;
          parent = parent.parentElement;
        }
        return false;
      }) || button;
    }
    if (!button) {
      return {
        clicked: false,
        summary_open: false,
        manage_found: false,
        memory_summary_visible: /Memory summary|记忆摘要/i.test(clean(scope.innerText)),
      };
    }

    button.click();
    return { clicked: true, summary_open: false, manage_found: true };
  })()`;
}

export function buildMemorySummaryExtractionScript() {
  return String.raw`(function() {
    ${cleanFunctionSource()}
    ${memoryDialogFunctionSource()}
    var dialog = findMemoryDialog();
    if (!dialog) {
      return { dialog_found: false, updated: "", sections: [] };
    }

    var container = dialog.querySelector('[data-testid="about-you-sections-scroll-container"]');
    var sections = Array.from(container
      ? container.querySelectorAll(
          '[data-about-you-summary-section="true"], section[data-testid^="about-you-section-"]'
        )
      : []
    ).map(function(section) {
      var id = clean(section.getAttribute("data-about-you-summary-section-id"));
      if (!id) {
        id = clean(section.getAttribute("data-testid")).replace(/^about-you-section-/, "");
      }
      var heading = section.querySelector("h3");
      var description = section.querySelector(
        '[data-about-you-section-description="true"], [data-testid^="about-you-section-description-"]'
      );
      return {
        id: id,
        title: clean(heading && heading.textContent),
        text: clean(description && description.textContent),
      };
    }).filter(function(section) {
      return Boolean(section.text);
    });
    var updatedNode = Array.from(dialog.querySelectorAll("header span")).find(function(node) {
      return Boolean(clean(node.textContent));
    });

    return {
      dialog_found: true,
      updated: clean(updatedNode && updatedNode.textContent),
      sections: sections,
    };
  })()`;
}

function requireObject(value, label) {
  const result = unwrapEvaluateResult(value);
  if (!result || Array.isArray(result) || typeof result !== "object") {
    throw new Error(`${label} returned a malformed browser payload`);
  }
  return result;
}

async function waitForSelector(page, selector, attempts = 48) {
  const source = `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if (unwrapEvaluateResult(await page.evaluate(source)) === true) return true;
    } catch {
      // The renderer can briefly replace its execution context while the hash route mounts.
    }
    await page.wait(0.25);
  }
  return false;
}

async function waitForPersonalization(page) {
  return waitForSelector(page, '[data-testid="personalization-tab"]');
}

async function waitForMemorySummary(page) {
  return waitForSelector(
    page,
    '[data-about-you-section-description="true"], [data-testid^="about-you-section-description-"]',
  );
}

export async function openChatGPTMemorySummary(page) {
  const currentUrl = unwrapEvaluateResult(
    await page.evaluate("window.location.href").catch(() => ""),
  );
  if (currentUrl !== CHATGPT_MEMORY_URL) {
    await page.goto(CHATGPT_MEMORY_URL, { settleMs: 2000 });
  }
  await waitForPersonalization(page);

  const probe = requireObject(
    await page.evaluate(buildPersonalizationProbeScript()),
    "ChatGPT personalization probe",
  );
  if (probe.auth_wall) return probe;
  if (!probe.personalization_selected && probe.personalization_found) await page.wait(0.5);
  if (probe.summary_open) {
    await waitForMemorySummary(page);
    return { ...probe, manage_found: true };
  }

  const opened = requireObject(
    await page.evaluate(buildOpenMemorySummaryScript()),
    "ChatGPT memory control",
  );
  if (opened.clicked || opened.summary_open) await waitForMemorySummary(page);
  return { ...probe, ...opened };
}

export async function extractChatGPTMemorySummary(page) {
  return unwrapEvaluateResult(await page.evaluate(buildMemorySummaryExtractionScript()));
}
