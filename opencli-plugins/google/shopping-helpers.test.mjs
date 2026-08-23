import assert from "node:assert/strict";
import test from "node:test";
import {
  buildShoppingUrl,
  dedupeShoppingRows,
  filterAndSortShoppingRows,
  inferCurrency,
  normalizeProductUrl,
  normalizeShoppingCandidate,
  parseCompactNumber,
  parsePriceText,
  parseRatingValue,
  parseReviewCount,
} from "./shopping-helpers.mjs";

test("buildShoppingUrl creates an encoded Google Shopping search URL", () => {
  const url = new URL(buildShoppingUrl({ query: "noise cancelling headphones", region: "us" }));
  assert.equal(url.origin, "https://www.google.com");
  assert.equal(url.pathname, "/search");
  assert.equal(url.searchParams.get("udm"), "28");
  assert.equal(url.searchParams.get("q"), "noise cancelling headphones");
  assert.equal(url.searchParams.get("gl"), "US");
  assert.equal(url.searchParams.get("hl"), "en");
});

test("price parsing handles English and localized separators", () => {
  assert.deepEqual(parsePriceText("$1,499.00", "US"), {
    text: "$1,499.00",
    value: 1499,
    currency: "USD",
  });
  assert.deepEqual(parsePriceText("1.299,95 €", "DE"), {
    text: "1.299,95 €",
    value: 1299.95,
    currency: "EUR",
  });
  assert.equal(parsePriceText("¥24,800", "JP").value, 24800);
  assert.equal(inferCurrency("$89.00", "CA"), "CAD");
  assert.equal(inferCurrency("US$99.99", "SG"), "USD");
  assert.equal(inferCurrency("CA$99.99", "AU"), "CAD");
  assert.equal(inferCurrency("A$99.99", "US"), "AUD");
  assert.equal(inferCurrency("S$99.99", "US"), "SGD");
  assert.equal(parsePriceText("Current Price: 1.299,95 €. Was 1.499,00 €.", "DE").value, 1299.95);
  assert.equal(parsePriceText("Current price: €194.99.", "DE").value, 194.99);
});

test("ratings and compact review counts are normalized", () => {
  const aria = "Rated 4.6 out of 5, 8.2K user reviews";
  assert.equal(parseRatingValue(aria), 4.6);
  assert.equal(parseReviewCount(aria), 8200);
  assert.equal(parseReviewCount("4.8(13K)"), 13000);
  assert.equal(parseCompactNumber("2.1M+"), 2_100_000);
  assert.equal(parseCompactNumber("12,345"), 12_345);
  assert.equal(parseReviewCount("Rated 4.8 out of 5. 12,345 reviews."), 12_345);
});

test("Google redirect URLs are unwrapped while merchant URLs are preserved", () => {
  assert.equal(
    normalizeProductUrl("/url?url=https%3A%2F%2Fexample.com%2Fproduct%3Fx%3D1"),
    "https://example.com/product?x=1",
  );
  assert.equal(
    normalizeProductUrl("https://store.example.com/item?id=7"),
    "https://store.example.com/item?id=7",
  );
});

test("candidate normalization keeps provenance and computes a discount", () => {
  const row = normalizeShoppingCandidate(
    {
      title: "Example Headphones",
      price_text: "$80.00",
      original_price_text: "$100",
      merchant: "Example Store",
      rating_text: "Rated 4.7 out of 5. 2K reviews.",
      delivery: "Free delivery",
      returns: "30-day returns",
      condition: "",
      details: "Bluetooth",
      badges: ["Sale"],
      is_sponsored: false,
      product_id: "12345",
      url: "https://support.google.com/googleshopping/answer/9128904",
      text: "Example Headphones $80 $100 Example Store",
    },
    0,
    {
      sourceUrl: "https://www.google.com/search?udm=28&q=headphones",
      region: "US",
    },
  );

  assert.equal(row.price, 80);
  assert.equal(row.original_price, 100);
  assert.equal(row.discount_percent, 20);
  assert.equal(row.is_on_sale, true);
  assert.equal(row.rating, 4.7);
  assert.equal(row.review_count, 2000);
  assert.equal(row.condition, "new");
  assert.equal(row.result_type, "product");
  assert.match(row.url, /\/shopping\/product\/12345/);
});

function row(overrides) {
  return {
    _pageOrder: overrides.page_rank - 1,
    rank: overrides.page_rank,
    page_rank: overrides.page_rank,
    title: `Product ${overrides.page_rank}`,
    merchant: "Example",
    price: 100,
    rating: 4,
    review_count: 100,
    discount_percent: null,
    is_on_sale: false,
    delivery: "Paid delivery",
    condition: "new",
    is_sponsored: false,
    ...overrides,
  };
}

const baseOptions = {
  minPrice: null,
  maxPrice: null,
  merchant: "",
  excludeMerchant: "",
  minRating: null,
  condition: "any",
  onSale: false,
  freeShipping: false,
  sponsored: "include",
  sort: "relevance",
  limit: 10,
};

test("filtering composes merchant, price, rating, sale, shipping, and sponsored options", () => {
  const rows = [
    row({
      page_rank: 1,
      merchant: "Best Buy",
      price: 149.99,
      rating: 4.7,
      discount_percent: 25,
      is_on_sale: true,
      delivery: "Free delivery",
    }),
    row({
      page_rank: 2,
      merchant: "Target",
      price: 129.99,
      rating: 4.6,
      discount_percent: 10,
      is_on_sale: true,
      delivery: "Free shipping",
      is_sponsored: true,
    }),
    row({ page_rank: 3, merchant: "Best Buy Marketplace", price: 80, rating: 3.9 }),
  ];

  const results = filterAndSortShoppingRows(rows, {
    ...baseOptions,
    minPrice: 100,
    maxPrice: 200,
    merchant: "best buy,target",
    excludeMerchant: "target",
    minRating: 4.5,
    onSale: true,
    freeShipping: true,
    sponsored: "exclude",
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].merchant, "Best Buy");
  assert.equal(results[0].rank, 1);
});

test("a Sale badge passes the sale filter even when Google omits the old price", () => {
  const rows = [row({ page_rank: 1, is_on_sale: true, discount_percent: null })];
  const results = filterAndSortShoppingRows(rows, {
    ...baseOptions,
    onSale: true,
  });
  assert.equal(results.length, 1);
});

test("an alternate-currency comparison is not reported as an original price", () => {
  const candidate = normalizeShoppingCandidate(
    {
      title: "Imported Headphones",
      price_text: "$388.26",
      original_price_text: "(£290)",
      merchant: "Importer",
      badges: [],
      is_sponsored: false,
      product_id: "99",
    },
    0,
    {
      sourceUrl: "https://www.google.com/search?udm=28&q=headphones",
      region: "US",
    },
  );
  assert.equal(candidate.original_price, null);
  assert.equal(candidate.original_price_text, null);
  assert.equal(candidate.discount_percent, null);
});

test("duplicate product and merchant-offer identifiers keep their first page occurrence", () => {
  const rows = [
    row({ page_rank: 1, product_id: "p1" }),
    row({ page_rank: 2, product_id: "p1" }),
    row({ page_rank: 3, product_id: null, merchant_id: "m1", offer_id: "o1" }),
    row({ page_rank: 4, product_id: null, merchant_id: "m1", offer_id: "o1" }),
  ];
  assert.deepEqual(
    dedupeShoppingRows(rows).map((item) => item.page_rank),
    [1, 3],
  );
});

test("sorting puts missing values last and preserves page order for ties", () => {
  const rows = [
    row({ page_rank: 1, price: 30, rating: null }),
    row({ page_rank: 2, price: null, rating: 5 }),
    row({ page_rank: 3, price: 10, rating: 4.8 }),
    row({ page_rank: 4, price: 10, rating: 4.8 }),
  ];

  const byPrice = filterAndSortShoppingRows(rows, {
    ...baseOptions,
    sort: "price-low",
  });
  assert.deepEqual(
    byPrice.map((item) => item.page_rank),
    [3, 4, 1, 2],
  );

  const byRating = filterAndSortShoppingRows(rows, {
    ...baseOptions,
    sort: "rating",
  });
  assert.deepEqual(
    byRating.map((item) => item.page_rank),
    [2, 3, 4, 1],
  );
});
