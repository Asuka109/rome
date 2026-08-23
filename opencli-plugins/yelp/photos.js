import { CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  YELP_PHOTO_CATEGORIES,
  buildYelpPhotosUrl,
  integerInRange,
  normalizePhotoCandidate,
  requiredText,
} from "./yelp-helpers.mjs";
import {
  assertReadableYelpPage,
  extractYelpPhotos,
  navigateFreshYelpPage,
  resolveYelpBusiness,
  waitForYelpSelector,
} from "./yelp-browser.mjs";

cli({
  site: "yelp",
  name: "photos",
  access: "read",
  description: "Browse public Yelp business photos by category",
  example:
    "opencli yelp photos the-coffee-movement-san-francisco-4 --category food --limit 10 -f json",
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
      name: "category",
      type: "string",
      default: "all",
      choices: YELP_PHOTO_CATEGORIES,
      help: "Photo category: all, drink, inside, food, outside, or menu",
    },
    {
      name: "limit",
      type: "int",
      default: 20,
      help: "Maximum photos from Yelp's current gallery page (1-30)",
    },
  ],
  columns: [
    "rank",
    "photo_id",
    "category",
    "caption",
    "author",
    "upload_date",
    "thumbnail_url",
    "photo_url",
    "business",
  ],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError("Browser session required for yelp photos");
    let business;
    let limit;
    try {
      business = requiredText(kwargs.business, "business");
      limit = integerInRange(kwargs.limit, "limit", 1, 30);
      if (!YELP_PHOTO_CATEGORIES.includes(kwargs.category)) {
        throw new Error(`category must be one of: ${YELP_PHOTO_CATEGORIES.join(", ")}`);
      }
    } catch (error) {
      throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
    }

    const resolved = await resolveYelpBusiness(page, business, kwargs.location);
    const sourceUrl = buildYelpPhotosUrl({ businessUrl: resolved.url, category: kwargs.category });
    await navigateFreshYelpPage(page, sourceUrl);
    await waitForYelpSelector(page, 'script[type="application/ld+json"], [role="tab"]');
    const payload = await extractYelpPhotos(page);
    assertReadableYelpPage(payload, "photo gallery lookup");
    const candidates = Array.isArray(payload?.photos) ? payload.photos : [];
    if (candidates.length === 0) {
      throw new CommandExecutionError(
        `Yelp returned no ${kwargs.category === "all" ? "" : `${kwargs.category} `}photos for ${resolved.name || resolved.alias}`,
      );
    }
    const businessName = payload?.business || resolved.name || resolved.alias;
    return candidates.slice(0, limit).map((candidate, index) =>
      normalizePhotoCandidate(candidate, index, {
        category: kwargs.category,
        business: businessName,
        businessUrl: resolved.url,
        sourceUrl: payload?.url || sourceUrl,
      }),
    );
  },
});
