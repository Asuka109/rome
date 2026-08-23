const REGION_CURRENCIES = {
  AR: "ARS",
  AU: "AUD",
  BR: "BRL",
  CA: "CAD",
  CH: "CHF",
  CL: "CLP",
  CN: "CNY",
  CO: "COP",
  GB: "GBP",
  HK: "HKD",
  ID: "IDR",
  IN: "INR",
  JP: "JPY",
  KR: "KRW",
  MX: "MXN",
  MY: "MYR",
  NZ: "NZD",
  PH: "PHP",
  SG: "SGD",
  TH: "THB",
  TR: "TRY",
  TW: "TWD",
  US: "USD",
  VN: "VND",
  ZA: "ZAR",
};

const EURO_REGIONS = new Set([
  "AT",
  "BE",
  "CY",
  "DE",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PT",
  "SI",
  "SK",
]);

export function cleanText(value) {
  return typeof value === "string"
    ? value
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";
}

export function uniqueText(values) {
  return [...new Set((values || []).map(cleanText).filter(Boolean))];
}

export function parseStringList(value) {
  return uniqueText(String(value || "").split(",")).map((item) => item.toLowerCase());
}

export function integerInRange(value, name, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

export function optionalNonNegativeNumber(value, name, maximum = Number.POSITIVE_INFINITY) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > maximum) {
    const upperBound = Number.isFinite(maximum) ? ` and at most ${maximum}` : "";
    throw new Error(`${name} must be a non-negative number${upperBound}`);
  }
  return parsed;
}

export function normalizeRegion(value) {
  const region = cleanText(String(value || "US")).toUpperCase();
  if (!/^[A-Z]{2}$/.test(region)) {
    throw new Error("region must be a two-letter country code");
  }
  return region;
}

export function buildShoppingUrl({ query, region = "US" }) {
  const normalizedQuery = cleanText(query);
  if (!normalizedQuery) throw new Error("query must not be empty");

  const url = new URL("https://www.google.com/search");
  url.searchParams.set("udm", "28");
  url.searchParams.set("q", normalizedQuery);
  // Extraction and text filters rely on Google's English accessibility labels.
  // Keep the rendered language fixed while allowing region/currency localization.
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", normalizeRegion(region));
  return url.toString();
}

function regionCurrency(region) {
  const normalizedRegion = normalizeRegion(region);
  if (EURO_REGIONS.has(normalizedRegion)) return "EUR";
  return REGION_CURRENCIES[normalizedRegion] || null;
}

function parseLocaleNumber(value) {
  const compact = cleanText(value).replace(/[\s']/g, "");
  const match = compact.match(/[0-9][0-9.,]*/);
  if (!match) return null;

  // ARIA labels end sentences with punctuation immediately after the amount
  // (for example "Current price: €194.99."). That final punctuation is not
  // part of the localized number.
  let numeric = match[0].replace(/[.,]+$/, "");
  const comma = numeric.lastIndexOf(",");
  const dot = numeric.lastIndexOf(".");
  const separator = Math.max(comma, dot);
  const trailingDigits = separator === -1 ? 0 : numeric.length - separator - 1;

  if (comma !== -1 && dot !== -1) {
    const decimalSeparator = trailingDigits > 0 && trailingDigits <= 2 ? numeric[separator] : null;
    numeric = numeric.replace(/[.,]/g, (character, index) =>
      character === decimalSeparator && index === separator ? "." : "",
    );
  } else if (separator !== -1) {
    const separatorCharacter = numeric[separator];
    const separatorCount = numeric.split(separatorCharacter).length - 1;
    const isDecimal = trailingDigits > 0 && trailingDigits <= 2 && separatorCount === 1;
    numeric = isDecimal
      ? `${numeric.slice(0, separator).replace(/[.,]/g, "")}.${numeric.slice(separator + 1)}`
      : numeric.replace(/[.,]/g, "");
  }

  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : null;
}

export function inferCurrency(priceText, region = "US") {
  const text = cleanText(priceText);
  const explicitCode = text.match(
    /\b(ARS|AUD|BRL|CAD|CHF|CLP|CNY|COP|EUR|GBP|HKD|IDR|INR|JPY|KRW|MXN|MYR|NZD|PHP|SGD|THB|TRY|TWD|USD|VND|ZAR)\b/i,
  );
  if (explicitCode) return explicitCode[1].toUpperCase();
  // Match the complete dollar prefix at a non-letter boundary. Otherwise the
  // short forms misclassify US$ as S$ and CA$ as A$.
  const dollarPrefix = text.match(/(?:^|[^A-Z])(US|CA|AU|HK|MX|NZ|SG|NT|A|C|S)\$/i);
  if (dollarPrefix) {
    return {
      US: "USD",
      CA: "CAD",
      AU: "AUD",
      HK: "HKD",
      MX: "MXN",
      NZ: "NZD",
      SG: "SGD",
      NT: "TWD",
      A: "AUD",
      C: "CAD",
      S: "SGD",
    }[dollarPrefix[1].toUpperCase()];
  }
  if (text.includes("€")) return "EUR";
  if (text.includes("£")) return "GBP";
  if (text.includes("₹")) return "INR";
  if (text.includes("₩")) return "KRW";
  if (text.includes("₱")) return "PHP";
  if (text.includes("฿")) return "THB";
  if (text.includes("₫")) return "VND";
  if (text.includes("R$")) return "BRL";
  if (/[¥￥]/.test(text)) return normalizeRegion(region) === "CN" ? "CNY" : "JPY";
  if (text.includes("$")) return regionCurrency(region) || "USD";
  return regionCurrency(region);
}

export function parsePriceText(priceText, region = "US") {
  const normalizedText = cleanText(priceText);
  return {
    text: normalizedText || null,
    value: parseLocaleNumber(normalizedText),
    currency: normalizedText ? inferCurrency(normalizedText, region) : null,
  };
}

export function parseCompactNumber(value) {
  const normalized = cleanText(value).replace(/[()]/g, "");
  const match = normalized.match(/([0-9]+(?:[.,][0-9]+)*)\s*([KMB])?/i);
  if (!match) return null;
  const suffix = (match[2] || "").toUpperCase();
  const lastSeparator = Math.max(match[1].lastIndexOf(","), match[1].lastIndexOf("."));
  const trailingDigits = lastSeparator === -1 ? 0 : match[1].length - lastSeparator - 1;
  const numericText =
    suffix && trailingDigits > 0 && trailingDigits <= 2
      ? `${match[1].slice(0, lastSeparator).replace(/[.,]/g, "")}.${match[1].slice(lastSeparator + 1)}`
      : match[1].replace(/[.,]/g, "");
  const number = Number(numericText);
  if (!Number.isFinite(number)) return null;
  const multipliers = { K: 1_000, M: 1_000_000, B: 1_000_000_000 };
  return Math.round(number * (multipliers[suffix] || 1));
}

export function parseRatingValue(value) {
  const normalized = cleanText(value);
  const match =
    normalized.match(/rated\s+([0-5](?:[.,][0-9]+)?)/i) ||
    normalized.match(/^([0-5](?:[.,][0-9]+)?)\s*(?:\(|out of)/i);
  if (!match) return null;
  const rating = Number(match[1].replace(",", "."));
  return Number.isFinite(rating) && rating >= 0 && rating <= 5 ? rating : null;
}

export function parseReviewCount(value) {
  const normalized = cleanText(value);
  const reviewMatch = normalized.match(
    /([0-9]+(?:[.,][0-9]+)*\s*[KMB]?\+?)\s+(?:user\s+)?reviews?/i,
  );
  if (reviewMatch) return parseCompactNumber(reviewMatch[1]);
  const parenthetical = normalized.match(/\(([0-9]+(?:[.,][0-9]+)*\s*[KMB]?\+?)\)/i);
  return parenthetical ? parseCompactNumber(parenthetical[1]) : null;
}

export function parseDiscountPercent(value, priceValue = null, originalPriceValue = null) {
  const match = cleanText(value).match(/([0-9]+(?:[.,][0-9]+)?)\s*%\s*off/i);
  if (match) return Number(match[1].replace(",", "."));
  if (
    Number.isFinite(priceValue) &&
    Number.isFinite(originalPriceValue) &&
    originalPriceValue > priceValue
  ) {
    return Math.round(((originalPriceValue - priceValue) / originalPriceValue) * 100);
  }
  return null;
}

export function normalizeProductUrl(value) {
  const normalized = cleanText(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized, "https://www.google.com");
    if (/^www\.google\./i.test(url.hostname) || url.hostname === "google.com") {
      const unwrapped = url.searchParams.get("url") || url.searchParams.get("q");
      if (unwrapped && /^https?:\/\//i.test(unwrapped)) return unwrapped;
      const adUrl = url.searchParams.get("adurl");
      if (adUrl && /^https?:\/\//i.test(adUrl)) return adUrl;
    }
    return /^https?:$/i.test(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeCondition(value, fallbackText) {
  const haystack = `${cleanText(value)} ${cleanText(fallbackText)}`;
  if (/\brefurbished\b/i.test(haystack)) return "refurbished";
  if (/\b(?:pre-owned|preowned|used)\b/i.test(haystack)) return "used";
  if (/\bnew\b/i.test(cleanText(value))) return "new";
  return "new";
}

export function normalizeShoppingCandidate(candidate, index, context) {
  const region = normalizeRegion(context.region);
  const price = parsePriceText(candidate.price_text, region);
  const parsedOriginalPrice = parsePriceText(candidate.original_price_text, region);
  const originalPrice =
    price.currency &&
    parsedOriginalPrice.currency &&
    price.currency !== parsedOriginalPrice.currency
      ? { text: null, value: null, currency: null }
      : parsedOriginalPrice;
  const discountPercent = parseDiscountPercent(
    `${candidate.discount_text || ""} ${(candidate.badges || []).join(" ")}`,
    price.value,
    originalPrice.value,
  );
  const ratingText = cleanText(candidate.rating_text);
  const productId = cleanText(candidate.product_id) || null;
  const merchantId = cleanText(candidate.merchant_id) || null;
  const offerId = cleanText(candidate.offer_id) || null;
  const directUrl = normalizeProductUrl(candidate.url);
  const productUrl = productId
    ? `https://www.google.com/shopping/product/${encodeURIComponent(productId)}?hl=en&gl=${encodeURIComponent(region)}`
    : null;
  const badges = uniqueText(candidate.badges || []);
  const isOnSale =
    Number.isFinite(discountPercent) || badges.some((badge) => /(?:\bsale\b|%\s*off)/i.test(badge));
  const condition = normalizeCondition(candidate.condition, candidate.text);

  return {
    _pageOrder: index,
    rank: index + 1,
    page_rank: index + 1,
    result_type: candidate.is_sponsored ? "sponsored_offer" : "product",
    title: cleanText(candidate.title),
    price: price.value,
    price_text: price.text,
    currency: price.currency,
    original_price: originalPrice.value,
    original_price_text: originalPrice.text,
    discount_percent: discountPercent,
    is_on_sale: isOnSale,
    merchant: cleanText(candidate.merchant),
    rating: parseRatingValue(ratingText),
    review_count: parseReviewCount(ratingText),
    condition,
    delivery: cleanText(candidate.delivery),
    returns: cleanText(candidate.returns),
    location: cleanText(candidate.location),
    details: cleanText(candidate.details),
    badges,
    is_sponsored: candidate.is_sponsored === true,
    product_id: productId,
    merchant_id: merchantId,
    offer_id: offerId,
    // Product cards may contain unrelated support/navigation anchors. Their
    // stable Google product id is a safer target; merchant offers do not have
    // a product id and continue to use their verified direct offer URL.
    url: productUrl || directUrl || context.sourceUrl,
    source_url: context.sourceUrl,
  };
}

export function dedupeShoppingRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    let identity;
    if (row.product_id) {
      identity = `product:${row.product_id}`;
    } else if (row.merchant_id && row.offer_id) {
      identity = `offer:${row.merchant_id}:${row.offer_id}`;
    } else {
      identity = [row.title, row.merchant, row.price, row.condition]
        .map((value) => cleanText(String(value ?? "")).toLowerCase())
        .join("|");
    }
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function matchesMerchant(merchant, filters) {
  if (filters.length === 0) return true;
  const normalizedMerchant = cleanText(merchant).toLowerCase();
  return filters.some((filter) => normalizedMerchant.includes(filter));
}

function isFreeShipping(delivery) {
  return /^free(?:\s|$)/i.test(cleanText(delivery));
}

function comparableValue(row, key) {
  const value = row[key];
  return Number.isFinite(value) ? value : null;
}

function compareDescending(left, right, key) {
  const leftValue = comparableValue(left, key);
  const rightValue = comparableValue(right, key);
  if (leftValue === null && rightValue === null) return left._pageOrder - right._pageOrder;
  if (leftValue === null) return 1;
  if (rightValue === null) return -1;
  return rightValue - leftValue || left._pageOrder - right._pageOrder;
}

function compareAscending(left, right, key) {
  const leftValue = comparableValue(left, key);
  const rightValue = comparableValue(right, key);
  if (leftValue === null && rightValue === null) return left._pageOrder - right._pageOrder;
  if (leftValue === null) return 1;
  if (rightValue === null) return -1;
  return leftValue - rightValue || left._pageOrder - right._pageOrder;
}

export function filterAndSortShoppingRows(rows, options) {
  const merchants = parseStringList(options.merchant);
  const excludedMerchants = parseStringList(options.excludeMerchant);
  const minPrice = options.minPrice;
  const maxPrice = options.maxPrice;
  const minRating = options.minRating;

  const filtered = rows.filter((row) => {
    if (!row.title) return false;
    if (minPrice !== null && (!Number.isFinite(row.price) || row.price < minPrice)) return false;
    if (maxPrice !== null && (!Number.isFinite(row.price) || row.price > maxPrice)) return false;
    if (minRating !== null && (!Number.isFinite(row.rating) || row.rating < minRating))
      return false;
    if (!matchesMerchant(row.merchant, merchants)) return false;
    if (excludedMerchants.length > 0 && matchesMerchant(row.merchant, excludedMerchants)) {
      return false;
    }
    if (options.onSale && !row.is_on_sale) return false;
    if (options.freeShipping && !isFreeShipping(row.delivery)) return false;
    if (options.condition !== "any" && row.condition !== options.condition) return false;
    if (options.sponsored === "exclude" && row.is_sponsored) return false;
    if (options.sponsored === "only" && !row.is_sponsored) return false;
    return true;
  });

  const sorted = [...filtered];
  if (options.sort === "price-low") {
    sorted.sort((left, right) => compareAscending(left, right, "price"));
  } else if (options.sort === "price-high") {
    sorted.sort((left, right) => compareDescending(left, right, "price"));
  } else if (options.sort === "rating") {
    sorted.sort((left, right) => compareDescending(left, right, "rating"));
  } else if (options.sort === "reviews") {
    sorted.sort((left, right) => compareDescending(left, right, "review_count"));
  } else if (options.sort === "discount") {
    sorted.sort((left, right) => compareDescending(left, right, "discount_percent"));
  }

  return sorted.slice(0, options.limit).map((row, index) => {
    const { _pageOrder, ...result } = row;
    return { ...result, rank: index + 1 };
  });
}
