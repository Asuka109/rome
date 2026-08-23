export const OPENTABLE_SEARCH_SORTS = ["relevance", "rating", "reviews", "booked"];
export const OPENTABLE_REVIEW_SORTS = ["newest", "highest", "lowest"];
export const OPENTABLE_PHOTO_CATEGORIES = [
  "all",
  "food",
  "interior",
  "exterior",
  "ambience",
  "menu",
];
export const OPENTABLE_SEATING_OPTIONS = ["standard", "bar", "counter", "high-top", "outdoor"];
export const OPENTABLE_FEATURE_OPTIONS = [
  "charming",
  "dog-friendly",
  "fancy",
  "good-for-business-meals",
  "good-for-groups",
  "good-for-special-occasions",
];

const FEATURE_LABELS = {
  charming: "Charming",
  "dog-friendly": "Dog-friendly",
  fancy: "Fancy",
  "good-for-business-meals": "Good for business meals",
  "good-for-groups": "Good for groups",
  "good-for-special-occasions": "Good for special occasions",
};

const SEATING_LABELS = {
  standard: "Standard",
  bar: "Bar",
  counter: "Counter",
  "high-top": "High Top",
  outdoor: "Outdoor",
};

const HTML_ENTITIES = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

export function cleanText(value) {
  return typeof value === "string"
    ? value
        .replace(/[\u00a0\u202f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";
}

export function decodeHtml(value) {
  return cleanText(value).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith("#x")) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (normalized.startsWith("#")) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return HTML_ENTITIES[normalized] ?? match;
  });
}

export function requiredText(value, name) {
  const normalized = cleanText(value);
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

export function integerInRange(value, name, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

export function optionalNonNegativeInteger(value, name) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

export function optionalNumberInRange(value, name, minimum, maximum) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be a number between ${minimum} and ${maximum}`);
  }
  return parsed;
}

export function normalizeDate(value) {
  const normalized = requiredText(value, "date");
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error("date must use YYYY-MM-DD");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("date must be a valid calendar date");
  }
  return normalized;
}

export function normalizeTime(value) {
  const normalized = requiredText(value, "time");
  const match = normalized.match(/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/);
  if (!match) throw new Error("time must use 24-hour HH:MM on a 15-minute boundary");
  return normalized;
}

export function combineDateTime(date, time) {
  return `${normalizeDate(date)}T${normalizeTime(time)}:00`;
}

export function parseDelimitedList(value) {
  return String(value ?? "")
    .split(",")
    .map(cleanText)
    .filter(Boolean);
}

function normalizeMappedList(value, name, mapping) {
  const normalized = [...new Set(parseDelimitedList(value).map((item) => item.toLowerCase()))];
  const invalid = normalized.filter((item) => !(item in mapping));
  if (invalid.length > 0) {
    throw new Error(
      `${name} contains unsupported values: ${invalid.join(", ")}; use ${Object.keys(mapping).join(", ")}`,
    );
  }
  return normalized;
}

export function normalizeSeating(value) {
  return normalizeMappedList(value, "seating", SEATING_LABELS);
}

export function normalizeFeatures(value) {
  return normalizeMappedList(value, "features", FEATURE_LABELS);
}

export function openTableFilterLabels({
  cuisines = [],
  neighborhoods = [],
  prices = [],
  seating = [],
  features = [],
  wheelchairAccessible = false,
}) {
  return [
    ...cuisines,
    ...neighborhoods,
    ...prices.map((price) => "$".repeat(price)),
    ...seating.map((value) => SEATING_LABELS[value]),
    ...features.map((value) => FEATURE_LABELS[value]),
    ...(wheelchairAccessible ? ["Wheelchair access"] : []),
  ];
}

export function normalizePriceLevels(value) {
  const levels = [
    ...new Set(
      parseDelimitedList(value).map((item) => {
        if (/^\${1,4}$/.test(item)) return item.length;
        const parsed = Number(item);
        return Number.isInteger(parsed) ? parsed : Number.NaN;
      }),
    ),
  ];
  if (levels.some((level) => !Number.isInteger(level) || level < 1 || level > 4)) {
    throw new Error("prices must be comma-separated levels from 1 to 4 (or $, $$, $$$, $$$$)");
  }
  return levels;
}

export function canonicalOpenTableRestaurantUrl(value) {
  const raw = cleanText(value);
  if (!raw) return null;

  let candidate;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) {
    candidate = new URL(raw, "https://www.opentable.com");
  } else if (/^[a-z0-9][a-z0-9-]*-[a-z0-9-]+$/i.test(raw)) {
    candidate = new URL(`/r/${raw}`, "https://www.opentable.com");
  } else {
    return null;
  }

  if (candidate.protocol !== "https:" || !/(^|\.)opentable\.com$/i.test(candidate.hostname)) {
    throw new Error("restaurant URL must be an https://www.opentable.com/r/... URL");
  }
  const match = candidate.pathname.match(/^\/r\/([^/?#]+)\/?$/i);
  if (!match) throw new Error("restaurant URL must point to an OpenTable /r/ page");
  return `https://www.opentable.com/r/${match[1]}`;
}

export function openTableRestaurantAlias(value) {
  const canonical = canonicalOpenTableRestaurantUrl(value);
  return canonical ? decodeURIComponent(new URL(canonical).pathname.slice(3)) : null;
}

export function buildOpenTableSearchUrl({ query, location, date, time, partySize }) {
  const name = requiredText(location?.name, "resolved location name");
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("resolved location latitude must be between -90 and 90");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("resolved location longitude must be between -180 and 180");
  }
  const url = new URL("https://www.opentable.com/s");
  url.searchParams.set("dateTime", combineDateTime(date, time));
  url.searchParams.set("covers", String(integerInRange(partySize, "party-size", 1, 20)));
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("searchedLocationName", name);
  url.searchParams.set("shouldUseLatLongSearch", "true");
  const normalizedQuery = cleanText(query);
  if (normalizedQuery) url.searchParams.set("term", normalizedQuery);
  return url.toString();
}

export function buildOpenTableRestaurantUrl({ businessUrl, date, time, partySize }) {
  const canonical = canonicalOpenTableRestaurantUrl(businessUrl);
  if (!canonical) throw new Error("an OpenTable restaurant URL or alias is required");
  const url = new URL(canonical);
  if (date !== undefined || time !== undefined || partySize !== undefined) {
    url.searchParams.set("dateTime", combineDateTime(date, time));
    url.searchParams.set("covers", String(integerInRange(partySize, "party-size", 1, 20)));
  }
  return url.toString();
}

export function parseCompactNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const normalized = cleanText(value).replace(/,/g, "");
  const match = normalized.match(/(-?\d+(?:\.\d+)?)\s*([KMB])?/i);
  if (!match) return null;
  const base = Number(match[1]);
  const multipliers = { K: 1_000, M: 1_000_000, B: 1_000_000_000 };
  const parsed = base * (multipliers[(match[2] || "").toUpperCase()] || 1);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

export function parseRating(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = cleanText(value).match(/([0-5](?:\.\d+)?)\s*(?:star|out of 5)?/i);
  const parsed = match ? Number(match[1]) : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 5 ? parsed : null;
}

function canonicalResultUrl(value) {
  try {
    return canonicalOpenTableRestaurantUrl(value);
  } catch {
    return null;
  }
}

export function normalizeSearchCandidate(candidate, index, sourceUrl) {
  const price = cleanText(candidate.price);
  const availableTimes = [
    ...new Set((candidate.available_times || []).map(cleanText).filter(Boolean)),
  ];
  return {
    _page_order: index,
    rank: Number.isInteger(candidate.rank) ? candidate.rank : index + 1,
    name: decodeHtml(candidate.name),
    rating: parseRating(candidate.rating_label ?? candidate.rating),
    review_count: parseCompactNumber(candidate.review_text ?? candidate.review_count),
    price: /^\${1,4}$/.test(price) || /^\$\d+/.test(price) ? price : null,
    cuisine: decodeHtml(candidate.cuisine) || null,
    neighborhood: decodeHtml(candidate.neighborhood) || null,
    booked_today: parseCompactNumber(candidate.booked_today),
    available_times: availableTimes.join(", ") || null,
    has_experiences: candidate.has_experiences === true,
    url: canonicalResultUrl(candidate.url),
    source_url: cleanText(sourceUrl) || null,
  };
}

export function dedupeSearchRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const identity =
      row.url ||
      `${cleanText(row.name).toLowerCase()}|${cleanText(row.neighborhood).toLowerCase()}`;
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export function filterAndSortSearchRows(
  rows,
  {
    cuisines = [],
    neighborhoods = [],
    prices = [],
    minRating = null,
    minReviews = null,
    availableOnly = true,
    experiencesOnly = false,
    sort = "relevance",
    limit = 10,
  },
) {
  if (!OPENTABLE_SEARCH_SORTS.includes(sort)) {
    throw new Error(`sort must be one of: ${OPENTABLE_SEARCH_SORTS.join(", ")}`);
  }
  const cuisineNeedles = cuisines.map((value) => cleanText(value).toLowerCase());
  const neighborhoodNeedles = neighborhoods.map((value) => cleanText(value).toLowerCase());
  let filtered = rows.filter((row) => {
    if (minRating !== null && (row.rating === null || row.rating < minRating)) return false;
    if (minReviews !== null && (row.review_count === null || row.review_count < minReviews))
      return false;
    if (availableOnly && !cleanText(row.available_times)) return false;
    if (experiencesOnly && !row.has_experiences) return false;
    if (prices.length > 0 && !prices.includes(cleanText(row.price).length)) return false;
    if (
      cuisineNeedles.length > 0 &&
      !cuisineNeedles.some((needle) => cleanText(row.cuisine).toLowerCase().includes(needle))
    ) {
      return false;
    }
    if (
      neighborhoodNeedles.length > 0 &&
      !neighborhoodNeedles.some((needle) =>
        cleanText(row.neighborhood).toLowerCase().includes(needle),
      )
    ) {
      return false;
    }
    return true;
  });

  const stable = (compare) => (left, right) =>
    compare(left, right) || left._page_order - right._page_order;
  if (sort === "rating") {
    filtered = [...filtered].sort(
      stable((left, right) => (right.rating ?? -1) - (left.rating ?? -1)),
    );
  } else if (sort === "reviews") {
    filtered = [...filtered].sort(
      stable((left, right) => (right.review_count ?? -1) - (left.review_count ?? -1)),
    );
  } else if (sort === "booked") {
    filtered = [...filtered].sort(
      stable((left, right) => (right.booked_today ?? -1) - (left.booked_today ?? -1)),
    );
  }
  return filtered.slice(0, limit);
}

export function normalizeRestaurantCandidate(candidate, sourceUrl) {
  return {
    name: decodeHtml(candidate.name),
    rating: parseRating(candidate.rating_label ?? candidate.rating),
    review_count: parseCompactNumber(candidate.review_text ?? candidate.review_count),
    price: decodeHtml(candidate.price) || null,
    cuisines: (candidate.cuisines || []).map(decodeHtml).filter(Boolean).join(", ") || null,
    neighborhood: decodeHtml(candidate.neighborhood) || null,
    address: decodeHtml(candidate.address) || null,
    hours: (candidate.hours || []).map(decodeHtml).filter(Boolean).join("; ") || null,
    phone: cleanText(candidate.phone) || null,
    website: cleanText(candidate.website) || null,
    dining_style: decodeHtml(candidate.dining_style) || null,
    dress_code: decodeHtml(candidate.dress_code) || null,
    features: (candidate.features || []).map(decodeHtml).filter(Boolean).join(", ") || null,
    description: decodeHtml(candidate.description) || null,
    url: canonicalResultUrl(candidate.url) || canonicalResultUrl(sourceUrl),
    source_url: cleanText(sourceUrl) || null,
  };
}

export function normalizeAvailabilityCandidate(candidate, index, context) {
  return {
    rank: index + 1,
    restaurant: decodeHtml(context.restaurant),
    date: normalizeDate(context.date),
    time: cleanText(candidate.time),
    party_size: integerInRange(context.partySize, "party-size", 1, 20),
    seating_type: decodeHtml(candidate.seating_type) || null,
    experience: decodeHtml(candidate.experience) || null,
    price: decodeHtml(candidate.price) || null,
    cancellation_policy: decodeHtml(candidate.cancellation_policy) || null,
    booking_url: cleanText(candidate.booking_url) || null,
    source_url: cleanText(context.sourceUrl) || null,
  };
}

export function normalizeReviewCandidate(candidate, index, context) {
  return {
    rank: (context.start || 0) + index + 1,
    author: decodeHtml(candidate.author) || null,
    rating: parseRating(candidate.rating_label ?? candidate.rating),
    date: cleanText(candidate.date) || null,
    occasion: decodeHtml(candidate.occasion) || null,
    summary: decodeHtml(candidate.summary) || null,
    text: decodeHtml(candidate.text) || null,
    restaurant: decodeHtml(context.restaurant),
    url: cleanText(context.businessUrl) || null,
    source_url: cleanText(context.sourceUrl) || null,
  };
}

export function sortReviewRows(rows, sort) {
  if (!OPENTABLE_REVIEW_SORTS.includes(sort)) {
    throw new Error(`sort must be one of: ${OPENTABLE_REVIEW_SORTS.join(", ")}`);
  }
  const stable = (compare) => (left, right) => compare(left, right) || left.rank - right.rank;
  if (sort === "highest") {
    return [...rows].sort(stable((left, right) => (right.rating ?? -1) - (left.rating ?? -1)));
  }
  if (sort === "lowest") {
    return [...rows].sort(stable((left, right) => (left.rating ?? 6) - (right.rating ?? 6)));
  }
  return [...rows].sort(
    stable((left, right) => {
      const leftTime = Date.parse(left.date || "");
      const rightTime = Date.parse(right.date || "");
      return (
        (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0)
      );
    }),
  );
}

export function normalizeMenuCandidate(candidate, index, context) {
  return {
    rank: index + 1,
    item_type: cleanText(candidate.item_type) || "menu_item",
    name: decodeHtml(candidate.name),
    section: decodeHtml(candidate.section) || null,
    description: decodeHtml(candidate.description) || null,
    price: decodeHtml(candidate.price) || null,
    review_count: parseCompactNumber(candidate.review_count),
    photo_url: cleanText(candidate.photo_url) || null,
    restaurant: decodeHtml(context.restaurant),
    menu_url: cleanText(context.menuUrl) || null,
    source_url: cleanText(context.sourceUrl) || null,
  };
}

export function normalizePhotoCandidate(candidate, index, context) {
  return {
    rank: index + 1,
    category: cleanText(candidate.category) || context.category || "all",
    caption: decodeHtml(candidate.caption) || null,
    author: decodeHtml(candidate.author) || null,
    image_url: cleanText(candidate.image_url) || null,
    thumbnail_url: cleanText(candidate.thumbnail_url) || null,
    restaurant: decodeHtml(context.restaurant),
    source_url: cleanText(context.sourceUrl) || null,
  };
}

export function normalizeExperienceCandidate(candidate, index, context) {
  return {
    rank: index + 1,
    name: decodeHtml(candidate.name),
    price: decodeHtml(candidate.price) || null,
    party_size: decodeHtml(candidate.party_size) || null,
    dates: decodeHtml(candidate.dates) || null,
    description: decodeHtml(candidate.description) || null,
    restaurant: decodeHtml(context.restaurant),
    booking_url: cleanText(candidate.booking_url) || null,
    source_url: cleanText(context.sourceUrl) || null,
  };
}
