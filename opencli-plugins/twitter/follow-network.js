import { AuthRequiredError, CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  DEFAULT_FOLLOW_NETWORK_LIMIT,
  followVisibleNetworkUsers,
  inspectTwitterNetworkPage,
  normalizeFollowNetworkLimit,
  normalizeNetworkBatch,
  normalizeNetworkSource,
  normalizeTwitterUsername,
  twitterNetworkUrl,
  unwrapBrowserResult,
} from "./twitter-network-helpers.mjs";

const MAX_SCAN_ROUNDS = 100;
const MAX_STAGNANT_ROUNDS = 4;

cli({
  site: "twitter",
  name: "follow-network",
  access: "write",
  description: "Follow accounts from a Twitter/X user's followers or following page",
  example: "opencli twitter follow-network @realYunfanYe followers --limit 10 -f json",
  domain: "x.com",
  strategy: Strategy.UI,
  browser: true,
  args: [
    {
      name: "user",
      type: "string",
      positional: true,
      required: true,
      help: "Twitter/X handle whose network page should be followed (with or without @)",
    },
    {
      name: "source",
      type: "string",
      positional: true,
      required: true,
      choices: ["followers", "following"],
      help: "Which of the user's network pages to follow from",
    },
    {
      name: "limit",
      type: "int",
      default: DEFAULT_FOLLOW_NETWORK_LIMIT,
      help: "Maximum number of accounts to newly follow (default 50, max 500)",
    },
  ],
  columns: ["username", "name", "source", "status", "message"],
  func: async (page, kwargs) => {
    if (!page) {
      throw new CommandExecutionError("Browser session required for twitter follow-network");
    }

    // Validate every argument before touching browser or authentication state.
    const username = normalizeTwitterUsername(kwargs.user);
    const source = normalizeNetworkSource(kwargs.source);
    const limit = normalizeFollowNetworkLimit(kwargs.limit);

    const cookies = await page.getCookies({ url: "https://x.com" });
    const ct0 = cookies.find((cookie) => cookie.name === "ct0")?.value || null;
    if (!ct0) {
      throw new AuthRequiredError("x.com", "Not logged into x.com (no ct0 cookie)");
    }

    await page.goto(twitterNetworkUrl(username, source));
    await page.wait({ selector: '[data-testid="primaryColumn"]' });

    const followed = [];
    const seen = new Set();
    let stagnantRounds = 0;
    let sawCells = false;
    let sawContainer = false;

    for (
      let round = 0;
      round < MAX_SCAN_ROUNDS && followed.length < limit && stagnantRounds < MAX_STAGNANT_ROUNDS;
      round++
    ) {
      const batch = normalizeNetworkBatch(
        await page.evaluate(
          followVisibleNetworkUsers,
          [...seen],
          limit - followed.length,
          username,
          source,
        ),
      );
      if (!batch.route_matches) {
        throw new CommandExecutionError(
          `Twitter did not open @${username}'s requested ${source} page`,
        );
      }
      sawCells ||= batch.has_cells;
      sawContainer ||= batch.container_found;

      let newlyObserved = 0;
      for (const user of batch.observed) {
        const key = user.username.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        newlyObserved++;
      }
      for (const user of batch.followed) {
        followed.push({
          username: user.username,
          name: user.name,
          source,
          status: "success",
          message: `Successfully followed @${user.username} from @${username}'s ${source}.`,
        });
      }

      stagnantRounds = newlyObserved === 0 ? stagnantRounds + 1 : 0;
      if (followed.length >= limit || stagnantRounds >= MAX_STAGNANT_ROUNDS) break;
      await page.autoScroll({ times: 1, delayMs: 750 });
      await page.wait(1);
    }

    if (!sawCells || !sawContainer) {
      const state = unwrapBrowserResult(await page.evaluate(inspectTwitterNetworkPage));
      if (state?.auth_wall) {
        throw new AuthRequiredError("x.com", "Twitter redirected to a login wall");
      }
      if (state?.unavailable) {
        throw new CommandExecutionError(`Could not find Twitter/X user @${username}`);
      }
      if (state?.private_list) {
        throw new CommandExecutionError(
          `@${username}'s ${source} list is not available to this account`,
        );
      }
    }

    // Skipped accounts were already followed (or could not be verified). The
    // command intentionally returns only accounts newly followed in this run.
    return followed;
  },
});
