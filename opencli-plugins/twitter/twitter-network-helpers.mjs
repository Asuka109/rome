import { ArgumentError, CommandExecutionError } from "@jackwener/opencli/errors";

const TWITTER_USERNAME_RE = /^[A-Za-z0-9_]{1,15}$/;
const NETWORK_SOURCES = new Set(["followers", "following"]);

export const DEFAULT_FOLLOW_NETWORK_LIMIT = 50;
export const MAX_FOLLOW_NETWORK_LIMIT = 500;

export function normalizeTwitterUsername(value) {
  const username = String(value ?? "")
    .trim()
    .replace(/^@+/, "");
  if (!TWITTER_USERNAME_RE.test(username)) {
    throw new ArgumentError(
      "twitter follow-network user must be a valid Twitter/X handle",
      "Example: opencli twitter follow-network @realYunfanYe followers --limit 10",
    );
  }
  return username;
}

export function normalizeNetworkSource(value) {
  const source = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!NETWORK_SOURCES.has(source)) {
    throw new ArgumentError(
      'twitter follow-network source must be either "followers" or "following"',
      "Example: opencli twitter follow-network @realYunfanYe following --limit 10",
    );
  }
  return source;
}

export function normalizeFollowNetworkLimit(value) {
  const limit =
    value === undefined || value === null || value === ""
      ? DEFAULT_FOLLOW_NETWORK_LIMIT
      : Number(value);
  if (!Number.isInteger(limit) || limit <= 0 || limit > MAX_FOLLOW_NETWORK_LIMIT) {
    throw new ArgumentError(
      `twitter follow-network --limit must be an integer between 1 and ${MAX_FOLLOW_NETWORK_LIMIT}`,
    );
  }
  return limit;
}

export function twitterNetworkUrl(username, source) {
  return `https://x.com/${username}/${source}`;
}

export function unwrapBrowserResult(value) {
  if (
    value &&
    typeof value === "object" &&
    typeof value.session === "string" &&
    Object.prototype.hasOwnProperty.call(value, "data")
  ) {
    return value.data;
  }
  return value;
}

export function normalizeNetworkBatch(value) {
  const payload = unwrapBrowserResult(value);
  if (
    !payload ||
    payload.ok !== true ||
    !Array.isArray(payload.observed) ||
    !Array.isArray(payload.followed)
  ) {
    throw new CommandExecutionError("Twitter follow-network extraction returned malformed rows");
  }

  const normalizeRows = (rows) =>
    rows.map((row) => {
      const username = String(row?.username ?? "").trim();
      if (!TWITTER_USERNAME_RE.test(username)) {
        throw new CommandExecutionError("Twitter follow-network extracted an invalid username");
      }
      return {
        username,
        name: String(row?.name ?? "").trim() || username,
      };
    });

  return {
    observed: normalizeRows(payload.observed),
    followed: normalizeRows(payload.followed),
    has_cells: payload.has_cells === true,
    container_found: payload.container_found === true,
    route_matches: payload.route_matches === true,
  };
}

// Runs inside x.com through page.evaluate(). Keep every dependency inside the
// function so OpenCLI can serialize it into the browser page context.
export async function followVisibleNetworkUsers(
  seenUsernames,
  remaining,
  expectedUsername,
  expectedSource,
) {
  const seen = new Set(
    (Array.isArray(seenUsernames) ? seenUsernames : []).map((username) =>
      String(username).toLowerCase(),
    ),
  );
  const observed = [];
  const followed = [];
  const normalizedPath = window.location.pathname.replace(/\/+$/, "").toLowerCase();
  const usernamePath = String(expectedUsername).toLowerCase();
  const allowedPaths =
    expectedSource === "followers"
      ? [`/${usernamePath}/followers`, `/${usernamePath}/verified_followers`]
      : [`/${usernamePath}/following`];
  const routeMatches = allowedPaths.includes(normalizedPath);
  if (!routeMatches) {
    return {
      ok: true,
      observed,
      followed,
      has_cells: false,
      container_found: false,
      route_matches: false,
    };
  }

  // UserCell is also used by sidebar and recommendation modules. Only the
  // timeline region inside primaryColumn represents the requested network.
  // Requiring both boundaries before collecting cells prevents this write
  // command from acting on an unrelated "Who to follow" widget.
  const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
  const networkRegion = primaryColumn?.querySelector('section[role="region"]') || null;
  const cellSelector = '[data-testid="cellInnerDiv"] [data-testid="UserCell"]';
  const cells = networkRegion ? Array.from(networkRegion.querySelectorAll(cellSelector)) : [];

  const readUser = (cell) => {
    let username = "";
    const avatar = cell.querySelector('[data-testid^="UserAvatar-Container-"]');
    const avatarTestId = avatar?.getAttribute("data-testid") || "";
    if (avatarTestId.startsWith("UserAvatar-Container-")) {
      username = avatarTestId.slice("UserAvatar-Container-".length);
    }

    const rawLines = (cell.innerText || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!username) {
      const handleLine = rawLines.find((line) => /^@[A-Za-z0-9_]{1,15}(?:\s|$)/.test(line));
      username = handleLine ? handleLine.slice(1).split(/\s/)[0] : "";
    }
    if (!/^[A-Za-z0-9_]{1,15}$/.test(username)) return null;

    const stripTexts = new Set();
    for (const element of cell.querySelectorAll(
      '[data-testid$="-follow"],[data-testid$="-unfollow"],[data-testid="userFollowIndicator"]',
    )) {
      const text = (element.innerText || element.textContent || "").trim();
      if (text) stripTexts.add(text);
    }
    const name =
      rawLines.find((line) => !line.startsWith("@") && !stripTexts.has(line)) || username;
    return { username, name };
  };

  const findCell = (username, fallback) => {
    if (fallback?.isConnected) return fallback;
    const key = username.toLowerCase();
    return (
      Array.from(networkRegion.querySelectorAll(cellSelector)).find(
        (candidate) => readUser(candidate)?.username.toLowerCase() === key,
      ) || null
    );
  };

  for (const cell of cells) {
    const user = readUser(cell);
    if (!user) continue;
    const key = user.username.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    observed.push(user);

    if (followed.length >= remaining) continue;
    const followButton = cell.querySelector('[data-testid$="-follow"]');
    if (
      !followButton ||
      followButton.disabled ||
      followButton.getAttribute("aria-disabled") === "true"
    ) {
      continue;
    }

    followButton.click();
    let verified = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const currentCell = findCell(user.username, cell);
      if (currentCell?.querySelector('[data-testid$="-unfollow"]')) {
        verified = true;
        break;
      }
    }
    if (verified) {
      followed.push(user);
      // Give X a short interval to settle before the next inline click. This is
      // still substantially faster than navigating to every profile.
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return {
    ok: true,
    observed,
    followed,
    has_cells: cells.length > 0,
    container_found: Boolean(networkRegion),
    route_matches: true,
  };
}

export function inspectTwitterNetworkPage() {
  const text = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
  const pathname = window.location.pathname;
  return {
    auth_wall: pathname.startsWith("/login") || Boolean(document.querySelector('a[href="/login"]')),
    unavailable: /this account doesn.?t exist|account suspended/i.test(text),
    private_list: /followers are private|following list is private|these posts are protected/i.test(
      text,
    ),
  };
}
