export const YELP_SEARCH_SORTS = ["recommended", "rating", "reviews", "distance"];
export const YELP_SPONSORED_MODES = ["include", "exclude", "only"];
export const YELP_REVIEW_SORTS = ["recommended", "newest", "oldest", "highest", "lowest"];
export const YELP_PHOTO_CATEGORIES = ["all", "drink", "inside", "food", "outside", "menu"];

const SEARCH_SORT_PARAMS = {
  recommended: "",
  rating: "rating",
  reviews: "review_count",
  distance: "distance",
};

const REVIEW_SORT_PARAMS = {
  recommended: "yelp_sort",
  newest: "date_desc",
  oldest: "date_asc",
  highest: "rating_desc",
  lowest: "rating_asc",
};

const PHOTO_TAB_PARAMS = {
  all: "",
  drink: "drink",
  inside: "interior",
  food: "food",
  outside: "outside",
  menu: "menu",
};

const SERVICE_ATTRS = {
  delivery: "RestaurantsDelivery",
  takeout: "RestaurantsTakeOut",
  reservations: "RestaurantsReservations",
  waitlist: "OnlineWaitlistReservation",
};

const FEATURE_ATTRS = {
  "outdoor-seating": "OutdoorSeating",
  "wheelchair-accessible": "WheelchairAccessible",
  "dogs-allowed": "DogsAllowed",
  "good-for-kids": "GoodForKids",
  "credit-cards": "BusinessAcceptsCreditCards",
  "free-wifi": "WiFi.free",
};

export function cleanText(value) {
  return String(value ?? "")
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function decodeHtml(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return cleanText(
    String(value ?? "").replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (match, entity) => {
      if (entity[0] === "#") {
        const hexadecimal = entity[1]?.toLowerCase() === "x";
        const codePoint = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
        return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : match;
      }
      return named[entity.toLowerCase()] ?? match;
    }),
  );
}

export function requiredText(value, name) {
  const normalized = cleanText(value);
  if (!normalized) throw new Error(`${name} must not be empty`);
  return normalized;
}

export function integerInRange(value, name, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
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

export function optionalNonNegativeInteger(value, name) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
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

export function normalizeServices(value) {
  return normalizeMappedList(value, "services", SERVICE_ATTRS);
}

export function normalizeFeatures(value) {
  return normalizeMappedList(value, "features", FEATURE_ATTRS);
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

export function normalizeOpenAt(value) {
  const raw = cleanText(value);
  if (!raw) return null;
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    throw new Error("open-at must be an ISO 8601 date-time with an explicit timezone offset");
  }
  const milliseconds = Date.parse(raw);
  if (!Number.isFinite(milliseconds)) {
    throw new Error("open-at must be a valid ISO 8601 date-time");
  }
  return Math.floor(milliseconds / 1000);
}

export function buildYelpSearchUrl({
  query,
  location,
  category,
  prices = [],
  services = [],
  features = [],
  openNow = false,
  openAt = null,
  hotAndNew = false,
  sort = "recommended",
  start = 0,
}) {
  const normalizedQuery = requiredText(query, "query");
  const normalizedLocation = requiredText(location, "location");
  if (!YELP_SEARCH_SORTS.includes(sort)) {
    throw new Error(`sort must be one of: ${YELP_SEARCH_SORTS.join(", ")}`);
  }
  if (openNow && openAt !== null) throw new Error("open-now and open-at cannot be used together");
  if (!Number.isInteger(start) || start < 0 || start % 10 !== 0) {
    throw new Error("start must be a non-negative multiple of 10");
  }

  const url = new URL("https://www.yelp.com/search");
  url.searchParams.set("find_desc", normalizedQuery);
  url.searchParams.set("find_loc", normalizedLocation);
  const normalizedCategory = cleanText(category);
  if (normalizedCategory) {
    if (!/^[a-z0-9_]+$/i.test(normalizedCategory)) {
      throw new Error(
        "category must be a Yelp category alias containing only letters, numbers, or underscores",
      );
    }
    url.searchParams.set("cflt", normalizedCategory.toLowerCase());
  }

  const attrs = [
    ...prices.map((level) => `RestaurantsPriceRange2.${level}`),
    ...services.map((service) => SERVICE_ATTRS[service]),
    ...features.map((feature) => FEATURE_ATTRS[feature]),
  ];
  if (openNow) attrs.push("OpenNow");
  if (openAt !== null) attrs.push(`OpenAt.${openAt}`);
  if (hotAndNew) attrs.push("HotAndNew");
  if (attrs.length > 0) url.searchParams.set("attrs", [...new Set(attrs)].join(","));
  if (SEARCH_SORT_PARAMS[sort]) url.searchParams.set("sortby", SEARCH_SORT_PARAMS[sort]);
  if (start > 0) url.searchParams.set("start", String(start));
  return url.toString();
}

function decodedYelpRedirect(value) {
  const url = new URL(value, "https://www.yelp.com");
  if (url.pathname !== "/adredir") return url;
  const redirect = url.searchParams.get("redirect_url");
  return redirect ? new URL(redirect) : url;
}

export function canonicalYelpBusinessUrl(value) {
  const raw = cleanText(value);
  if (!raw) return null;

  let candidate;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) {
    candidate = decodedYelpRedirect(raw);
  } else if (/^[a-z0-9][a-z0-9_-]*(?:-[a-z0-9_-]+)+$/i.test(raw)) {
    candidate = new URL(`/biz/${raw}`, "https://www.yelp.com");
  } else {
    return null;
  }

  const hostname = candidate.hostname.toLowerCase();
  if (candidate.protocol !== "https:" || !["yelp.com", "www.yelp.com"].includes(hostname)) {
    throw new Error("business URL must be an https://www.yelp.com/biz/... URL");
  }
  const match = candidate.pathname.match(/^\/biz\/([^/?#]+)\/?$/);
  if (!match) throw new Error("business URL must point to a Yelp /biz/ page");
  return `https://www.yelp.com/biz/${match[1]}`;
}

export function yelpBusinessAlias(value) {
  const canonical = canonicalYelpBusinessUrl(value);
  return canonical ? decodeURIComponent(new URL(canonical).pathname.slice("/biz/".length)) : null;
}

export function buildYelpReviewsUrl({
  businessUrl,
  sort = "recommended",
  keyword,
  rating = null,
  start = 0,
}) {
  if (!YELP_REVIEW_SORTS.includes(sort)) {
    throw new Error(`sort must be one of: ${YELP_REVIEW_SORTS.join(", ")}`);
  }
  if (!Number.isInteger(start) || start < 0 || start % 10 !== 0) {
    throw new Error("start must be a non-negative multiple of 10");
  }
  const url = new URL(canonicalYelpBusinessUrl(businessUrl));
  url.searchParams.set("sort_by", REVIEW_SORT_PARAMS[sort]);
  const normalizedKeyword = cleanText(keyword);
  if (normalizedKeyword) url.searchParams.set("q", normalizedKeyword);
  if (rating !== null) url.searchParams.set("rr", String(integerInRange(rating, "rating", 1, 5)));
  if (start > 0) url.searchParams.set("start", String(start));
  return url.toString();
}

export function buildYelpPhotosUrl({ businessUrl, category = "all" }) {
  if (!YELP_PHOTO_CATEGORIES.includes(category)) {
    throw new Error(`category must be one of: ${YELP_PHOTO_CATEGORIES.join(", ")}`);
  }
  const alias = yelpBusinessAlias(businessUrl);
  if (!alias) throw new Error("a Yelp business URL or alias is required");
  const url = new URL(`/biz_photos/${encodeURIComponent(alias)}`, "https://www.yelp.com");
  if (PHOTO_TAB_PARAMS[category]) url.searchParams.set("tab", PHOTO_TAB_PARAMS[category]);
  return url.toString();
}

export function parseCompactNumber(value) {
  const normalized = cleanText(value).replace(/,/g, "");
  const match = normalized.match(/(-?\d+(?:\.\d+)?)\s*([KMB])?/i);
  if (!match) return null;
  const base = Number(match[1]);
  const multipliers = { K: 1_000, M: 1_000_000, B: 1_000_000_000 };
  const parsed = base * (multipliers[(match[2] || "").toUpperCase()] || 1);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function parseRating(value) {
  const match = cleanText(value).match(/([0-5](?:\.\d+)?)\s*star/i);
  const parsed = match ? Number(match[1]) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanYelpUrl(value) {
  const raw = cleanText(value);
  if (!raw) return null;
  try {
    return canonicalYelpBusinessUrl(raw);
  } catch {
    return null;
  }
}

export function normalizeSearchCandidate(candidate, index, sourceUrl) {
  const rating = parseRating(candidate.rating_label ?? candidate.rating);
  const reviewCount = parseCompactNumber(candidate.review_text ?? candidate.review_count);
  const rank = Number.isInteger(candidate.rank) ? candidate.rank : index + 1;
  const price = cleanText(candidate.price);
  return {
    _pageOrder: index,
    rank,
    name: decodeHtml(candidate.name),
    rating,
    review_count: reviewCount,
    price: /^\${1,4}$/.test(price) ? price : null,
    categories: (candidate.categories || []).map(decodeHtml).filter(Boolean).join(", ") || null,
    neighborhood: decodeHtml(candidate.neighborhood) || null,
    open_status: cleanText(candidate.open_status) || null,
    services: (candidate.services || []).map(decodeHtml).filter(Boolean).join(", ") || null,
    snippet: decodeHtml(candidate.snippet) || null,
    is_sponsored: candidate.is_sponsored === true,
    image_url: cleanText(candidate.image_url) || null,
    order_url: cleanText(candidate.order_url) || null,
    url: cleanYelpUrl(candidate.url),
    source_url: sourceUrl,
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
    minRating = null,
    minReviews = null,
    openNow = false,
    sponsored = "include",
    sort = "recommended",
    limit = 10,
  },
) {
  let filtered = rows.filter((row) => {
    if (minRating !== null && (row.rating === null || row.rating < minRating)) return false;
    if (minReviews !== null && (row.review_count === null || row.review_count < minReviews))
      return false;
    if (openNow && !/^Open\b/i.test(cleanText(row.open_status))) return false;
    if (sponsored === "exclude" && row.is_sponsored) return false;
    if (sponsored === "only" && !row.is_sponsored) return false;
    return true;
  });
  if (sort === "rating") {
    filtered = [...filtered].sort(
      (a, b) =>
        (b.rating ?? -1) - (a.rating ?? -1) ||
        (b.review_count ?? -1) - (a.review_count ?? -1) ||
        a._pageOrder - b._pageOrder,
    );
  } else if (sort === "reviews") {
    filtered = [...filtered].sort(
      (a, b) =>
        (b.review_count ?? -1) - (a.review_count ?? -1) ||
        (b.rating ?? -1) - (a.rating ?? -1) ||
        a._pageOrder - b._pageOrder,
    );
  }
  return filtered.slice(0, limit).map((row, index) => ({ ...row, rank: index + 1 }));
}

function joined(value) {
  return Array.isArray(value) ? value.map(decodeHtml).filter(Boolean).join("; ") || null : null;
}

export function normalizeBusinessCandidate(candidate, sourceUrl) {
  const rating = Number(candidate.rating);
  return {
    name: decodeHtml(candidate.name),
    rating: Number.isFinite(rating) ? rating : null,
    review_count: parseCompactNumber(candidate.review_count),
    price: cleanText(candidate.price) || null,
    categories: joined(candidate.categories),
    claimed: typeof candidate.claimed === "boolean" ? candidate.claimed : null,
    open_now: typeof candidate.open_now === "boolean" ? candidate.open_now : null,
    hours_today: joined(candidate.hours_today),
    weekly_hours: joined(candidate.weekly_hours),
    address: decodeHtml(candidate.address) || null,
    neighborhood: joined(candidate.neighborhoods),
    phone: cleanText(candidate.phone) || null,
    website: cleanText(candidate.website) || null,
    menu_url: cleanText(candidate.menu_url) || null,
    attributes: joined(candidate.attributes),
    health_score: decodeHtml(candidate.health_score) || null,
    about: decodeHtml(candidate.about) || null,
    photo_url: cleanText(candidate.photo_url) || null,
    business_id: cleanText(candidate.business_id) || null,
    url: cleanYelpUrl(candidate.url) || sourceUrl,
  };
}

export function normalizeReviewCandidate(candidate, index, context) {
  const rating = parseRating(candidate.rating_label ?? candidate.rating);
  const reactions =
    candidate.reactions && typeof candidate.reactions === "object"
      ? Object.entries(candidate.reactions)
          .map(([name, count]) => `${name}: ${count}`)
          .join(", ")
      : null;
  return {
    rank: context.start + index + 1,
    author: decodeHtml(candidate.author),
    author_location: decodeHtml(candidate.author_location) || null,
    elite: decodeHtml(candidate.elite) || null,
    rating,
    date: cleanText(candidate.date) || null,
    text: cleanText(candidate.text) || null,
    photo_count: parseCompactNumber(candidate.photo_count),
    reactions: reactions || null,
    author_url: cleanText(candidate.author_url) || null,
    business: context.business,
    business_url: context.businessUrl,
    source_url: context.sourceUrl,
  };
}

export function sortReviewRows(rows, sort) {
  if (!YELP_REVIEW_SORTS.includes(sort)) {
    throw new Error(`sort must be one of: ${YELP_REVIEW_SORTS.join(", ")}`);
  }
  const ordered = [...rows];
  const originalRank = (row) => (Number.isFinite(Number(row.rank)) ? Number(row.rank) : 0);
  if (sort === "newest" || sort === "oldest") {
    const direction = sort === "newest" ? -1 : 1;
    ordered.sort((a, b) => {
      const left = Date.parse(a.date || "");
      const right = Date.parse(b.date || "");
      const leftTime = Number.isFinite(left) ? left : 0;
      const rightTime = Number.isFinite(right) ? right : 0;
      return direction * (leftTime - rightTime) || originalRank(a) - originalRank(b);
    });
  } else if (sort === "highest" || sort === "lowest") {
    const direction = sort === "highest" ? -1 : 1;
    ordered.sort(
      (a, b) =>
        direction * ((a.rating ?? -1) - (b.rating ?? -1)) || originalRank(a) - originalRank(b),
    );
  }
  return ordered;
}

export function normalizePhotoCandidate(candidate, index, context) {
  const photoUrl = cleanText(candidate.url);
  const idMatch = photoUrl.match(/\/bphoto\/([^/]+)\//);
  const width =
    candidate.width === undefined || candidate.width === null || candidate.width === ""
      ? null
      : Number(candidate.width);
  const height =
    candidate.height === undefined || candidate.height === null || candidate.height === ""
      ? null
      : Number(candidate.height);
  return {
    rank: index + 1,
    photo_id: idMatch ? idMatch[1] : null,
    category: context.category,
    caption: decodeHtml(candidate.caption) || null,
    author: decodeHtml(candidate.author) || null,
    upload_date: cleanText(candidate.upload_date) || null,
    width: Number.isFinite(width) && width > 0 ? width : null,
    height: Number.isFinite(height) && height > 0 ? height : null,
    thumbnail_url: cleanText(candidate.thumbnail_url) || null,
    photo_url: photoUrl || null,
    business: context.business,
    business_url: context.businessUrl,
    source_url: context.sourceUrl,
  };
}

export function normalizeMenuCandidate(candidate, index, context) {
  return {
    rank: index + 1,
    item_type: cleanText(candidate.item_type) || "popular_item",
    name: decodeHtml(candidate.name) || null,
    section: decodeHtml(candidate.section) || null,
    description: decodeHtml(candidate.description) || null,
    price: cleanText(candidate.price) || null,
    photo_count: parseCompactNumber(candidate.photo_count),
    review_count: parseCompactNumber(candidate.review_count),
    photo_url: cleanText(candidate.photo_url) || null,
    menu_url: cleanText(context.menuUrl) || null,
    business: context.business,
    business_url: context.businessUrl,
  };
}
