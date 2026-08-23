import { ArgumentError, CommandExecutionError, EmptyResultError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  OPENTABLE_SEATING_OPTIONS,
  buildOpenTableRestaurantUrl,
  integerInRange,
  normalizeAvailabilityCandidate,
  normalizeDate,
  normalizeSeating,
  normalizeTime,
  optionalNonNegativeInteger,
  requiredText,
} from "./opentable-helpers.mjs";
import {
  assertReadableOpenTablePage,
  extractOpenTableAvailability,
  navigateFreshOpenTablePage,
  resolveOpenTableBusiness,
} from "./opentable-browser.mjs";

function minutesFromTime(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})(?:\s*([AP])M)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = (match[3] || "").toUpperCase();
  if (meridiem) {
    if (hours === 12) hours = 0;
    if (meridiem === "P") hours += 12;
  }
  return hours * 60 + minutes;
}

cli({
  site: "opentable",
  name: "availability",
  access: "read",
  description:
    "List public reservation times, seating types, experiences, policies, and booking links for one restaurant",
  example:
    "opencli opentable availability lolinda-reservations-san-francisco --date 2026-07-19 --time 19:00 --party-size 2 --window-minutes 120 -f json",
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
      name: "window-minutes",
      type: "int",
      default: 180,
      help: "Return times within this many minutes before or after the preferred time (0-720)",
    },
    {
      name: "seating",
      type: "string",
      help: `Optional comma-separated seating types: ${OPENTABLE_SEATING_OPTIONS.join(", ")}`,
    },
    {
      name: "limit",
      type: "int",
      default: 30,
      help: "Maximum availability choices to return (1-100)",
    },
  ],
  columns: [
    "rank",
    "restaurant",
    "date",
    "time",
    "party_size",
    "seating_type",
    "experience",
    "price",
    "cancellation_policy",
    "booking_url",
  ],
  func: async (page, kwargs) => {
    if (!page)
      throw new CommandExecutionError("Browser session required for opentable availability");
    let business;
    let date;
    let time;
    let partySize;
    let windowMinutes;
    let seating;
    let limit;
    try {
      business = requiredText(kwargs.business, "business");
      date = normalizeDate(kwargs.date);
      time = normalizeTime(kwargs.time);
      partySize = integerInRange(kwargs["party-size"], "party-size", 1, 20);
      windowMinutes = optionalNonNegativeInteger(kwargs["window-minutes"], "window-minutes");
      if (windowMinutes === null || windowMinutes > 720) {
        throw new Error("window-minutes must be an integer between 0 and 720");
      }
      seating = normalizeSeating(kwargs.seating);
      limit = integerInRange(kwargs.limit, "limit", 1, 100);
    } catch (error) {
      throw new ArgumentError(error instanceof Error ? error.message : String(error));
    }

    const resolved = await resolveOpenTableBusiness(page, business, kwargs.location);
    const sourceUrl = buildOpenTableRestaurantUrl({
      businessUrl: resolved.url,
      date,
      time,
      partySize,
    });
    await navigateFreshOpenTablePage(page, sourceUrl, "h1, main");
    const payload = await extractOpenTableAvailability(page);
    assertReadableOpenTablePage(payload, `availability for ${business}`);
    const restaurant = payload?.restaurant || resolved.name || business;
    const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
    const targetMinutes = minutesFromTime(time);
    const seatingNeedles = seating.map((value) => value.replace("high-top", "high top"));
    const filtered = candidates.filter((candidate) => {
      const candidateMinutes = minutesFromTime(candidate.time);
      if (candidateMinutes === null || targetMinutes === null) return false;
      const directDifference = Math.abs(candidateMinutes - targetMinutes);
      const timeDifference = Math.min(directDifference, 24 * 60 - directDifference);
      if (timeDifference > windowMinutes) return false;
      if (seatingNeedles.length > 0) {
        const displayed = String(candidate.seating_type || "standard")
          .toLowerCase()
          .replace("hightop", "high top");
        if (!seatingNeedles.some((needle) => displayed.includes(needle))) return false;
      }
      return true;
    });
    if (filtered.length === 0) {
      const reason = payload?.no_results
        ? "OpenTable displayed no online availability"
        : `No displayed times matched the requested ${windowMinutes}-minute window and seating filters`;
      throw new EmptyResultError(
        "opentable availability",
        `${reason} for ${restaurant} on ${date} around ${time}`,
      );
    }
    return filtered.slice(0, limit).map((candidate, index) =>
      normalizeAvailabilityCandidate(candidate, index, {
        restaurant,
        date,
        partySize,
        sourceUrl: payload?.url || sourceUrl,
      }),
    );
  },
});
