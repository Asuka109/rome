import { CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  cleanText,
  integerInRange,
  normalizeMenuCandidate,
  requiredText,
} from "./yelp-helpers.mjs";
import {
  assertReadableYelpPage,
  extractYelpMenu,
  navigateFreshYelpPage,
  resolveYelpBusiness,
  waitForYelpSelector,
} from "./yelp-browser.mjs";

cli({
  site: "yelp",
  name: "menu",
  access: "read",
  description: "Read Yelp-hosted menu items or popular dishes and return the business's menu link",
  example: 'opencli yelp menu house-of-prime-rib-san-francisco --query "cut" -f json',
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
      name: "query",
      type: "string",
      help: "Filter menu or popular item names and descriptions",
    },
    {
      name: "limit",
      type: "int",
      default: 20,
      help: "Maximum menu or popular items to return (1-50)",
    },
  ],
  columns: [
    "rank",
    "item_type",
    "name",
    "section",
    "description",
    "price",
    "photo_count",
    "review_count",
    "photo_url",
    "menu_url",
    "business",
  ],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError("Browser session required for yelp menu");
    let business;
    let limit;
    try {
      business = requiredText(kwargs.business, "business");
      limit = integerInRange(kwargs.limit, "limit", 1, 50);
    } catch (error) {
      throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
    }

    const resolved = await resolveYelpBusiness(page, business, kwargs.location);
    await navigateFreshYelpPage(page, resolved.url);
    await waitForYelpSelector(page, "h1, [data-testid=BizHeaderReviewCount]");
    const payload = await extractYelpMenu(page);
    assertReadableYelpPage(payload, "menu lookup");
    const businessName = payload?.business || resolved.name || resolved.alias;
    const query = cleanText(kwargs.query).toLowerCase();
    let items = Array.isArray(payload?.items) ? payload.items : [];
    if (query) {
      items = items.filter((item) =>
        [item.name, item.section, item.description].some((value) =>
          cleanText(value).toLowerCase().includes(query),
        ),
      );
    }
    if (items.length === 0 && !query && payload?.menu_url) {
      items = [
        {
          item_type: "external_menu",
          name: "External menu",
          section: null,
          description: "Yelp links to the business's external menu",
          price: null,
          photo_count: null,
          review_count: null,
          photo_url: null,
        },
      ];
    }
    if (items.length === 0) {
      const message = query
        ? `Yelp exposed no menu or popular items matching "${kwargs.query}" for ${businessName}`
        : `Yelp exposed no menu, popular items, or external menu link for ${businessName}`;
      throw new CommandExecutionError(message);
    }
    return items.slice(0, limit).map((candidate, index) =>
      normalizeMenuCandidate(candidate, index, {
        menuUrl: payload?.menu_url,
        business: businessName,
        businessUrl: resolved.url,
      }),
    );
  },
});
