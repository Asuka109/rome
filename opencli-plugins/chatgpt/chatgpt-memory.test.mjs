import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMemorySummaryExtractionScript,
  buildOpenMemorySummaryScript,
  buildPersonalizationProbeScript,
  CHATGPT_MEMORY_URL,
  extractChatGPTMemorySummary,
  openChatGPTMemorySummary,
} from "./chatgpt-browser.mjs";
import { normalizeMemorySummaryPayload, unwrapEvaluateResult } from "./chatgpt-memory-helpers.mjs";

test("memory summary rows follow ChatGPT command output conventions", () => {
  const rows = normalizeMemorySummaryPayload({
    updated: " Updated 5 minutes ago ",
    sections: [
      { id: "overview", title: " Overview ", text: " Builds  AI products. " },
      { id: "engineering-preferences", title: "", text: " Uses TypeScript. " },
      { id: "overview", title: " Overview ", text: " Builds  AI products. " },
      { id: "empty", title: "Empty", text: "   " },
    ],
  });

  assert.deepEqual(rows, [
    {
      Index: 1,
      Section: "Overview",
      Text: "Builds AI products.",
      Updated: "Updated 5 minutes ago",
    },
    {
      Index: 2,
      Section: "Engineering Preferences",
      Text: "Uses TypeScript.",
      Updated: "Updated 5 minutes ago",
    },
  ]);
});

test("memory summary normalization unwraps Browser Bridge envelopes", () => {
  const envelope = {
    session: "site:chatgpt:memory",
    data: { updated: "", sections: [{ id: "overview", title: "Overview", text: "Hello" }] },
  };
  assert.deepEqual(unwrapEvaluateResult(envelope), envelope.data);
  assert.deepEqual(normalizeMemorySummaryPayload(envelope), [
    { Index: 1, Section: "Overview", Text: "Hello", Updated: null },
  ]);
});

test("memory summary normalization rejects malformed browser payloads", () => {
  assert.throws(() => normalizeMemorySummaryPayload(null), /malformed extraction payload/);
  assert.throws(
    () => normalizeMemorySummaryPayload({ sections: {} }),
    /malformed summary sections/,
  );
});

test("browser scripts are valid standalone page JavaScript", () => {
  assert.doesNotThrow(() => new Function(`return (${buildPersonalizationProbeScript()})`));
  assert.doesNotThrow(() => new Function(`return (${buildOpenMemorySummaryScript()})`));
  assert.doesNotThrow(() => new Function(`return (${buildMemorySummaryExtractionScript()})`));
});

test("browser orchestration navigates, opens Manage, waits, and unwraps extraction", async () => {
  const calls = [];
  const page = {
    goto: async (...args) => calls.push(["goto", ...args]),
    wait: async (...args) => calls.push(["wait", ...args]),
    evaluate: async (source) => {
      calls.push(["evaluate", source]);
      if (source === "window.location.href") return "https://chatgpt.com/new";
      if (source.startsWith("Boolean(document.querySelector")) return true;
      if (source === buildPersonalizationProbeScript()) {
        return {
          session: "site:chatgpt:memory",
          data: {
            auth_wall: false,
            personalization_found: true,
            personalization_selected: true,
            summary_open: false,
          },
        };
      }
      if (source === buildOpenMemorySummaryScript()) {
        return { clicked: true, summary_open: false, manage_found: true };
      }
      return {
        session: "site:chatgpt:memory",
        data: {
          dialog_found: true,
          updated: "Updated today",
          sections: [{ id: "overview", title: "Overview", text: "Summary" }],
        },
      };
    },
  };

  const state = await openChatGPTMemorySummary(page);
  assert.equal(state.manage_found, true);
  assert.ok(
    calls.some(
      ([kind, url, options]) =>
        kind === "goto" && url === CHATGPT_MEMORY_URL && options?.settleMs === 2000,
    ),
  );
  assert.ok(
    calls.some(
      ([kind, source]) =>
        kind === "evaluate" && source.includes('[data-about-you-section-description=\\"true\\"]'),
    ),
  );
  assert.deepEqual(await extractChatGPTMemorySummary(page), {
    dialog_found: true,
    updated: "Updated today",
    sections: [{ id: "overview", title: "Overview", text: "Summary" }],
  });
});

test("browser orchestration stops before Manage on an authentication wall", async () => {
  let evaluations = 0;
  const page = {
    goto: async () => {},
    wait: async () => {},
    evaluate: async (source) => {
      evaluations += 1;
      if (source === "window.location.href") return CHATGPT_MEMORY_URL;
      if (source.startsWith("Boolean(document.querySelector")) return true;
      return {
        auth_wall: true,
        personalization_found: false,
        personalization_selected: false,
        summary_open: false,
      };
    },
  };

  const state = await openChatGPTMemorySummary(page);
  assert.equal(state.auth_wall, true);
  assert.equal(evaluations, 3);
});
