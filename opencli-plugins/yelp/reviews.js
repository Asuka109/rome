import { CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  YELP_REVIEW_SORTS,
  buildYelpReviewsUrl,
  integerInRange,
  normalizeReviewCandidate,
  optionalNonNegativeInteger,
  requiredText,
  sortReviewRows,
} from "./yelp-helpers.mjs";
import {
  assertReadableYelpPage,
  extractYelpReviews,
  navigateFreshYelpPage,
  resolveYelpBusiness,
  waitForYelpSelector,
} from "./yelp-browser.mjs";

cli({
  site: "yelp",
  name: "reviews",
  access: "read",
  description: "Read and filter public Yelp reviews for a business",
  example:
    "opencli yelp reviews the-coffee-movement-san-francisco-4 --sort newest --rating 5 --limit 10 -f json",
  domain: "yelp.com",
  strategy: Strategy.PUBLIC,
  browser: true,
  args: [
    {
      name: "business",
      type: "string",
      positional: true,
      required: true,
      help: "Business name, Yelp alias, or https://www.yelp.com/biz/... URL",
    },
    {
      name: "location",
      type: "string",
      help: "Location used to resolve a business name; not needed for an alias or Yelp URL",
    },
    {
      name: "sort",
      type: "string",
      default: "recommended",
      choices: YELP_REVIEW_SORTS,
      help: "Sort reviews by Yelp recommendation, newest, oldest, highest, or lowest rating",
    },
    {
      name: "rating",
      type: "int",
      help: "Return reviews with this star rating (1-5)",
    },
    {
      name: "keyword",
      type: "string",
      help: "Use Yelp's review search to find reviews containing this keyword or phrase",
    },
    {
      name: "start",
      type: "int",
      default: 0,
      help: "Review offset, as a non-negative multiple of 10",
    },
    {
      name: "limit",
      type: "int",
      default: 10,
      help: "Maximum reviews to return (1-50)",
    },
  ],
  columns: [
    "rank",
    "author",
    "author_location",
    "elite",
    "rating",
    "date",
    "text",
    "photo_count",
    "reactions",
    "business",
    "business_url",
  ],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError("Browser session required for yelp reviews");
    let business;
    let rating = null;
    let start;
    let limit;
    try {
      business = requiredText(kwargs.business, "business");
      if (!YELP_REVIEW_SORTS.includes(kwargs.sort)) {
        throw new Error(`sort must be one of: ${YELP_REVIEW_SORTS.join(", ")}`);
      }
      if (kwargs.rating !== undefined && kwargs.rating !== null && kwargs.rating !== "") {
        rating = integerInRange(kwargs.rating, "rating", 1, 5);
      }
      start = optionalNonNegativeInteger(kwargs.start, "start") ?? 0;
      if (start % 10 !== 0) throw new Error("start must be a non-negative multiple of 10");
      limit = integerInRange(kwargs.limit, "limit", 1, 50);
    } catch (error) {
      throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
    }

    const resolved = await resolveYelpBusiness(page, business, kwargs.location);
    const rows = [];
    let businessName = resolved.name;
    let lastPayload = null;
    const maximumPages = rating !== null ? 5 : Math.ceil(limit / 10);
    for (let pageIndex = 0; pageIndex < maximumPages; pageIndex++) {
      const pageStart = start + pageIndex * 10;
      const sourceUrl = buildYelpReviewsUrl({
        businessUrl: resolved.url,
        sort: kwargs.sort,
        keyword: kwargs.keyword,
        rating,
        start: pageStart,
      });
      if (pageIndex === 0) await navigateFreshYelpPage(page, sourceUrl);
      else await page.goto(sourceUrl);
      await waitForYelpSelector(page, 'li p[class*="comment__"]');
      const payload = await extractYelpReviews(page);
      lastPayload = payload;
      assertReadableYelpPage(payload, "review lookup");
      if (!businessName) {
        businessName = await page.evaluate(
          "document.querySelector('h1')?.textContent?.trim() || ''",
        );
      }
      const candidates = Array.isArray(payload?.reviews) ? payload.reviews : [];
      if (candidates.length === 0) break;
      const normalized = candidates
        .map((candidate, index) =>
          normalizeReviewCandidate(candidate, index, {
            start: pageStart,
            business: businessName,
            businessUrl: resolved.url,
            sourceUrl: payload?.url || sourceUrl,
          }),
        )
        .filter((row) => rating === null || row.rating === rating);
      rows.push(...normalized);
      const needsComposedClientFilter = rating !== null && Boolean(kwargs.keyword);
      if (candidates.length < 10 || (rows.length >= limit && !needsComposedClientFilter)) break;
    }

    const seen = new Set();
    const uniqueRows = rows.filter((row) => {
      const identity = `${row.author}|${row.date}|${row.text}`;
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
    if (uniqueRows.length === 0) {
      const qualifier = [
        rating ? `${rating}-star` : "",
        kwargs.keyword ? `matching "${kwargs.keyword}"` : "",
      ]
        .filter(Boolean)
        .join(" ");
      if (lastPayload?.no_results || qualifier) {
        throw new CommandExecutionError(
          `Yelp returned no ${qualifier ? `${qualifier} ` : ""}reviews for ${businessName || resolved.alias}`,
        );
      }
      throw new CommandExecutionError(
        `Yelp returned no readable reviews for ${businessName || resolved.alias}; inspect the browser for an interstitial`,
      );
    }
    return sortReviewRows(uniqueRows, kwargs.sort)
      .slice(0, limit)
      .map((row, index) => ({ ...row, rank: start + index + 1 }));
  },
});
