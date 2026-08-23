// Overrides clis/linkedin/thread-snapshot.js from @yunfanye/opencli 1.8.7.
// Keep the API URL discovery in sync when upstream changes LinkedIn messaging queries.
import { ArgumentError, AuthRequiredError, CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  DEFAULT_THREAD_MESSAGE_LIMIT,
  LINKEDIN_MESSAGING_URL,
  MAX_THREAD_MESSAGE_LIMIT,
  canonicalizeLinkedInThreadUrl,
  countThreadMessagesInPayload,
  discoverOlderThreadApi,
  fetchLinkedInConversationApi,
  fetchLinkedInThreadApi,
  inspectLinkedInThreadPage,
  isThreadConversationApiUrl,
  isThreadMessageApiUrl,
  linkedInThreadId,
  normalizeThreadMessageLimit,
  parseThreadMessagePayloads,
  unwrapThreadBrowserResult,
  validateThreadConversationPayload,
} from "./thread-snapshot-helpers.mjs";

const LINKEDIN_DOMAIN = "www.linkedin.com";
const MAX_API_DISCOVERY_ROUNDS = Math.ceil(MAX_THREAD_MESSAGE_LIMIT / 20) + 3;

function requireThreadUrl(value) {
  const threadUrl = canonicalizeLinkedInThreadUrl(value);
  if (!threadUrl) {
    throw new ArgumentError(
      "--thread-url must be an exact https://www.linkedin.com/messaging/thread/<id>/ URL",
    );
  }
  return threadUrl;
}

async function readThreadProbe(page, threadId) {
  return unwrapThreadBrowserResult(await page.evaluate(inspectLinkedInThreadPage, threadId));
}

async function waitForThreadProbe(page, threadId) {
  let probe = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    probe = await readThreadProbe(page, threadId);
    if (probe?.auth_wall || probe?.initial_url) return probe;
    await page.wait(1);
  }
  return probe;
}

function requireCurrentThread(probe, expectedUrl) {
  if (probe?.auth_wall) {
    throw new AuthRequiredError(
      LINKEDIN_DOMAIN,
      "LinkedIn thread-snapshot requires an active signed-in LinkedIn browser session.",
    );
  }
  const actualUrl = canonicalizeLinkedInThreadUrl(probe?.current_url || "");
  if (!actualUrl || actualUrl !== expectedUrl) {
    throw new CommandExecutionError(
      "LinkedIn thread-snapshot blocked: thread_url_mismatch",
      `Expected ${expectedUrl}; actual ${actualUrl || probe?.current_url || "not_available"}`,
    );
  }
  return actualUrl;
}

async function fetchThreadPayload(page, apiUrl, csrf, threadId) {
  if (!isThreadMessageApiUrl(apiUrl, threadId)) {
    throw new CommandExecutionError(
      "LinkedIn thread-snapshot blocked an API response for a different thread",
    );
  }
  const response = unwrapThreadBrowserResult(
    await page.evaluate(fetchLinkedInThreadApi, apiUrl, csrf),
  );
  if (response?.auth_required) {
    throw new AuthRequiredError(
      LINKEDIN_DOMAIN,
      `LinkedIn messaging API authentication failed: ${response.error || "access denied"}`,
    );
  }
  if (!response?.json || response.error) {
    throw new CommandExecutionError(
      `LinkedIn messaging API returned an unexpected response: ${response?.error || "no data"}`,
    );
  }
  if (!Array.isArray(response.json.included)) {
    throw new CommandExecutionError(
      "LinkedIn messaging API returned a malformed normalized payload",
    );
  }
  return response.json;
}

async function fetchConversationPayload(page, apiUrl, csrf, threadId) {
  if (!isThreadConversationApiUrl(apiUrl)) {
    throw new CommandExecutionError("LinkedIn thread-snapshot blocked an unsafe conversation URL");
  }
  const response = unwrapThreadBrowserResult(
    await page.evaluate(fetchLinkedInConversationApi, apiUrl, csrf, threadId),
  );
  if (response?.auth_required) {
    throw new AuthRequiredError(
      LINKEDIN_DOMAIN,
      `LinkedIn messaging API authentication failed: ${response.error || "access denied"}`,
    );
  }
  if (!response?.json || response.error) {
    throw new CommandExecutionError(
      `LinkedIn conversation API returned an unexpected response: ${response?.error || "no data"}`,
    );
  }
  try {
    return validateThreadConversationPayload(response.json, threadId);
  } catch (error) {
    throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
  }
}

cli({
  site: "linkedin",
  name: "thread-snapshot",
  access: "read",
  description: "Return the latest messages and sender metadata from one LinkedIn thread",
  example:
    "opencli linkedin thread-snapshot --thread-url https://www.linkedin.com/messaging/thread/<id>/ --limit 20 -f json",
  domain: LINKEDIN_DOMAIN,
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    {
      name: "thread-url",
      type: "string",
      required: true,
      help: "Exact LinkedIn messaging thread URL to read",
    },
    {
      name: "limit",
      type: "int",
      default: DEFAULT_THREAD_MESSAGE_LIMIT,
      help: `Latest messages to return (1-${MAX_THREAD_MESSAGE_LIMIT})`,
    },
  ],
  columns: [
    "thread_url",
    "thread_id",
    "conversation_name",
    "conversation_title",
    "conversation_is_group",
    "participant_count",
    "returned_index",
    "returned_message_count",
    "message_id",
    "sent_at",
    "sender_name",
    "sender_type",
    "sender_profile_url",
    "sender_headline",
    "sender_is_self",
    "text",
    "subject",
    "reaction_count",
    "is_latest",
  ],
  func: async (page, kwargs) => {
    if (!page) {
      throw new CommandExecutionError("Browser session required for linkedin thread-snapshot");
    }

    const threadUrl = requireThreadUrl(kwargs["thread-url"]);
    const threadId = linkedInThreadId(threadUrl);
    let limit;
    try {
      limit = normalizeThreadMessageLimit(kwargs.limit);
    } catch (error) {
      throw new ArgumentError(error instanceof Error ? error.message : String(error));
    }

    await page.goto(LINKEDIN_MESSAGING_URL);
    await page.wait(4);
    await page.goto(threadUrl);
    await page.wait(4);

    const probe = await waitForThreadProbe(page, threadId);
    requireCurrentThread(probe, threadUrl);
    if (!probe?.initial_url) {
      throw new CommandExecutionError(
        "LinkedIn did not issue a message request for the requested thread.",
      );
    }

    const cookies = await page.getCookies({ url: "https://www.linkedin.com" });
    const jsession = cookies.find((cookie) => cookie.name === "JSESSIONID")?.value;
    if (!jsession) {
      throw new AuthRequiredError(
        LINKEDIN_DOMAIN,
        "LinkedIn JSESSIONID cookie not found. Please sign in to LinkedIn.",
      );
    }
    const csrf = jsession.replace(/^"|"$/g, "");
    const payloads = [];
    const fetchedUrls = new Set();

    for (const apiUrl of Array.isArray(probe.conversation_urls) ? probe.conversation_urls : []) {
      try {
        const conversationPayload = await fetchConversationPayload(page, apiUrl, csrf, threadId);
        if (conversationPayload) {
          payloads.push(conversationPayload);
          break;
        }
      } catch (error) {
        if (error instanceof AuthRequiredError) throw error;
        if (!(error instanceof CommandExecutionError)) throw error;
        // Performance entries can be stale. Optional metadata must not block message retrieval.
      }
    }

    const consume = async (apiUrl) => {
      if (!apiUrl || fetchedUrls.has(apiUrl)) return { added: 0, fetched: false };
      fetchedUrls.add(apiUrl);
      const payload = await fetchThreadPayload(page, apiUrl, csrf, threadId);
      payloads.push(payload);
      return { added: countThreadMessagesInPayload(payload, threadId), fetched: true };
    };

    await consume(probe.initial_url);
    let exhausted = false;
    for (const pageUrl of Array.isArray(probe.page_urls) ? probe.page_urls : []) {
      if (parseThreadMessagePayloads(payloads, { threadId, threadUrl, limit }).length >= limit) {
        break;
      }
      const result = await consume(pageUrl);
      if (result.fetched && result.added === 0) {
        exhausted = true;
        break;
      }
    }

    for (let round = 0; round < MAX_API_DISCOVERY_ROUNDS && !exhausted; round += 1) {
      const before = parseThreadMessagePayloads(payloads, { threadId, threadUrl, limit });
      if (before.length >= limit) break;
      const discovered = unwrapThreadBrowserResult(
        await page.evaluate(discoverOlderThreadApi, threadId, [...fetchedUrls]),
      );
      if (!discovered?.message_list_found) {
        throw new CommandExecutionError("LinkedIn did not render the active thread message list.");
      }
      if (!discovered.api_url) break;
      const result = await consume(discovered.api_url);
      if (!result.fetched || result.added === 0) {
        exhausted = true;
        break;
      }
      const after = parseThreadMessagePayloads(payloads, { threadId, threadUrl, limit });
      if (after.length <= before.length) break;
    }

    try {
      return parseThreadMessagePayloads(payloads, { threadId, threadUrl, limit });
    } catch (error) {
      throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
    }
  },
});
