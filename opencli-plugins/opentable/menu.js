import { ArgumentError, CommandExecutionError, EmptyResultError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  cleanText,
  integerInRange,
  normalizeMenuCandidate,
  requiredText,
} from "./opentable-helpers.mjs";
import {
  assertReadableOpenTablePage,
  extractOpenTableMenu,
  navigateFreshOpenTablePage,
  openOpenTableSection,
  resolveOpenTableBusiness,
} from "./opentable-browser.mjs";

cli({
  site: "opentable",
  name: "menu",
  access: "read",
  description:
    "Read OpenTable menu items or popular dishes and return the restaurant's full menu link",
  example:
    "opencli opentable menu lolinda-reservations-san-francisco --query steak --limit 20 -f json",
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
      name: "query",
      type: "string",
      help: "Filter item names, sections, or descriptions",
    },
    {
      name: "section",
      type: "string",
      help: "Filter by an OpenTable menu section name",
    },
    {
      name: "limit",
      type: "int",
      default: 20,
      help: "Maximum items to return (1-100)",
    },
  ],
  columns: [
    "rank",
    "item_type",
    "name",
    "section",
    "description",
    "price",
    "review_count",
    "photo_url",
    "restaurant",
    "menu_url",
  ],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError("Browser session required for opentable menu");
    let business;
    let limit;
    try {
      business = requiredText(kwargs.business, "business");
      limit = integerInRange(kwargs.limit, "limit", 1, 100);
    } catch (error) {
      throw new ArgumentError(error instanceof Error ? error.message : String(error));
    }
    const resolved = await resolveOpenTableBusiness(page, business, kwargs.location);
    await navigateFreshOpenTablePage(page, resolved.url, "h1, main");
    await openOpenTableSection(page, "Menu");
    const payload = await extractOpenTableMenu(page);
    assertReadableOpenTablePage(payload, `menu for ${business}`);
    const restaurant = payload?.restaurant || resolved.name || business;
    let candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
    const query = cleanText(kwargs.query).toLowerCase();
    const section = cleanText(kwargs.section).toLowerCase();
    candidates = candidates.filter((item) => {
      if (section && !cleanText(item.section).toLowerCase().includes(section)) return false;
      if (
        query &&
        ![item.name, item.section, item.description].some((value) =>
          cleanText(value).toLowerCase().includes(query),
        )
      ) {
        return false;
      }
      return true;
    });
    if (candidates.length === 0 && !query && !section && payload?.menu_url) {
      candidates = [
        {
          item_type: "external_menu",
          name: "Full menu",
          section: null,
          description: "OpenTable links to the restaurant's full menu",
          price: null,
          review_count: null,
          photo_url: null,
        },
      ];
    }
    if (candidates.length === 0) {
      const detail =
        query || section
          ? `${restaurant} exposed no menu items matching the requested filters`
          : `${restaurant} exposed no menu items or external menu link`;
      throw new EmptyResultError("opentable menu", detail);
    }
    return candidates.slice(0, limit).map((candidate, index) =>
      normalizeMenuCandidate(candidate, index, {
        restaurant,
        menuUrl: payload?.menu_url,
        sourceUrl: payload?.url || resolved.url,
      }),
    );
  },
});
