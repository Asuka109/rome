import { ArgumentError, CommandExecutionError, EmptyResultError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  OPENTABLE_FEATURE_OPTIONS,
  OPENTABLE_SEARCH_SORTS,
  OPENTABLE_SEATING_OPTIONS,
  dedupeSearchRows,
  filterAndSortSearchRows,
  integerInRange,
  normalizeDate,
  normalizeFeatures,
  normalizePriceLevels,
  normalizeSearchCandidate,
  normalizeSeating,
  normalizeTime,
  openTableFilterLabels,
  optionalNonNegativeInteger,
  optionalNumberInRange,
  parseDelimitedList,
  requiredText,
} from "./opentable-helpers.mjs";
import {
  applyOpenTableFilterLabels,
  loadOpenTableSearchCandidates,
  navigateOpenTableSearch,
} from "./opentable-browser.mjs";

function argumentError(error) {
  throw new ArgumentError(error instanceof Error ? error.message : String(error));
}

cli({
  site: "opentable",
  name: "search",
  access: "read",
  description:
    "Find OpenTable restaurants by place, date, time, party size, availability, and dining preferences",
  example:
    'opencli opentable search italian --location "San Francisco, CA" --date 2026-07-18 --time 19:00 --party-size 2 --prices 2,3 --seating outdoor --limit 10 -f json',
  domain: "opentable.com",
  strategy: Strategy.PUBLIC,
  browser: true,
  args: [
    {
      name: "query",
      type: "string",
      positional: true,
      help: "Optional restaurant name, cuisine, dish, occasion, or free-text preference",
    },
    {
      name: "location",
      type: "string",
      required: true,
      help: "City, neighborhood, landmark, address, or postal code",
    },
    {
      name: "date",
      type: "string",
      required: true,
      help: "Reservation date in YYYY-MM-DD format",
    },
    {
      name: "time",
      type: "string",
      default: "19:00",
      help: "Preferred local time in 24-hour HH:MM format on a 15-minute boundary",
    },
    {
      name: "party-size",
      type: "int",
      default: 2,
      help: "Number of diners (1-20)",
    },
    {
      name: "cuisines",
      type: "string",
      help: "Comma-separated visible OpenTable cuisine names, for example Italian,Seafood",
    },
    {
      name: "neighborhoods",
      type: "string",
      help: "Comma-separated OpenTable neighborhood names",
    },
    {
      name: "prices",
      type: "string",
      help: "Comma-separated price levels: 1,2,3,4 (or $, $$, $$$, $$$$)",
    },
    {
      name: "seating",
      type: "string",
      help: `Comma-separated seating: ${OPENTABLE_SEATING_OPTIONS.join(", ")}`,
    },
    {
      name: "features",
      type: "string",
      help: `Comma-separated top-rated filters: ${OPENTABLE_FEATURE_OPTIONS.join(", ")}`,
    },
    {
      name: "wheelchair-accessible",
      type: "boolean",
      default: false,
      help: "Ask OpenTable for restaurants displaying wheelchair access",
    },
    {
      name: "min-rating",
      type: "float",
      help: "Minimum displayed diner rating from 0 to 5",
    },
    {
      name: "min-reviews",
      type: "int",
      help: "Minimum displayed review count",
    },
    {
      name: "include-unavailable",
      type: "boolean",
      default: false,
      help: "Include restaurants with no displayed time near the requested time",
    },
    {
      name: "experiences-only",
      type: "boolean",
      default: false,
      help: "Return only result cards advertising a dining experience",
    },
    {
      name: "sort",
      type: "string",
      default: "relevance",
      choices: OPENTABLE_SEARCH_SORTS,
      help: "Sort by OpenTable relevance, rating, review count, or bookings today",
    },
    {
      name: "limit",
      type: "int",
      default: 10,
      help: "Maximum restaurants to return (1-50)",
    },
  ],
  columns: [
    "rank",
    "name",
    "rating",
    "review_count",
    "price",
    "cuisine",
    "neighborhood",
    "booked_today",
    "available_times",
    "has_experiences",
    "url",
  ],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError("Browser session required for opentable search");

    let location;
    let date;
    let time;
    let partySize;
    let cuisines;
    let neighborhoods;
    let prices;
    let seating;
    let features;
    let minRating;
    let minReviews;
    let limit;
    try {
      location = requiredText(kwargs.location, "location");
      date = normalizeDate(kwargs.date);
      time = normalizeTime(kwargs.time);
      partySize = integerInRange(kwargs["party-size"], "party-size", 1, 20);
      cuisines = parseDelimitedList(kwargs.cuisines);
      neighborhoods = parseDelimitedList(kwargs.neighborhoods);
      prices = normalizePriceLevels(kwargs.prices);
      seating = normalizeSeating(kwargs.seating);
      features = normalizeFeatures(kwargs.features);
      minRating = optionalNumberInRange(kwargs["min-rating"], "min-rating", 0, 5);
      minReviews = optionalNonNegativeInteger(kwargs["min-reviews"], "min-reviews");
      limit = integerInRange(kwargs.limit, "limit", 1, 50);
      if (!OPENTABLE_SEARCH_SORTS.includes(kwargs.sort)) {
        throw new Error(`sort must be one of: ${OPENTABLE_SEARCH_SORTS.join(", ")}`);
      }
    } catch (error) {
      argumentError(error);
    }

    const { sourceUrl } = await navigateOpenTableSearch(page, {
      query: kwargs.query,
      location,
      date,
      time,
      partySize,
    });
    const requestedLabels = openTableFilterLabels({
      cuisines,
      neighborhoods,
      prices,
      seating,
      features,
      wheelchairAccessible: kwargs["wheelchair-accessible"] === true,
    });
    const filterResult = await applyOpenTableFilterLabels(page, requestedLabels);
    if (filterResult.missing?.length) {
      throw new ArgumentError(
        `OpenTable did not expose these requested filters for the selected location: ${filterResult.missing.join(", ")}`,
        "Use names shown in OpenTable's Filters panel for that location.",
      );
    }

    const needsExtraRows =
      minRating !== null ||
      minReviews !== null ||
      kwargs["experiences-only"] === true ||
      kwargs["include-unavailable"] !== true;
    const targetCount = needsExtraRows ? 50 : limit;
    const payload = await loadOpenTableSearchCandidates(page, targetCount);
    const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
    const rows = dedupeSearchRows(
      candidates.map((candidate, index) =>
        normalizeSearchCandidate(candidate, index, payload?.url || sourceUrl),
      ),
    ).filter((row) => row.name && row.url);
    if (rows.length === 0) {
      if (payload?.no_results) {
        throw new EmptyResultError(
          "opentable search",
          `OpenTable returned no restaurants near "${location}" for ${date} at ${time}`,
        );
      }
      throw new CommandExecutionError(
        `OpenTable returned no readable restaurant cards near "${location}"`,
        "Inspect the browser for a changed page layout or access challenge.",
      );
    }

    const results = filterAndSortSearchRows(rows, {
      cuisines,
      neighborhoods,
      prices,
      minRating,
      minReviews,
      availableOnly: kwargs["include-unavailable"] !== true,
      experiencesOnly: kwargs["experiences-only"] === true,
      sort: kwargs.sort,
      limit,
    });
    if (results.length === 0) {
      throw new EmptyResultError(
        "opentable search",
        `OpenTable exposed ${rows.length} restaurants, but none matched every requested filter`,
      );
    }
    return results;
  },
});
