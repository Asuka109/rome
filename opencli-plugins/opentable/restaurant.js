import { ArgumentError, CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import { normalizeRestaurantCandidate, requiredText } from "./opentable-helpers.mjs";
import {
  assertReadableOpenTablePage,
  extractOpenTableRestaurant,
  navigateFreshOpenTablePage,
  resolveOpenTableBusiness,
} from "./opentable-browser.mjs";

cli({
  site: "opentable",
  name: "restaurant",
  access: "read",
  description:
    "Read an OpenTable restaurant's overview, ratings, hours, contact details, and dining features",
  example: "opencli opentable restaurant lolinda-reservations-san-francisco -f json",
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
  ],
  columns: [
    "name",
    "rating",
    "review_count",
    "price",
    "cuisines",
    "neighborhood",
    "address",
    "hours",
    "phone",
    "website",
    "dining_style",
    "dress_code",
    "features",
    "description",
    "url",
  ],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError("Browser session required for opentable restaurant");
    let business;
    try {
      business = requiredText(kwargs.business, "business");
    } catch (error) {
      throw new ArgumentError(error instanceof Error ? error.message : String(error));
    }
    const resolved = await resolveOpenTableBusiness(page, business, kwargs.location);
    await navigateFreshOpenTablePage(page, resolved.url, "h1, main");
    const payload = await extractOpenTableRestaurant(page);
    assertReadableOpenTablePage(payload, `restaurant details for ${business}`);
    const row = normalizeRestaurantCandidate(payload?.candidate || {}, resolved.url);
    if (!row.name) {
      throw new CommandExecutionError(
        `OpenTable could not read restaurant details from ${resolved.url}`,
        "Inspect the browser for a changed page layout or access challenge.",
      );
    }
    return [row];
  },
});
