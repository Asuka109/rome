import { CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import { normalizeBusinessCandidate, requiredText } from "./yelp-helpers.mjs";
import {
  assertReadableYelpPage,
  extractYelpBusiness,
  navigateFreshYelpPage,
  resolveYelpBusiness,
  waitForYelpSelector,
} from "./yelp-browser.mjs";

cli({
  site: "yelp",
  name: "business",
  access: "read",
  description:
    "Read Yelp business details, hours, contact links, amenities, and health information",
  example: 'opencli yelp business "The Coffee Movement" --location "San Francisco, CA" -f json',
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
  ],
  columns: [
    "name",
    "rating",
    "review_count",
    "price",
    "categories",
    "claimed",
    "open_now",
    "hours_today",
    "address",
    "neighborhood",
    "phone",
    "website",
    "menu_url",
    "health_score",
    "url",
  ],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError("Browser session required for yelp business");
    let business;
    try {
      business = requiredText(kwargs.business, "business");
    } catch (error) {
      throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
    }
    const resolved = await resolveYelpBusiness(page, business, kwargs.location);
    await navigateFreshYelpPage(page, resolved.url);
    await waitForYelpSelector(page, "h1, [data-testid=BizHeaderReviewCount]");
    const payload = await extractYelpBusiness(page);
    assertReadableYelpPage(payload, "business detail lookup");
    const row = normalizeBusinessCandidate(payload?.candidate || {}, resolved.url);
    if (!row.name) {
      throw new CommandExecutionError(
        `Yelp could not read business details from ${resolved.url}; inspect the browser for an interstitial`,
      );
    }
    return [row];
  },
});
