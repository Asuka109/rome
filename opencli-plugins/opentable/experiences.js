import { ArgumentError, CommandExecutionError, EmptyResultError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  cleanText,
  integerInRange,
  normalizeExperienceCandidate,
  requiredText,
} from "./opentable-helpers.mjs";
import {
  assertReadableOpenTablePage,
  extractOpenTableExperiences,
  navigateFreshOpenTablePage,
  openOpenTableSection,
  resolveOpenTableBusiness,
} from "./opentable-browser.mjs";

cli({
  site: "opentable",
  name: "experiences",
  access: "read",
  description:
    "List public OpenTable dining experiences with price, party-size, date, description, and booking link",
  example: "opencli opentable experiences lolinda-reservations-san-francisco --limit 10 -f json",
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
      help: "Filter experience names or descriptions",
    },
    {
      name: "limit",
      type: "int",
      default: 20,
      help: "Maximum experiences to return (1-50)",
    },
  ],
  columns: [
    "rank",
    "name",
    "price",
    "party_size",
    "dates",
    "description",
    "restaurant",
    "booking_url",
  ],
  func: async (page, kwargs) => {
    if (!page)
      throw new CommandExecutionError("Browser session required for opentable experiences");
    let business;
    let limit;
    try {
      business = requiredText(kwargs.business, "business");
      limit = integerInRange(kwargs.limit, "limit", 1, 50);
    } catch (error) {
      throw new ArgumentError(error instanceof Error ? error.message : String(error));
    }
    const resolved = await resolveOpenTableBusiness(page, business, kwargs.location);
    await navigateFreshOpenTablePage(page, resolved.url, "h1, main");
    await openOpenTableSection(page, "Experiences");
    const payload = await extractOpenTableExperiences(page);
    assertReadableOpenTablePage(payload, `experiences for ${business}`);
    const restaurant = payload?.restaurant || resolved.name || business;
    const query = cleanText(kwargs.query).toLowerCase();
    const candidates = (Array.isArray(payload?.candidates) ? payload.candidates : []).filter(
      (experience) =>
        !query ||
        [experience.name, experience.description].some((value) =>
          cleanText(value).toLowerCase().includes(query),
        ),
    );
    if (candidates.length === 0) {
      throw new EmptyResultError(
        "opentable experiences",
        payload?.no_results
          ? `${restaurant} has no public OpenTable experiences`
          : `${restaurant} exposed no experiences matching "${kwargs.query}"`,
      );
    }
    return candidates.slice(0, limit).map((candidate, index) =>
      normalizeExperienceCandidate(candidate, index, {
        restaurant,
        sourceUrl: payload?.url || resolved.url,
      }),
    );
  },
});
