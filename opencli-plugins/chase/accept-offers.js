import { AuthRequiredError, CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";

const CHASE_DOMAIN = "secure.chase.com";
const OFFERS_HUB_URL =
  "https://secure.chase.com/web/auth/dashboard#/dashboard/merchantOffers/offer-hub";
const MAX_ACCOUNT_PASSES = 20;

const COLUMNS = [
  "card",
  "last4",
  "merchant",
  "reward",
  "minimum_spend",
  "maximum_reward",
  "starts_at",
  "expires_at",
  "days_left",
  "categories",
  "locations",
  "status",
  "offer_id",
  "website",
  "details",
  "error",
];

function makeStatusRow(account, status, error = "") {
  return {
    card: account.displayName,
    last4: account.last4,
    merchant: "",
    reward: "",
    minimum_spend: null,
    maximum_reward: null,
    starts_at: null,
    expires_at: null,
    days_left: null,
    categories: "",
    locations: "",
    status,
    offer_id: "",
    website: "",
    details: "",
    error,
  };
}

function unwrapEvaluateResult(payload) {
  if (payload && typeof payload === "object" && "data" in payload && "session" in payload) {
    return payload.data;
  }
  return payload;
}

function buildPageReadinessScript(expectedCard = "") {
  return `(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const clean = (value) => String(value || "").replace(/\\s+/g, " ").trim();
    const expectedCard = ${JSON.stringify(expectedCard)};
    let previousOfferTiles = -1;
    let stableOfferTileChecks = 0;

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const href = location.href;
      const bodyText = clean(document.body?.innerText);
      const accountSelect = document.querySelector('[data-testid="select-credit-card-account"]');
      const selectedCard = clean(accountSelect?.innerText || accountSelect?.textContent);
      const signOut = Array.from(document.querySelectorAll("button, a"))
        .some((element) => /sign out/i.test(clean(element.textContent)));
      const loginInput = document.querySelector(
        'input[type="password"], input[name*="password" i], input[id*="password" i]'
      );
      const loggedOut = /\\/(logon|login|signin)(?:\\/|#|\\?|$)/i.test(href)
        || Boolean(loginInput)
        || (!signOut && /\\b(sign in|log in)\\b/i.test(bodyText));

      if (loggedOut) return { ok: false, authRequired: true, href };

      const cardMatches = !expectedCard || selectedCard === expectedCard;
      const offerTiles = document.querySelectorAll('[data-testid="commerce-tile"]').length;
      if (offerTiles === previousOfferTiles) stableOfferTileChecks += 1;
      else stableOfferTileChecks = 0;
      previousOfferTiles = offerTiles;
      const offerGrid = document.querySelector(
        '[data-testid="grid-items-container"], [data-testid="carousel-all-categories-grid-container"]'
      );
      const emptyState = /no (?:new )?offers|all (?:available )?offers (?:have been )?added|check back (?:again )?(?:soon|later)/i
        .test(bodyText);
      const offerError = /trouble with chase offers|unable to (?:load|get) (?:your )?offers/i
        .test(bodyText);

      // Chase paints the small curated carousel first and the complete offer grid later.
      // Waiting for the grid and a stable tile count prevents silently processing only
      // the first few offers on a card.
      if (
        accountSelect
        && cardMatches
        && (
          emptyState
          || (offerGrid && stableOfferTileChecks >= 4)
        )
      ) {
        return { ok: true, href, selectedCard, offerTiles, emptyState };
      }

      // The account picker is usable before the first account's offers finish loading.
      if (!expectedCard && accountSelect) {
        return { ok: true, href, selectedCard, offerTiles, emptyState };
      }

      if (offerError && attempt >= 20) {
        return {
          ok: false,
          href,
          error: "Chase could not load offers for this card. Try again in a few minutes.",
        };
      }
      await sleep(250);
    }

    return {
      ok: false,
      href: location.href,
      error: expectedCard
        ? "Timed out while loading Chase Offers for " + expectedCard + "."
        : "Timed out while loading the Chase Offers account picker.",
    };
  })()`;
}

const ACCOUNT_DISCOVERY_SCRIPT = `(async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const clean = (value) => String(value || "").replace(/\\s+/g, " ").trim();
  const select = document.querySelector('[data-testid="select-credit-card-account"]');
  if (!select) return { ok: false, error: "Could not find the Chase Offers account picker." };

  if (!document.querySelector('[role="option"]')) {
    select.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (document.querySelector('[role="option"]')) break;
      await sleep(100);
    }
  }

  const accounts = [];
  for (const option of document.querySelectorAll('[role="option"]')) {
    let fiber = null;
    const fiberKey = Object.keys(option).find((key) => key.startsWith("__reactFiber$"));
    if (fiberKey) fiber = option[fiberKey];

    let accountId = "";
    let displayName = clean(option.innerText || option.textContent);
    let hasCardArt = Boolean(option.querySelector("img"));
    for (let depth = 0; fiber && depth < 8; depth += 1, fiber = fiber.return) {
      const props = fiber.memoizedProps;
      if (!props || typeof props !== "object") continue;
      if (!accountId && typeof props.value === "string" && /^\\d+$/.test(props.value)) {
        accountId = props.value;
      }
      if (typeof props.displayValue === "string" && props.displayValue.trim()) {
        displayName = clean(props.displayValue);
      }
      if (props.mediaAsset) hasCardArt = true;
    }

    if (accountId && displayName && hasCardArt) {
      const last4Match = displayName.match(/(?:\\.\\.\\.|[x*•])\\s*(\\d{4})\\)?$/i);
      accounts.push({
        accountId,
        displayName,
        last4: last4Match ? last4Match[1] : "",
      });
    }
  }

  const unique = Array.from(new Map(accounts.map((account) => [account.accountId, account])).values());
  return unique.length
    ? { ok: true, accounts: unique }
    : { ok: false, error: "No Chase credit card accounts were available in the Offers account picker." };
})()`;

function buildPrepareAccountOffersScript(excludedOfferIds = []) {
  return `(async () => {
  const clean = (value) => String(value ?? "").replace(/[\\u00a0\\u202f]/g, " ").replace(/\\s+/g, " ").trim();
  const htmlToText = (html) => {
    if (!html) return "";
    const container = document.createElement("div");
    container.innerHTML = String(html).replace(/<br\\s*\\/?>(?=.)/gi, "\\n");
    return clean(container.textContent || container.innerText || "");
  };
  const readOffer = (tile) => {
    const fiberKey = Object.keys(tile).find((key) => key.startsWith("__reactFiber$"));
    let fiber = fiberKey ? tile[fiberKey] : null;
    for (let depth = 0; fiber && depth < 16; depth += 1, fiber = fiber.return) {
      const offer = fiber.memoizedProps?.moipMerchantOffer;
      if (offer) return offer;
    }
    return null;
  };
  const readOnClick = (tile) => {
    const propsKey = Object.keys(tile).find((key) => key.startsWith("__reactProps$"));
    const onClick = propsKey ? tile[propsKey]?.onClick : null;
    return typeof onClick === "function" ? onClick : null;
  };

  const selectedCard = clean(
    document.querySelector('[data-testid="select-credit-card-account"]')?.innerText
  );
  const seen = new Set();
  const excludedOfferIds = new Set(${JSON.stringify(excludedOfferIds)});
  const items = [];

  for (const tile of document.querySelectorAll('[data-testid="commerce-tile"]')) {
    const offer = readOffer(tile);
    if (!offer) continue;
    const offerId = clean(offer?.offerIdentifier || (tile.id.match(/[A-Z]+(?::[^:]+)*:\\d+(?::[^:]+)*/) || [])[0]);
    if (!offerId || seen.has(offerId) || excludedOfferIds.has(offerId)) continue;
    seen.add(offerId);

    const label = clean(tile.getAttribute("aria-label"));
    const target = tile.querySelector('[data-testid="commerce-tile-button"]');
    const onClick = readOnClick(tile);
    const offerStatus = clean(offer.offerStatusName).toUpperCase();
    const canActivate = offerStatus === "NEW"
      || offerStatus === "SERVED"
      || /add offer/i.test(label);
    if (!target || !onClick || !canActivate || offerStatus === "ACTIVATED") continue;

    const display = offer.offerDisplayDetails || {};
    const details = offer.offerDetails || {};
    const options = Array.isArray(details.offerOptions) ? details.offerOptions : [];
    const minimumSpend = options
      .map((option) => option?.minimumSpendingAmount)
      .filter(Number.isFinite)
      .reduce((lowest, amount) => lowest === null ? amount : Math.min(lowest, amount), null);
    const maximumReward = options
      .map((option) => option?.maximumRewardOfferAmount)
      .filter((amount) => Number.isFinite(amount) && amount > 0)
      .reduce((highest, amount) => highest === null ? amount : Math.max(highest, amount), null);
    const categories = Array.isArray(offer.offerCategories)
      ? offer.offerCategories.map((item) => clean(item?.offerCategoryName)).filter(Boolean)
      : [];
    const locations = Array.isArray(display.locationRestrictions)
      ? display.locationRestrictions.map((item) => clean(item?.locationName)).filter(Boolean)
      : [];

    items.push({
      tile,
      target,
      onClick,
      row: {
        merchant: clean(offer.merchantDetails?.merchantName || offer.title),
        reward: clean(display.offerHeaderText || offer.subtitle),
        minimum_spend: minimumSpend,
        maximum_reward: maximumReward,
        starts_at: details.offerStartTimestamp || null,
        expires_at: details.offerEndTimestamp || null,
        days_left: Number.isFinite(details.remainingDaysCount) ? details.remainingDaysCount : null,
        categories: categories.join(", "),
        locations: locations.join(", "),
        status: "pending",
        offer_id: offerId,
        website: display.links?.callToActionLink?.linkUrlText || "",
        details: htmlToText(
          display.rewardDescriptionText
          || display.termsAndConditionsText
          || display.marketingCopyText
        ),
        error: "",
      },
    });
  }

  window.__romeOpencliChaseOfferQueue = { selectedCard, items, index: 0 };
  return { ok: true, selectedCard, discovered: items.length };
})()`;
}

// Runtime.evaluate has a 30-second transport timeout. Keep batches small enough
// that even two slow/failed activations return before that deadline, while the
// happy path still runs back-to-back with no artificial delay.
const ACCEPT_ACCOUNT_OFFERS_BATCH_SCRIPT = `(async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const clean = (value) => String(value ?? "").replace(/[\\u00a0\\u202f]/g, " ").replace(/\\s+/g, " ").trim();
  const state = window.__romeOpencliChaseOfferQueue;
  if (!state || !Array.isArray(state.items)) {
    return { ok: false, error: "The prepared Chase offer queue is no longer available." };
  }
  const fakeClickEvent = (tile, target) => ({
    type: "click",
    target,
    currentTarget: tile,
    nativeEvent: {},
    button: 0,
    buttons: 1,
    detail: 1,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() {},
    isDefaultPrevented() { return this.defaultPrevented; },
    isPropagationStopped() { return false; },
    persist() {},
  });

  const rows = [];
  const batchEnd = Math.min(state.index + 2, state.items.length);
  while (state.index < batchEnd) {
    const item = state.items[state.index];
    state.index += 1;
    try {
      const maybePromise = item.onClick(fakeClickEvent(item.tile, item.target));
      if (maybePromise && typeof maybePromise.then === "function") await maybePromise;

      let outcome = "";
      let failure = "";
      for (let attempt = 0; attempt < 32; attempt += 1) {
        await sleep(250);
        const pageText = clean(document.querySelector("#content")?.innerText);
        const offerRoute = location.hash.includes(item.row.offer_id);
        const loggedOut = /\\/(logon|login|signin)(?:\\/|#|\\?|$)/i.test(location.href)
          || Boolean(document.querySelector('input[type="password"]'));
        if (loggedOut) {
          outcome = "auth-required";
          failure = "The Chase session expired while accepting offers.";
          break;
        }
        if (offerRoute && /added to card/i.test(pageText)) {
          outcome = "activated";
          break;
        }
        if (offerRoute && /already (?:added|activated)|offer (?:was|is) already/i.test(pageText)) {
          outcome = "already-added";
          break;
        }
        if (offerRoute && /unable to add|could not add|something went wrong|trouble with chase offers/i.test(pageText)) {
          outcome = "failed";
          failure = "Chase reported that the offer could not be added.";
          break;
        }
      }

      item.row.status = outcome || "failed";
      if (!outcome) item.row.error = "Timed out while waiting for Chase to confirm activation.";
      else if (failure) item.row.error = failure;
    } catch (error) {
      item.row.status = "failed";
      item.row.error = String(error?.message || error);
    }
    rows.push(item.row);
    if (item.row.status === "auth-required") break;
  }

  const remaining = state.items.length - state.index;
  if (remaining === 0) delete window.__romeOpencliChaseOfferQueue;
  return {
    ok: true,
    selectedCard: state.selectedCard,
    rows,
    remaining,
    total: state.items.length,
  };
})()`;

cli({
  site: "chase",
  name: "accept-offers",
  access: "write",
  description:
    "Accept every available Chase Offer on every signed-in credit card and return the offer details",
  example: "opencli chase accept-offers -f json",
  domain: CHASE_DOMAIN,
  strategy: Strategy.UI,
  browser: true,
  navigateBefore: false,
  defaultFormat: "json",
  args: [],
  columns: COLUMNS,
  func: async (page) => {
    if (!page) {
      throw new CommandExecutionError(
        "A browser session is required for chase accept-offers.",
        "Start the Rome browser, sign in to chase.com, and try again.",
      );
    }

    await page.goto(OFFERS_HUB_URL, { waitUntil: "none", settleMs: 500 });
    const initialState = unwrapEvaluateResult(await page.evaluate(buildPageReadinessScript()));
    if (initialState?.authRequired) {
      throw new AuthRequiredError(
        CHASE_DOMAIN,
        "Chase isn't signed in. Sign in to chase.com in the browser, then run chase accept-offers again.",
      );
    }
    if (!initialState?.ok) {
      throw new CommandExecutionError(
        initialState?.error || "Chase Offers did not finish loading.",
        "Open Chase Offers in the browser, confirm the page loads, and try again.",
      );
    }

    const discovery = unwrapEvaluateResult(await page.evaluate(ACCOUNT_DISCOVERY_SCRIPT));
    if (!discovery?.ok || !Array.isArray(discovery.accounts)) {
      throw new CommandExecutionError(
        discovery?.error || "Could not discover Chase credit card accounts.",
        "Open Chase Offers in the browser, confirm the account picker lists your cards, and try again.",
      );
    }

    const rows = [];
    let stopForAuth = false;

    for (const account of discovery.accounts) {
      const accountUrl = `${OFFERS_HUB_URL}?accountId=${encodeURIComponent(account.accountId)}`;
      const processedOfferIds = new Set();
      let offerRowsForAccount = 0;
      let accountComplete = false;

      for (let pass = 1; pass <= MAX_ACCOUNT_PASSES; pass += 1) {
        await page.goto(accountUrl, { waitUntil: "none", settleMs: 500 });
        const readiness = unwrapEvaluateResult(
          await page.evaluate(buildPageReadinessScript(account.displayName)),
        );
        if (readiness?.authRequired) {
          throw new AuthRequiredError(
            CHASE_DOMAIN,
            "The Chase session expired before all cards could be processed. Sign in to chase.com in the browser, then run chase accept-offers again.",
          );
        }
        if (!readiness?.ok) {
          rows.push(
            makeStatusRow(
              account,
              "failed",
              readiness?.error || "Chase Offers did not load for this card.",
            ),
          );
          accountComplete = true;
          break;
        }

        const prepared = unwrapEvaluateResult(
          await page.evaluate(buildPrepareAccountOffersScript([...processedOfferIds])),
        );
        if (!prepared?.ok || !Number.isInteger(prepared.discovered)) {
          rows.push(
            makeStatusRow(
              account,
              "failed",
              prepared?.error || "Chase returned an invalid offer queue for this card.",
            ),
          );
          accountComplete = true;
          break;
        }

        if (prepared.discovered === 0) {
          if (offerRowsForAccount === 0) rows.push(makeStatusRow(account, "no-new-offers"));
          accountComplete = true;
          break;
        }

        let remaining = prepared.discovered;
        let batchFailed = false;
        while (remaining > 0) {
          const batch = unwrapEvaluateResult(
            await page.evaluate(ACCEPT_ACCOUNT_OFFERS_BATCH_SCRIPT),
          );
          if (
            !batch?.ok ||
            !Array.isArray(batch.rows) ||
            !Number.isInteger(batch.remaining) ||
            batch.remaining >= remaining
          ) {
            rows.push(
              makeStatusRow(
                account,
                "failed",
                batch?.error || "Chase returned an invalid activation batch.",
              ),
            );
            batchFailed = true;
            break;
          }

          for (const row of batch.rows) {
            if (row.offer_id) processedOfferIds.add(row.offer_id);
            rows.push({ card: account.displayName, last4: account.last4, ...row });
            offerRowsForAccount += 1;
            if (row.status === "auth-required") stopForAuth = true;
          }
          remaining = batch.remaining;
          if (stopForAuth) break;
        }

        if (stopForAuth || batchFailed) {
          accountComplete = batchFailed;
          break;
        }
      }

      if (!accountComplete && !stopForAuth) {
        rows.push(
          makeStatusRow(
            account,
            "failed",
            `Chase kept revealing additional offers after ${MAX_ACCOUNT_PASSES} passes; rerun the command to continue.`,
          ),
        );
      }
      if (stopForAuth) break;
    }

    if (stopForAuth) {
      throw new AuthRequiredError(
        CHASE_DOMAIN,
        "The Chase session expired while accepting offers. Sign in to chase.com in the browser, then run chase accept-offers again.",
      );
    }

    return rows;
  },
});

export const __test__ = {
  unwrapEvaluateResult,
  buildPageReadinessScript,
  ACCOUNT_DISCOVERY_SCRIPT,
  buildPrepareAccountOffersScript,
  ACCEPT_ACCOUNT_OFFERS_BATCH_SCRIPT,
};
