const SITE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const CATEGORY_PATTERN = /^[a-z0-9]{3}$/;

export const CATEGORY_ALIASES = Object.freeze({
  "for-sale": "sss",
  sale: "sss",
  housing: "hhh",
  apartments: "apa",
  rooms: "roo",
  jobs: "jjj",
  gigs: "ggg",
  services: "bbb",
  community: "ccc",
  events: "eee",
  resumes: "rrr",
  autos: "aut",
  cars: "cta",
  motorcycles: "mca",
  bicycles: "bia",
  bikes: "bia",
  electronics: "ela",
  furniture: "fua",
  free: "zip",
  pets: "pet",
  tickets: "tia",
});

export const CONDITION_VALUES = Object.freeze({
  new: "10",
  "like-new": "20",
  excellent: "30",
  good: "40",
  fair: "50",
  salvage: "60",
});

export const SEARCH_SORTS = ["newest", "relevant", "price-low", "price-high"];

const SORT_VALUES = Object.freeze({
  newest: "date",
  relevant: "rel",
  "price-low": "priceasc",
  "price-high": "pricedsc",
});

const RESERVED_CUSTOM_PARAMS = new Set(["cat", "query", "s", "sort"]);

export function cleanText(value) {
  return typeof value === "string"
    ? value
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";
}

export function cleanMultilineText(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) =>
      line
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+/g, " ")
        .trim(),
    )
    .filter((line, index, lines) => line || (index > 0 && lines[index - 1]))
    .join("\n")
    .trim();
}

export function integerInRange(value, name, minimum, maximum) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return number;
}

export function optionalNumber(value, name, { integer = false, minimum = 0 } = {}) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || (integer && !Number.isInteger(number))) {
    const kind = integer ? "an integer" : "a number";
    throw new Error(`${name} must be ${kind} greater than or equal to ${minimum}`);
  }
  return number;
}

export function validateRange(minimum, maximum, label) {
  if (minimum !== null && maximum !== null && minimum > maximum) {
    throw new Error(`min-${label} cannot be greater than max-${label}`);
  }
}

export function normalizeSite(value) {
  const raw = cleanText(value).toLowerCase();
  if (!raw) throw new Error("site is required; use `craigslist locations` to find a site code");

  let code = raw;
  if (raw.includes("://")) {
    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error(`invalid Craigslist site URL: ${value}`);
    }
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "www.craigslist.org") {
      const areaMatch = parsed.pathname.match(/^\/(?:search\/)?area\/([a-z0-9-]+)(?:\/|$)/);
      code = areaMatch?.[1] || "www";
    } else {
      code = hostname.replace(/\.craigslist\.org$/, "");
    }
  } else {
    code = raw.replace(/\/$/, "").replace(/\.craigslist\.org$/, "");
  }

  if (code === "www" || !SITE_PATTERN.test(code)) {
    throw new Error(
      `invalid Craigslist site "${value}"; pass a site code such as sfbay, newyork, or london`,
    );
  }
  return code;
}

export function normalizeCategory(value) {
  const raw = cleanText(value || "for-sale")
    .toLowerCase()
    .replace(/[ _]+/g, "-");
  const category = CATEGORY_ALIASES[raw] || raw;
  if (!CATEGORY_PATTERN.test(category)) {
    throw new Error(
      `invalid category "${value}"; pass a three-character code or a common alias, or run \`craigslist categories\``,
    );
  }
  return category;
}

export function parseConditionValues(value) {
  const rawValues = cleanText(value)
    .split(",")
    .map((entry) => entry.trim().toLowerCase().replace(/[ _]+/g, "-"))
    .filter(Boolean);
  const values = [];
  for (const raw of rawValues) {
    const normalized = CONDITION_VALUES[raw] || raw;
    if (!/^\d+$/.test(normalized)) {
      throw new Error(
        `invalid condition "${raw}"; use new, like-new, excellent, good, fair, salvage, or a Craigslist numeric value`,
      );
    }
    if (!values.includes(normalized)) values.push(normalized);
  }
  return values;
}

export function appendCustomParams(url, value) {
  const raw = cleanText(value);
  if (!raw) return url;
  const query = raw.startsWith("?") ? raw.slice(1) : raw;
  const parameters = new URLSearchParams(query);
  for (const [key, parameterValue] of parameters.entries()) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]*$/.test(key)) {
      throw new Error(`invalid custom parameter name "${key}"`);
    }
    if (RESERVED_CUSTOM_PARAMS.has(key)) {
      throw new Error(`custom parameter "${key}" must use its dedicated command option`);
    }
    url.searchParams.append(key, parameterValue);
  }
  return url;
}

function setBooleanParam(url, enabled, name) {
  if (enabled === true) url.searchParams.set(name, "1");
}

function setOptionalParam(url, value, name) {
  if (value !== null && value !== undefined && value !== "") {
    url.searchParams.set(name, String(value));
  }
}

export function buildSearchUrl(options) {
  const site = normalizeSite(options.site);
  const category = normalizeCategory(options.category);
  const sort = cleanText(options.sort || "newest").toLowerCase();
  if (!SEARCH_SORTS.includes(sort)) {
    throw new Error(`sort must be one of: ${SEARCH_SORTS.join(", ")}`);
  }

  const minPrice = optionalNumber(options.minPrice, "min-price");
  const maxPrice = optionalNumber(options.maxPrice, "max-price");
  const radius = optionalNumber(options.radius, "radius");
  const minBedrooms = optionalNumber(options.minBedrooms, "min-bedrooms", { integer: true });
  const maxBedrooms = optionalNumber(options.maxBedrooms, "max-bedrooms", { integer: true });
  const minBathrooms = optionalNumber(options.minBathrooms, "min-bathrooms");
  const maxBathrooms = optionalNumber(options.maxBathrooms, "max-bathrooms");
  const minSqft = optionalNumber(options.minSqft, "min-sqft", { integer: true });
  const maxSqft = optionalNumber(options.maxSqft, "max-sqft", { integer: true });
  const minYear = optionalNumber(options.minYear, "min-year", { integer: true, minimum: 1900 });
  const maxYear = optionalNumber(options.maxYear, "max-year", { integer: true, minimum: 1900 });
  const minOdometer = optionalNumber(options.minOdometer, "min-odometer", { integer: true });
  const maxOdometer = optionalNumber(options.maxOdometer, "max-odometer", { integer: true });
  const offset = optionalNumber(options.offset, "offset", { integer: true }) ?? 0;
  const seller = cleanText(options.seller || "any").toLowerCase();

  validateRange(minPrice, maxPrice, "price");
  validateRange(minBedrooms, maxBedrooms, "bedrooms");
  validateRange(minBathrooms, maxBathrooms, "bathrooms");
  validateRange(minSqft, maxSqft, "sqft");
  validateRange(minYear, maxYear, "year");
  validateRange(minOdometer, maxOdometer, "odometer");
  if (radius !== null && !cleanText(options.postal)) {
    throw new Error("postal is required when radius is set");
  }
  if (!["any", "owner", "dealer"].includes(seller)) {
    throw new Error("seller must be one of: any, owner, dealer");
  }

  const url = new URL(`https://${site}.craigslist.org/search/${category}`);
  setOptionalParam(url, cleanText(options.query), "query");
  url.searchParams.set("sort", SORT_VALUES[sort]);
  setOptionalParam(url, offset || null, "s");
  setOptionalParam(url, minPrice, "min_price");
  setOptionalParam(url, maxPrice, "max_price");
  setOptionalParam(url, cleanText(options.postal), "postal");
  setOptionalParam(url, radius, "search_distance");
  setOptionalParam(url, seller === "any" ? null : seller, "purveyor");
  setOptionalParam(url, minBedrooms, "min_bedrooms");
  setOptionalParam(url, maxBedrooms, "max_bedrooms");
  setOptionalParam(url, minBathrooms, "min_bathrooms");
  setOptionalParam(url, maxBathrooms, "max_bathrooms");
  setOptionalParam(url, minSqft, "minSqft");
  setOptionalParam(url, maxSqft, "maxSqft");
  setOptionalParam(url, minYear, "min_auto_year");
  setOptionalParam(url, maxYear, "max_auto_year");
  setOptionalParam(url, minOdometer, "min_auto_miles");
  setOptionalParam(url, maxOdometer, "max_auto_miles");
  setOptionalParam(url, cleanText(options.makeModel), "auto_make_model");

  if (options.titlesOnly === true) url.searchParams.set("srchType", "T");
  setBooleanParam(url, options.hasImage, "hasPic");
  setBooleanParam(url, options.postedToday, "postedToday");
  setBooleanParam(url, options.hideDuplicates, "bundleDuplicates");
  setBooleanParam(url, options.includeNearby, "searchNearby");
  setBooleanParam(url, options.remote, "is_telecommuting");
  setBooleanParam(url, options.internship, "is_internship");
  setBooleanParam(url, options.nonprofit, "is_nonprofit");
  setBooleanParam(url, options.catsOk, "pets_cat");
  setBooleanParam(url, options.dogsOk, "pets_dog");
  setBooleanParam(url, options.furnished, "is_furnished");
  setBooleanParam(url, options.noSmoking, "no_smoking");
  setBooleanParam(url, options.wheelchair, "wheelchaccess");
  setBooleanParam(url, options.evCharging, "ev_charging");
  setBooleanParam(url, options.airConditioning, "airconditioning");
  setBooleanParam(url, options.deliveryAvailable, "delivery_available");

  for (const condition of parseConditionValues(options.condition)) {
    url.searchParams.append("condition", condition);
  }
  appendCustomParams(url, options.params);
  return url.toString();
}

export function parsePriceText(value) {
  const text = cleanText(value);
  if (!text) return null;
  const match = text.match(/-?\d[\d.,\s]*/);
  if (!match) return null;
  let numeric = match[0].replace(/\s/g, "");
  const lastDot = numeric.lastIndexOf(".");
  const lastComma = numeric.lastIndexOf(",");
  if (lastDot !== -1 && lastComma !== -1) {
    const decimalIndex = Math.max(lastDot, lastComma);
    const decimalDigits = numeric.length - decimalIndex - 1;
    if (decimalDigits === 1 || decimalDigits === 2) {
      numeric = `${numeric.slice(0, decimalIndex).replace(/[.,]/g, "")}.${numeric.slice(decimalIndex + 1)}`;
    } else {
      numeric = numeric.replace(/[.,]/g, "");
    }
  } else {
    const separator = lastDot !== -1 ? "." : lastComma !== -1 ? "," : "";
    if (separator) {
      const parts = numeric.split(separator);
      const finalDigits = parts.at(-1)?.length || 0;
      numeric =
        parts.length === 2 && (finalDigits === 1 || finalDigits === 2)
          ? `${parts[0]}.${parts[1]}`
          : parts.join("");
    }
  }
  const number = Number(numeric);
  return Number.isFinite(number) ? number : null;
}

export function parseRelativeAgeMinutes(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return null;
  if (/^(?:now|just now|<1\s*min)/.test(text)) return 0;
  const match = text.match(/<?\s*(\d+(?:\.\d+)?)\s*(min|minute|hr|hour|day|week|month)/);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit.startsWith("min")
    ? 1
    : unit.startsWith("hr") || unit.startsWith("hour")
      ? 60
      : unit.startsWith("day")
        ? 1_440
        : unit.startsWith("week")
          ? 10_080
          : 43_200;
  const minutes = Math.round(amount * multiplier);
  return text.trimStart().startsWith("<") ? Math.max(0, minutes - 1) : minutes;
}

function absoluteUrl(value, sourceUrl) {
  const raw = cleanText(value);
  if (!raw) return "";
  try {
    return new URL(raw, sourceUrl).toString();
  } catch {
    return "";
  }
}

export function normalizeSearchCandidate(candidate, index, context) {
  const priceText = cleanText(candidate?.price_text);
  const posted = cleanText(candidate?.posted);
  const title = cleanText(candidate?.title);
  const url = absoluteUrl(candidate?.url, context.sourceUrl);
  const postId =
    cleanText(candidate?.post_id) || (url.match(/\/(\d{9,})\.html(?:$|[?#])/)?.[1] ?? "");
  const imageUrls = Array.isArray(candidate?.image_urls)
    ? [
        ...new Set(
          candidate.image_urls
            .map((entry) => absoluteUrl(entry, context.sourceUrl))
            .filter(Boolean),
        ),
      ]
    : [];
  const indicatedImageCount = Number(candidate?.image_count);
  const postedAt = cleanText(candidate?.posted_at);
  const parsedPostedAt = Date.parse(postedAt);

  return {
    rank: index + 1,
    post_id: postId,
    title,
    price: parsePriceText(priceText),
    price_text: priceText,
    location: cleanText(candidate?.location).replace(/^\(|\)$/g, ""),
    posted,
    posted_at: Number.isNaN(parsedPostedAt) ? postedAt : new Date(parsedPostedAt).toISOString(),
    age_minutes: parseRelativeAgeMinutes(posted),
    snippet: cleanText(candidate?.snippet),
    image_count: Number.isFinite(indicatedImageCount)
      ? Math.max(indicatedImageCount, imageUrls.length)
      : imageUrls.length,
    image_url: imageUrls[0] || "",
    category: context.category,
    site: context.site,
    url,
    _pageOrder: index,
  };
}

export function dedupeSearchRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = row.post_id || row.url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sortAndLimitSearchRows(rows, { sort, limit }) {
  const sorted = [...rows];
  if (sort === "price-low" || sort === "price-high") {
    const direction = sort === "price-low" ? 1 : -1;
    sorted.sort((left, right) => {
      const leftMissing = left.price === null;
      const rightMissing = right.price === null;
      if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
      if (!leftMissing && left.price !== right.price) return direction * (left.price - right.price);
      return left._pageOrder - right._pageOrder;
    });
  }
  return sorted
    .slice(0, limit)
    .map(({ _pageOrder, ...row }, index) => ({ ...row, rank: index + 1 }));
}

export function normalizeListingUrl(value) {
  const raw = cleanText(value);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      "listing must be a full Craigslist listing URL returned by `craigslist search`",
    );
  }
  const hostname = url.hostname.toLowerCase();
  if (!(hostname === "craigslist.org" || hostname.endsWith(".craigslist.org"))) {
    throw new Error("listing URL must be hosted on craigslist.org");
  }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.port) {
    throw new Error(
      "listing URL must be a standard HTTP(S) Craigslist URL without credentials or a port",
    );
  }
  const isCurrent = /^\/view\/d\/[^/]+\/[^/]+\/?$/.test(url.pathname);
  const isLegacy = /\/d\/[^/]+\/\d{9,}\.html$/.test(url.pathname);
  if (!isCurrent && !isLegacy) {
    throw new Error("URL does not look like a Craigslist listing detail page");
  }
  url.protocol = "https:";
  url.hash = "";
  return url.toString();
}

export function filterLocations(rows, { query, section, limit }) {
  const needle = cleanText(query).toLowerCase();
  const sectionNeedle = cleanText(section).toLowerCase();
  const seen = new Set();
  return rows
    .filter((row) => {
      if (sectionNeedle && cleanText(row.section).toLowerCase() !== sectionNeedle) return false;
      if (
        needle &&
        ![row.code, row.name, row.region, row.section]
          .map((value) => cleanText(value).toLowerCase())
          .some((value) => value.includes(needle))
      ) {
        return false;
      }
      const code = cleanText(row.code).toLowerCase();
      if (!code || seen.has(code)) return false;
      seen.add(code);
      return true;
    })
    .slice(0, limit);
}

export function filterCategories(rows, { query, group, limit }) {
  const needle = cleanText(query).toLowerCase();
  const groupNeedle = cleanText(group).toLowerCase();
  const seen = new Set();
  return rows
    .filter((row) => {
      const code = cleanText(row.code).toLowerCase();
      if (groupNeedle && cleanText(row.group).toLowerCase() !== groupNeedle) return false;
      if (
        needle &&
        ![row.code, row.name, row.group]
          .map((value) => cleanText(value).toLowerCase())
          .some((value) => value.includes(needle))
      ) {
        return false;
      }
      if (!code || seen.has(code)) return false;
      seen.add(code);
      return true;
    })
    .slice(0, limit);
}
