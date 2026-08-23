import { CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  YELP_SEARCH_SORTS,
  YELP_SPONSORED_MODES,
  buildYelpSearchUrl,
  dedupeSearchRows,
  filterAndSortSearchRows,
  integerInRange,
  normalizeFeatures,
  normalizeOpenAt,
  normalizePriceLevels,
  normalizeSearchCandidate,
  normalizeServices,
  optionalNonNegativeInteger,
  optionalNumberInRange,
  requiredText,
} from "./yelp-helpers.mjs";
import {
  assertReadableYelpPage,
  extractYelpSearchCandidates,
  waitForYelpSelector,
} from "./yelp-browser.mjs";

function validationError(error) {
  throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
}

cli({
  site: "yelp",
  name: "search",
  access: "read",
  description:
    "Search Yelp businesses with location, category, availability, service, and quality filters",
  example:
    'opencli yelp search "coffee" --location "San Francisco, CA" --open-now --min-rating 4.5 --limit 5 -f json',
  domain: "yelp.com",
  strategy: Strategy.PUBLIC,
  browser: true,
  args: [
    {
      name: "query",
      type: "string",
      positional: true,
      required: true,
      help: 'What to find, for example "coffee", "plumber", or "tacos"',
    },
    {
      name: "location",
      type: "string",
      required: true,
      help: "City, neighborhood, address, or ZIP code to search near",
    },
    {
      name: "category",
      type: "string",
      help: "Optional Yelp category alias such as restaurants, coffee, or homecleaning",
    },
    {
      name: "prices",
      type: "string",
      help: "Comma-separated price levels: 1,2,3,4 (or $, $$, $$$, $$$$)",
    },
    {
      name: "services",
      type: "string",
      help: "Comma-separated services: delivery, takeout, reservations, waitlist",
    },
    {
      name: "features",
      type: "string",
      help: "Comma-separated features: outdoor-seating, wheelchair-accessible, dogs-allowed, good-for-kids, credit-cards, free-wifi",
    },
    {
      name: "open-now",
      type: "boolean",
      default: false,
      help: "Ask Yelp for businesses open now",
    },
    {
      name: "open-at",
      type: "string",
      help: "Ask Yelp for businesses open at an ISO date-time with timezone, for example 2026-07-14T19:00:00-07:00",
    },
    {
      name: "hot-and-new",
      type: "boolean",
      default: false,
      help: "Ask Yelp for hot and new businesses",
    },
    {
      name: "min-rating",
      type: "float",
      help: "Minimum displayed Yelp rating from 0 to 5 (client-side filter)",
    },
    {
      name: "min-reviews",
      type: "int",
      help: "Minimum displayed review count (client-side filter)",
    },
    {
      name: "sponsored",
      type: "string",
      default: "include",
      choices: YELP_SPONSORED_MODES,
      help: "Include, exclude, or return only sponsored results",
    },
    {
      name: "sort",
      type: "string",
      default: "recommended",
      choices: YELP_SEARCH_SORTS,
      help: "Sort by Yelp recommendation, rating, review count, or distance",
    },
    {
      name: "start",
      type: "int",
      default: 0,
      help: "Yelp result offset, as a non-negative multiple of 10",
    },
    {
      name: "limit",
      type: "int",
      default: 10,
      help: "Maximum businesses to return (1-50)",
    },
  ],
  columns: [
    "rank",
    "name",
    "rating",
    "review_count",
    "price",
    "categories",
    "neighborhood",
    "open_status",
    "services",
    "is_sponsored",
    "url",
  ],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError("Browser session required for yelp search");

    let query;
    let location;
    let prices;
    let services;
    let features;
    let openAt;
    let minRating;
    let minReviews;
    let start;
    let limit;
    try {
      query = requiredText(kwargs.query, "query");
      location = requiredText(kwargs.location, "location");
      prices = normalizePriceLevels(kwargs.prices);
      services = normalizeServices(kwargs.services);
      features = normalizeFeatures(kwargs.features);
      openAt = normalizeOpenAt(kwargs["open-at"]);
      minRating = optionalNumberInRange(kwargs["min-rating"], "min-rating", 0, 5);
      minReviews = optionalNonNegativeInteger(kwargs["min-reviews"], "min-reviews");
      start = optionalNonNegativeInteger(kwargs.start, "start") ?? 0;
      if (start % 10 !== 0) throw new Error("start must be a non-negative multiple of 10");
      limit = integerInRange(kwargs.limit, "limit", 1, 50);
      if (!YELP_SPONSORED_MODES.includes(kwargs.sponsored)) {
        throw new Error(`sponsored must be one of: ${YELP_SPONSORED_MODES.join(", ")}`);
      }
      if (!YELP_SEARCH_SORTS.includes(kwargs.sort)) {
        throw new Error(`sort must be one of: ${YELP_SEARCH_SORTS.join(", ")}`);
      }
      if (kwargs["open-now"] === true && openAt !== null) {
        throw new Error("open-now and open-at cannot be used together");
      }
    } catch (error) {
      validationError(error);
    }

    const hasClientFilters =
      minRating !== null || minReviews !== null || kwargs.sponsored !== "include";
    const maximumPages = hasClientFilters ? 5 : Math.ceil(limit / 10);
    const rows = [];
    let firstSourceUrl = "";
    let lastPayload = null;
    for (let pageIndex = 0; pageIndex < maximumPages; pageIndex++) {
      const sourceUrl = buildYelpSearchUrl({
        query,
        location,
        category: kwargs.category,
        prices,
        services,
        features,
        openNow: kwargs["open-now"] === true,
        openAt,
        hotAndNew: kwargs["hot-and-new"] === true,
        sort: kwargs.sort,
        start: start + pageIndex * 10,
      });
      if (!firstSourceUrl) firstSourceUrl = sourceUrl;
      await page.goto(sourceUrl);
      await waitForYelpSelector(page, '[data-testid="serp-ia-card"], main');
      const payload = await extractYelpSearchCandidates(page);
      lastPayload = payload;
      assertReadableYelpPage(payload, "business search");
      const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
      if (candidates.length === 0) break;
      const baseIndex = rows.length;
      rows.push(
        ...candidates.map((candidate, index) =>
          normalizeSearchCandidate(candidate, baseIndex + index, payload?.url || sourceUrl),
        ),
      );

      const eligible = filterAndSortSearchRows(dedupeSearchRows(rows), {
        minRating,
        minReviews,
        openNow: kwargs["open-now"] === true,
        sponsored: kwargs.sponsored,
        sort: kwargs.sort,
        limit,
      });
      if (eligible.length >= limit) break;
    }

    const uniqueRows = dedupeSearchRows(rows).filter((row) => row.name && row.url);
    if (uniqueRows.length === 0) {
      if (lastPayload?.no_results) {
        throw new CommandExecutionError(
          `Yelp returned no businesses for "${query}" near "${location}"`,
        );
      }
      throw new CommandExecutionError(
        `Yelp returned no readable businesses for "${query}" near "${location}"; inspect the browser for an interstitial`,
      );
    }
    const results = filterAndSortSearchRows(uniqueRows, {
      minRating,
      minReviews,
      openNow: kwargs["open-now"] === true,
      sponsored: kwargs.sponsored,
      sort: kwargs.sort,
      limit,
    });
    if (results.length === 0) {
      throw new CommandExecutionError(
        `Yelp exposed ${uniqueRows.length} businesses, but none matched the requested filters`,
      );
    }
    return results.map((row) => ({ ...row, source_url: row.source_url || firstSourceUrl }));
  },
});
