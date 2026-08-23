import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSearchUrl,
  dedupeSearchRows,
  filterCategories,
  filterLocations,
  normalizeCategory,
  normalizeListingUrl,
  normalizeSearchCandidate,
  normalizeSite,
  parseConditionValues,
  parsePriceText,
  parseRelativeAgeMinutes,
  sortAndLimitSearchRows,
} from "./craigslist-helpers.mjs";

test("normalizeSite accepts codes, hostnames, and Craigslist URLs", () => {
  assert.equal(normalizeSite("sfbay"), "sfbay");
  assert.equal(normalizeSite("NewYork.craigslist.org"), "newyork");
  assert.equal(normalizeSite("https://london.craigslist.org/"), "london");
  assert.equal(normalizeSite("https://www.craigslist.org/area/sfbay"), "sfbay");
  assert.equal(normalizeSite("https://www.craigslist.org/search/area/newyork?cat=jjj"), "newyork");
  assert.throws(() => normalizeSite("www.craigslist.org"), /invalid Craigslist site/);
  assert.throws(() => normalizeSite("https://example.com"), /invalid Craigslist site/);
  assert.throws(() => normalizeSite(""), /site is required/);
});

test("normalizeCategory supports popular aliases and raw category codes", () => {
  assert.equal(normalizeCategory("for sale"), "sss");
  assert.equal(normalizeCategory("apartments"), "apa");
  assert.equal(normalizeCategory("BIKES"), "bia");
  assert.equal(normalizeCategory("sof"), "sof");
  assert.throws(() => normalizeCategory("not-a-real-category"), /invalid category/);
});

test("buildSearchUrl composes common, housing, jobs, vehicle, and custom filters", () => {
  const url = new URL(
    buildSearchUrl({
      site: "sfbay.craigslist.org",
      category: "apartments",
      query: "sunny apartment",
      sort: "price-low",
      offset: 120,
      minPrice: 1500,
      maxPrice: 3500,
      hasImage: true,
      postedToday: true,
      titlesOnly: true,
      hideDuplicates: true,
      includeNearby: true,
      seller: "owner",
      postal: "94110",
      radius: 10,
      condition: "new,like-new,30",
      deliveryAvailable: true,
      minBedrooms: 1,
      maxBedrooms: 3,
      minBathrooms: 1.5,
      maxBathrooms: 2.5,
      minSqft: 600,
      maxSqft: 1600,
      catsOk: true,
      dogsOk: true,
      furnished: true,
      noSmoking: true,
      wheelchair: true,
      evCharging: true,
      airConditioning: true,
      remote: true,
      internship: true,
      nonprofit: true,
      minYear: 2018,
      maxYear: 2024,
      minOdometer: 1000,
      maxOdometer: 75000,
      makeModel: "Toyota RAV4",
      params: "housing_type=1&laundry=1&laundry=2",
    }),
  );

  assert.equal(url.origin, "https://sfbay.craigslist.org");
  assert.equal(url.pathname, "/search/apa");
  assert.equal(url.searchParams.get("query"), "sunny apartment");
  assert.equal(url.searchParams.get("sort"), "priceasc");
  assert.equal(url.searchParams.get("s"), "120");
  assert.equal(url.searchParams.get("srchType"), "T");
  assert.equal(url.searchParams.get("purveyor"), "owner");
  assert.equal(url.searchParams.get("search_distance"), "10");
  assert.deepEqual(url.searchParams.getAll("condition"), ["10", "20", "30"]);
  assert.equal(url.searchParams.get("min_bedrooms"), "1");
  assert.equal(url.searchParams.get("max_bathrooms"), "2.5");
  assert.equal(url.searchParams.get("maxSqft"), "1600");
  assert.equal(url.searchParams.get("pets_cat"), "1");
  assert.equal(url.searchParams.get("is_telecommuting"), "1");
  assert.equal(url.searchParams.get("min_auto_year"), "2018");
  assert.equal(url.searchParams.get("max_auto_miles"), "75000");
  assert.deepEqual(url.searchParams.getAll("laundry"), ["1", "2"]);
});

test("buildSearchUrl validates dependent and ordered ranges", () => {
  const base = { site: "sfbay", category: "sss", sort: "newest" };
  assert.throws(() => buildSearchUrl({ ...base, radius: 5 }), /postal is required/);
  assert.throws(
    () => buildSearchUrl({ ...base, minPrice: 100, maxPrice: 10 }),
    /min-price cannot be greater/,
  );
  assert.throws(
    () => buildSearchUrl({ ...base, params: "sort=date" }),
    /must use its dedicated command option/,
  );
  assert.throws(() => buildSearchUrl({ ...base, seller: "broker" }), /seller must be one of/);
});

test("condition, price, and relative-time parsers normalize Craigslist labels", () => {
  assert.deepEqual(parseConditionValues("new, like new, 30, good,good"), ["10", "20", "30", "40"]);
  assert.throws(() => parseConditionValues("mint"), /invalid condition/);
  assert.equal(parsePriceText("$1,250"), 1250);
  assert.equal(parsePriceText("€19.50"), 19.5);
  assert.equal(parsePriceText("1.299,95 €"), 1299.95);
  assert.equal(parsePriceText("1.250 €"), 1250);
  assert.equal(parsePriceText("contact"), null);
  assert.equal(parseRelativeAgeMinutes("<1hr ago"), 59);
  assert.equal(parseRelativeAgeMinutes("35 min ago"), 35);
  assert.equal(parseRelativeAgeMinutes("2 days ago"), 2880);
});

test("search candidates normalize, dedupe, and sort missing prices last", () => {
  const context = {
    site: "sfbay",
    category: "bia",
    sourceUrl: "https://www.craigslist.org/search/area/sfbay?cat=bia",
  };
  const candidates = [
    {
      post_id: "123",
      title: "  Road   Bike ",
      price_text: "$900",
      location: "(Mission)",
      posted: "2 hr ago",
      posted_at: "Fri Jul 10 2026 09:21:00 GMT-0700 (Pacific Daylight Time)",
      snippet: " $90,000   DOE ",
      image_urls: ["/images/a.jpg"],
      image_count: 3,
      url: "/view/d/road-bike/token-a",
    },
    {
      post_id: "124",
      title: "Free bike",
      price_text: "$0",
      location: "SOMA",
      posted: "10 min ago",
      image_urls: [],
      url: "/view/d/free-bike/token-b",
    },
    {
      post_id: "125",
      title: "Trade",
      price_text: "contact",
      url: "/view/d/trade/token-c",
    },
  ];
  const rows = candidates.map((candidate, index) =>
    normalizeSearchCandidate(candidate, index, context),
  );
  assert.equal(rows[0].title, "Road Bike");
  assert.equal(rows[0].location, "Mission");
  assert.equal(rows[0].age_minutes, 120);
  assert.equal(rows[0].posted_at, "2026-07-10T16:21:00.000Z");
  assert.equal(rows[0].snippet, "$90,000 DOE");
  assert.equal(rows[0].image_count, 3);
  assert.equal(rows[0].image_url, "https://www.craigslist.org/images/a.jpg");

  assert.equal(dedupeSearchRows([...rows, rows[0]]).length, 3);
  assert.deepEqual(
    sortAndLimitSearchRows(rows, { sort: "price-low", limit: 3 }).map((row) => row.post_id),
    ["124", "123", "125"],
  );
  assert.deepEqual(
    sortAndLimitSearchRows(rows, { sort: "price-high", limit: 2 }).map((row) => row.post_id),
    ["123", "124"],
  );
});

test("normalizeListingUrl allows current and legacy listing URLs only", () => {
  assert.equal(
    normalizeListingUrl("http://www.craigslist.org/view/d/san-francisco-bike/opaque-token#photos"),
    "https://www.craigslist.org/view/d/san-francisco-bike/opaque-token",
  );
  assert.equal(
    normalizeListingUrl(
      "https://sfbay.craigslist.org/sfc/bik/d/san-francisco-bike/7942831020.html",
    ),
    "https://sfbay.craigslist.org/sfc/bik/d/san-francisco-bike/7942831020.html",
  );
  assert.throws(
    () => normalizeListingUrl("https://example.com/view/d/foo/token"),
    /craigslist.org/,
  );
  assert.throws(
    () => normalizeListingUrl("https://sfbay.craigslist.org/search/sss"),
    /detail page/,
  );
});

test("location and category discovery filters are case-insensitive and bounded", () => {
  const locations = [
    { code: "sfbay", name: "san francisco bay area", region: "California", section: "US" },
    { code: "london", name: "london, UK", region: "United Kingdom", section: "Europe" },
    { code: "vancouver", name: "vancouver, BC", region: "British Columbia", section: "Canada" },
  ];
  assert.deepEqual(
    filterLocations(locations, { query: "CALIF", section: "us", limit: 10 }).map((row) => row.code),
    ["sfbay"],
  );
  assert.equal(filterLocations(locations, { query: "", section: "", limit: 2 }).length, 2);

  const categories = [
    { code: "hhh", name: "housing", group: "housing" },
    { code: "apa", name: "apts / housing", group: "housing" },
    { code: "apa", name: "duplicate", group: "housing" },
    { code: "sof", name: "software / qa / dba", group: "jobs" },
  ];
  assert.deepEqual(
    filterCategories(categories, { query: "apt", group: "housing", limit: 10 }).map(
      (row) => row.code,
    ),
    ["apa"],
  );
  assert.deepEqual(
    filterCategories(categories, { query: "", group: "jobs", limit: 10 }).map((row) => row.code),
    ["sof"],
  );
});
