import {
  cleanText,
  integerInRange,
  normalizeRegion,
  parseCompactNumber,
} from "./shopping-helpers.mjs";

export const MAPS_OPERATIONS = ["search", "place", "reviews", "directions"];
export const MAPS_SORTS = ["relevance", "rating", "reviews"];
export const MAPS_REVIEW_SORTS = ["relevant", "newest", "highest", "lowest"];
export const MAPS_REVIEW_SORT_LABELS = {
  relevant: "Most relevant",
  newest: "Newest",
  highest: "Highest rating",
  lowest: "Lowest rating",
};
export const MAPS_TRAVEL_MODES = ["driving", "walking", "bicycling", "two-wheeler", "transit"];
export const MAPS_AVOID_OPTIONS = ["ferries", "highways", "tolls"];

export { cleanText, integerInRange, normalizeRegion };

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

function requiredText(value, name) {
  const normalized = cleanText(String(value || ""));
  if (!normalized) throw new Error(`${name} must not be empty`);
  return normalized;
}

export function parseDelimitedList(value, delimiter = ",") {
  return String(value || "")
    .split(delimiter)
    .map(cleanText)
    .filter(Boolean);
}

export function normalizeAvoid(value) {
  const values = [...new Set(parseDelimitedList(value).map((item) => item.toLowerCase()))];
  const invalid = values.filter((item) => !MAPS_AVOID_OPTIONS.includes(item));
  if (invalid.length > 0) {
    throw new Error(
      `avoid contains unsupported values: ${invalid.join(", ")}; use ferries, highways, or tolls`,
    );
  }
  return values;
}

function normalizePipeList(value, name, maximum = 9) {
  const values = parseDelimitedList(value, "|");
  if (values.length > maximum) {
    throw new Error(`${name} supports at most ${maximum} pipe-separated values`);
  }
  return values;
}

export function buildMapsUrl({
  operation,
  query,
  near,
  placeId,
  destination,
  originPlaceId,
  destinationPlaceId,
  waypoints,
  waypointPlaceIds,
  travelMode = "driving",
  avoid,
  region = "US",
}) {
  const normalizedOperation = requiredText(operation, "operation").toLowerCase();
  if (!MAPS_OPERATIONS.includes(normalizedOperation)) {
    throw new Error(`operation must be one of: ${MAPS_OPERATIONS.join(", ")}`);
  }

  const normalizedQuery = requiredText(query, "query");
  const normalizedRegion = normalizeRegion(region);
  let url;

  if (normalizedOperation === "directions") {
    const normalizedDestination = requiredText(destination, "to");
    if (!MAPS_TRAVEL_MODES.includes(travelMode)) {
      throw new Error(`travel-mode must be one of: ${MAPS_TRAVEL_MODES.join(", ")}`);
    }

    const normalizedWaypoints = normalizePipeList(waypoints, "waypoints");
    const normalizedWaypointPlaceIds = normalizePipeList(waypointPlaceIds, "waypoint-place-ids");
    if (travelMode === "transit" && normalizedWaypoints.length > 0) {
      throw new Error("waypoints are not supported for transit directions");
    }
    if (
      normalizedWaypointPlaceIds.length > 0 &&
      normalizedWaypointPlaceIds.length !== normalizedWaypoints.length
    ) {
      throw new Error("waypoint-place-ids must contain one pipe-separated id for every waypoint");
    }

    url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("origin", normalizedQuery);
    url.searchParams.set("destination", normalizedDestination);
    url.searchParams.set("travelmode", travelMode);
    if (cleanText(originPlaceId)) url.searchParams.set("origin_place_id", cleanText(originPlaceId));
    if (cleanText(destinationPlaceId)) {
      url.searchParams.set("destination_place_id", cleanText(destinationPlaceId));
    }
    if (normalizedWaypoints.length > 0) {
      url.searchParams.set("waypoints", normalizedWaypoints.join("|"));
    }
    if (normalizedWaypointPlaceIds.length > 0) {
      url.searchParams.set("waypoint_place_ids", normalizedWaypointPlaceIds.join("|"));
    }
    const avoidedFeatures = normalizeAvoid(avoid);
    if (avoidedFeatures.length > 0) url.searchParams.set("avoid", avoidedFeatures.join(","));
  } else {
    url = new URL("https://www.google.com/maps/search/");
    url.searchParams.set("api", "1");
    const normalizedNear = cleanText(near);
    const searchQuery =
      normalizedOperation === "search" && normalizedNear
        ? `${normalizedQuery} near ${normalizedNear}`
        : normalizedQuery;
    url.searchParams.set("query", searchQuery);
    if (cleanText(placeId)) url.searchParams.set("query_place_id", cleanText(placeId));
  }

  // The DOM parser relies on English accessibility labels while gl keeps local
  // search ranking and address conventions tied to the requested country.
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", normalizedRegion);
  if (url.toString().length > 2048) {
    throw new Error("the generated Google Maps URL exceeds the 2,048 character limit");
  }
  return url.toString();
}

export function parseCoordinatesFromUrl(value) {
  const url = cleanText(value);
  const dataCoordinates = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const viewportCoordinates = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const match = dataCoordinates || viewportCoordinates;
  if (!match) return { latitude: null, longitude: null };
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return {
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
  };
}

export function parseMapsRatingLabel(value) {
  const label = cleanText(value);
  const ratingMatch =
    label.match(/([0-5](?:[.,]\d+)?)\s+stars?/i) || label.match(/([0-5](?:[.,]\d+)?)\s*\/\s*5\b/);
  const reviewsMatch = label.match(/([0-9][0-9.,]*\s*[KMB]?)\s+reviews?/i);
  const rating = ratingMatch ? Number(ratingMatch[1].replace(",", ".")) : null;
  return {
    rating: Number.isFinite(rating) ? rating : null,
    review_count: reviewsMatch ? parseCompactNumber(reviewsMatch[1]) : null,
  };
}

function cleanMapsDisplayText(value) {
  return cleanText(value)
    .replace(/[\uE000-\uF8FF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulFragments(value) {
  return cleanText(value)
    .split(/\s*·\s*/)
    .map(cleanText)
    .filter((fragment) => /[\p{L}\p{N}]/u.test(fragment));
}

function searchMetadata(lines, ratingLabel) {
  const rating = parseMapsRatingLabel(ratingLabel);
  const ratingLine = lines.find((line) => /[0-5](?:[.,]\d+)?\s*\(/.test(line)) || "";
  const priceMatch = ratingLine.match(
    /((?:[$€£¥₹₩₱฿]{1,3}|[A-Z]{3}\s*)\s*\d+(?:[.,]\d+)?\s*[–-]\s*\d+(?:[.,]\d+)?|[$€£¥₹₩₱฿]{1,4})/,
  );
  return {
    ...rating,
    price_level: cleanText(priceMatch && priceMatch[1]) || null,
  };
}

export function normalizeMapsSearchCandidate(candidate, index, sourceUrl) {
  const name = cleanText(candidate.name);
  const lines = (candidate.lines || []).map(cleanText).filter(Boolean);
  const metadata = searchMetadata(lines, candidate.rating_label);
  const openStatus = lines.find((line) => /^(?:Open|Closed|Temporarily closed)\b/i.test(line));
  const infoLine = lines.find((line) => {
    if (!line.includes("·") || line === openStatus || /[0-5](?:[.,]\d+)?\s*\(/.test(line)) {
      return false;
    }
    return meaningfulFragments(line).length > 0;
  });
  const info = meaningfulFragments(infoLine);
  const coordinates = parseCoordinatesFromUrl(candidate.url);

  return {
    _pageOrder: index,
    result_type: "place",
    rank: index + 1,
    page_rank: index + 1,
    name,
    category: info[0] || null,
    rating: metadata.rating,
    review_count: metadata.review_count,
    price_level: metadata.price_level,
    address: info.length > 1 ? info[info.length - 1] : null,
    open_status: cleanText(openStatus) || null,
    is_sponsored: candidate.is_sponsored === true,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    url: cleanText(candidate.url) || sourceUrl,
    source_url: sourceUrl,
  };
}

export function dedupeMapsRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const identity = row.url
      ? `url:${row.url}`
      : `place:${cleanText(row.name).toLowerCase()}:${cleanText(row.address).toLowerCase()}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function descendingWithMissingLast(left, right, field) {
  const leftValue = left[field];
  const rightValue = right[field];
  if (leftValue === null || leftValue === undefined) {
    return rightValue === null || rightValue === undefined ? left._pageOrder - right._pageOrder : 1;
  }
  if (rightValue === null || rightValue === undefined) return -1;
  return rightValue - leftValue || left._pageOrder - right._pageOrder;
}

export function filterAndSortMapsRows(rows, options) {
  let filtered = rows.filter((row) => {
    if (options.minRating !== null && (row.rating === null || row.rating < options.minRating)) {
      return false;
    }
    if (
      options.minReviews !== null &&
      (row.review_count === null || row.review_count < options.minReviews)
    ) {
      return false;
    }
    if (options.openNow && !/^Open\b/i.test(row.open_status || "")) return false;
    return true;
  });

  if (options.sort === "rating") {
    filtered = [...filtered].sort((left, right) =>
      descendingWithMissingLast(left, right, "rating"),
    );
  } else if (options.sort === "reviews") {
    filtered = [...filtered].sort((left, right) =>
      descendingWithMissingLast(left, right, "review_count"),
    );
  }

  return filtered.slice(0, options.limit).map((row, index) => {
    const { _pageOrder: _internalPageOrder, ...result } = row;
    return { ...result, rank: index + 1 };
  });
}

export function normalizeMapsPlaceCandidate(candidate, sourceUrl) {
  const coordinates = parseCoordinatesFromUrl(candidate.url || sourceUrl);
  const rating = parseMapsRatingLabel(
    `${candidate.rating_label || ""} ${candidate.reviews_label || ""}`,
  );
  return {
    result_type: "place_detail",
    rank: 1,
    name: cleanText(candidate.name),
    category: cleanText(candidate.category) || null,
    rating: rating.rating,
    review_count: rating.review_count,
    price_level: cleanText(candidate.price_level) || null,
    address: cleanText(candidate.address) || null,
    open_status: cleanText(candidate.open_status) || null,
    hours: cleanText(candidate.hours) || null,
    phone: cleanText(candidate.phone) || null,
    website: cleanText(candidate.website) || null,
    plus_code: cleanText(candidate.plus_code) || null,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    url: cleanText(candidate.url) || sourceUrl,
    source_url: sourceUrl,
  };
}

function reviewAuthorMetadata(value) {
  const metadata = cleanText(value);
  const reviewMatch = metadata.match(/([0-9][0-9.,]*\s*[KMB]?)\s+reviews?/i);
  const photoMatch = metadata.match(/([0-9][0-9.,]*\s*[KMB]?)\s+photos?/i);
  return {
    local_guide: /(?:^|\s*[·•]\s*)Local Guide(?:\s*[·•]|$)/i.test(metadata),
    author_review_count: reviewMatch ? parseCompactNumber(reviewMatch[1]) : null,
    author_photo_count: photoMatch ? parseCompactNumber(photoMatch[1]) : null,
  };
}

function parseMapsLikeCount(value) {
  const label = cleanText(value);
  if (!label || /^Like$/i.test(label)) return 0;
  const match = label.match(/([0-9][0-9.,]*\s*[KMB]?)\s+likes?/i);
  return match ? parseCompactNumber(match[1]) : null;
}

export function normalizeMapsReviewCandidate(candidate, index, context) {
  const rating = parseMapsRatingLabel(candidate.rating_label).rating;
  const author = reviewAuthorMetadata(candidate.author_metadata);
  return {
    result_type: "review",
    rank: index + 1,
    review_id: cleanText(candidate.review_id) || null,
    author: cleanText(candidate.author) || null,
    author_url: cleanText(candidate.author_url) || null,
    ...author,
    rating,
    date: cleanText(candidate.date) || null,
    review_source: cleanText(candidate.review_source) || "Google",
    text: cleanText(candidate.text) || null,
    language: cleanText(candidate.language) || null,
    photo_count: optionalNonNegativeInteger(candidate.photo_count, "photo_count") ?? 0,
    like_count: parseMapsLikeCount(candidate.like_label),
    owner_response: cleanText(candidate.owner_response) || null,
    owner_response_date: cleanText(candidate.owner_response_date) || null,
    business: context.business,
    business_url: context.businessUrl,
    source_url: context.sourceUrl,
  };
}

export function filterMapsReviewRows(rows, { rating, limit }) {
  return rows
    .filter((row) => rating === null || row.rating === rating)
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function normalizeMapsRouteCandidate(candidate, index, context) {
  return {
    result_type: "route",
    rank: index + 1,
    name: cleanMapsDisplayText(candidate.name) || `Route ${index + 1}`,
    origin: context.origin,
    destination: context.destination,
    waypoints: context.waypoints,
    travel_mode: cleanText(candidate.travel_mode).toLowerCase() || context.travelMode,
    duration: cleanMapsDisplayText(candidate.duration) || null,
    distance: cleanMapsDisplayText(candidate.distance) || null,
    details: cleanMapsDisplayText(candidate.details) || null,
    url: context.sourceUrl,
    source_url: context.sourceUrl,
  };
}
