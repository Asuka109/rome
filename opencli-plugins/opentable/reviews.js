import { ArgumentError, CommandExecutionError, EmptyResultError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  OPENTABLE_REVIEW_SORTS,
  cleanText,
  integerInRange,
  normalizeReviewCandidate,
  optionalNonNegativeInteger,
  requiredText,
  sortReviewRows,
} from "./opentable-helpers.mjs";
import {
  assertReadableOpenTablePage,
  extractOpenTableReviews,
  navigateFreshOpenTablePage,
  openOpenTableSection,
  resolveOpenTableBusiness,
} from "./opentable-browser.mjs";

cli({
  site: "opentable",
  name: "reviews",
  access: "read",
  description: "Read and filter verified diner reviews from a public OpenTable restaurant profile",
  example:
    "opencli opentable reviews lolinda-reservations-san-francisco --sort newest --rating 5 --limit 10 -f json",
  domain: "opentable.com",
  strategy: Strategy.PUBLIC,
  browser: true,
  args: [
    {
      name: "business",
      type: "string",
      positional: true,
      required: true,
      help: "Restaurant name, OpenTable alias, or https://www.opentable.com/r/... URL",
    },
    {
      name: "location",
      type: "string",
      help: "Location used to disambiguate a restaurant name; not needed for an alias or URL",
    },
    {
      name: "sort",
      type: "string",
      default: "newest",
      choices: OPENTABLE_REVIEW_SORTS,
      help: "Sort extracted reviews by newest, highest rating, or lowest rating",
    },
    {
      name: "rating",
      type: "int",
      help: "Return only reviews with this star rating (1-5)",
    },
    {
      name: "query",
      type: "string",
      help: "Filter review summaries, text, occasion, or author",
    },
    {
      name: "start",
      type: "int",
      default: 0,
      help: "Zero-based offset after filtering and sorting",
    },
    {
      name: "limit",
      type: "int",
      default: 10,
      help: "Maximum reviews to return (1-50)",
    },
  ],
  columns: ["rank", "author", "rating", "date", "occasion", "summary", "text", "restaurant", "url"],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError("Browser session required for opentable reviews");
    let business;
    let rating = null;
    let start;
    let limit;
    try {
      business = requiredText(kwargs.business, "business");
      if (kwargs.rating !== undefined && kwargs.rating !== null && kwargs.rating !== "") {
        rating = integerInRange(kwargs.rating, "rating", 1, 5);
      }
      start = optionalNonNegativeInteger(kwargs.start, "start") ?? 0;
      limit = integerInRange(kwargs.limit, "limit", 1, 50);
      if (!OPENTABLE_REVIEW_SORTS.includes(kwargs.sort)) {
        throw new Error(`sort must be one of: ${OPENTABLE_REVIEW_SORTS.join(", ")}`);
      }
    } catch (error) {
      throw new ArgumentError(error instanceof Error ? error.message : String(error));
    }

    const resolved = await resolveOpenTableBusiness(page, business, kwargs.location);
    await navigateFreshOpenTablePage(page, resolved.url, "h1, main");
    await openOpenTableSection(page, "Reviews");
    const payload = await extractOpenTableReviews(page);
    assertReadableOpenTablePage(payload, `reviews for ${business}`);
    const restaurant = payload?.restaurant || resolved.name || business;
    let rows = (Array.isArray(payload?.candidates) ? payload.candidates : []).map(
      (candidate, index) =>
        normalizeReviewCandidate(candidate, index, {
          start: 0,
          restaurant,
          businessUrl: resolved.url,
          sourceUrl: payload?.url || resolved.url,
        }),
    );
    const query = cleanText(kwargs.query).toLowerCase();
    rows = rows.filter((row) => {
      if (rating !== null && row.rating !== rating) return false;
      if (
        query &&
        ![row.author, row.occasion, row.summary, row.text].some((value) =>
          cleanText(value).toLowerCase().includes(query),
        )
      ) {
        return false;
      }
      return true;
    });
    rows = sortReviewRows(rows, kwargs.sort).slice(start, start + limit);
    if (rows.length === 0) {
      const detail = payload?.no_results
        ? `${restaurant} has no public reviews`
        : `${restaurant} exposed no reviews matching the requested filters`;
      throw new EmptyResultError("opentable reviews", detail);
    }
    return rows.map((row, index) => ({ ...row, rank: start + index + 1 }));
  },
});
