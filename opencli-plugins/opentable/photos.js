import { ArgumentError, CommandExecutionError, EmptyResultError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  OPENTABLE_PHOTO_CATEGORIES,
  cleanText,
  integerInRange,
  normalizePhotoCandidate,
  requiredText,
} from "./opentable-helpers.mjs";
import {
  assertReadableOpenTablePage,
  extractOpenTablePhotos,
  navigateFreshOpenTablePage,
  openOpenTablePhotos,
  resolveOpenTableBusiness,
} from "./opentable-browser.mjs";

cli({
  site: "opentable",
  name: "photos",
  access: "read",
  description:
    "List public OpenTable restaurant photos with captions, categories, and full-size URLs",
  example:
    "opencli opentable photos lolinda-reservations-san-francisco --category food --limit 20 -f json",
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
      name: "category",
      type: "string",
      default: "all",
      choices: OPENTABLE_PHOTO_CATEGORIES,
      help: "Photo category: all, food, interior, exterior, ambience, or menu",
    },
    {
      name: "query",
      type: "string",
      help: "Filter photo captions or author names",
    },
    {
      name: "limit",
      type: "int",
      default: 20,
      help: "Maximum photos to return (1-100)",
    },
  ],
  columns: ["rank", "category", "caption", "author", "image_url", "thumbnail_url", "restaurant"],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError("Browser session required for opentable photos");
    let business;
    let limit;
    try {
      business = requiredText(kwargs.business, "business");
      limit = integerInRange(kwargs.limit, "limit", 1, 100);
      if (!OPENTABLE_PHOTO_CATEGORIES.includes(kwargs.category)) {
        throw new Error(`category must be one of: ${OPENTABLE_PHOTO_CATEGORIES.join(", ")}`);
      }
    } catch (error) {
      throw new ArgumentError(error instanceof Error ? error.message : String(error));
    }
    const resolved = await resolveOpenTableBusiness(page, business, kwargs.location);
    await navigateFreshOpenTablePage(page, resolved.url, "h1, main");
    await openOpenTablePhotos(page);
    const payload = await extractOpenTablePhotos(page);
    assertReadableOpenTablePage(payload, `photos for ${business}`);
    const restaurant = payload?.restaurant || resolved.name || business;
    const query = cleanText(kwargs.query).toLowerCase();
    let candidates = (Array.isArray(payload?.candidates) ? payload.candidates : []).filter(
      (photo) => {
        if (
          kwargs.category !== "all" &&
          cleanText(photo.category).toLowerCase() !== kwargs.category
        ) {
          return false;
        }
        if (
          query &&
          ![photo.caption, photo.author].some((value) =>
            cleanText(value).toLowerCase().includes(query),
          )
        ) {
          return false;
        }
        return true;
      },
    );
    if (candidates.length === 0) {
      throw new EmptyResultError(
        "opentable photos",
        `${restaurant} exposed no photos matching category "${kwargs.category}" and the requested caption filter`,
      );
    }
    candidates = candidates.slice(0, limit);
    return candidates.map((candidate, index) =>
      normalizePhotoCandidate(candidate, index, {
        restaurant,
        category: kwargs.category,
        sourceUrl: payload?.url || resolved.url,
      }),
    );
  },
});
