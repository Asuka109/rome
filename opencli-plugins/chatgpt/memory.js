import {
  AuthRequiredError,
  CommandExecutionError,
  EmptyResultError,
} from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import { extractChatGPTMemorySummary, openChatGPTMemorySummary } from "./chatgpt-browser.mjs";
import { normalizeMemorySummaryPayload } from "./chatgpt-memory-helpers.mjs";

cli({
  site: "chatgpt",
  name: "memory",
  access: "read",
  description: "Read ChatGPT's Memory summary from Personalization settings",
  example: "opencli chatgpt memory -f json",
  domain: "chatgpt.com",
  strategy: Strategy.COOKIE,
  browser: true,
  siteSession: "persistent",
  navigateBefore: false,
  args: [],
  columns: ["Index", "Section", "Text", "Updated"],
  func: async (page) => {
    if (!page) throw new CommandExecutionError("Browser session required for chatgpt memory");

    let state;
    try {
      state = await openChatGPTMemorySummary(page);
    } catch (error) {
      throw new CommandExecutionError(
        `ChatGPT could not open Personalization > Memory summary: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    if (state.auth_wall) {
      throw new AuthRequiredError(
        "chatgpt.com",
        "ChatGPT memory requires an active signed-in ChatGPT browser session.",
      );
    }
    if (!state.personalization_found) {
      throw new CommandExecutionError(
        "ChatGPT Personalization settings were not available in the current account.",
      );
    }
    if (!state.manage_found) {
      const detail = state.memory_summary_visible
        ? "The Memory summary Manage control was not available."
        : "Memory summary was not available in Personalization settings.";
      throw new CommandExecutionError(detail);
    }

    let payload;
    try {
      payload = await extractChatGPTMemorySummary(page);
    } catch (error) {
      throw new CommandExecutionError(
        `ChatGPT could not read Memory summary: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    if (!payload?.dialog_found) {
      throw new CommandExecutionError(
        "ChatGPT opened the Memory summary control, but its summary dialog did not appear.",
      );
    }

    let rows;
    try {
      rows = normalizeMemorySummaryPayload(payload);
    } catch (error) {
      throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
    }
    if (!rows.length) {
      throw new EmptyResultError(
        "chatgpt memory",
        "ChatGPT's Memory summary contained no readable sections.",
      );
    }
    return rows;
  },
});
