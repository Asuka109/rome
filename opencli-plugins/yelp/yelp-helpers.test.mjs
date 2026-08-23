import assert from "node:assert/strict";
import test from "node:test";
import {
  buildYelpPhotosUrl,
  buildYelpReviewsUrl,
  buildYelpSearchUrl,
  canonicalYelpBusinessUrl,
  decodeHtml,
  dedupeSearchRows,
  filterAndSortSearchRows,
  normalizeBusinessCandidate,
  normalizeFeatures,
  normalizeOpenAt,
  normalizePhotoCandidate,
  normalizePriceLevels,
  normalizeReviewCandidate,
  normalizeSearchCandidate,
  normalizeServices,
  parseCompactNumber,
  sortReviewRows,
  yelpBusinessAlias,
} from "./yelp-helpers.mjs";

test("buildYelpSearchUrl composes common logged-out Yelp filters", () => {
  const openAt = normalizeOpenAt("2026-07-14T19:00:00-07:00");
  const url = new URL(
    buildYelpSearchUrl({
      query: "tacos",
      location: "Mission District, San Francisco",
      category: "mexican",
      prices: normalizePriceLevels("$,2,$$$"),
      services: normalizeServices("delivery,takeout,reservations"),
      features: normalizeFeatures("outdoor-seating,free-wifi"),
      openAt,
      hotAndNew: true,
      sort: "rating",
      start: 20,
    }),
  );
  assert.equal(url.pathname, "/search");
  assert.equal(url.searchParams.get("find_desc"), "tacos");
  assert.equal(url.searchParams.get("find_loc"), "Mission District, San Francisco");
  assert.equal(url.searchParams.get("cflt"), "mexican");
  assert.equal(url.searchParams.get("sortby"), "rating");
  assert.equal(url.searchParams.get("start"), "20");
  assert.deepEqual(url.searchParams.get("attrs").split(","), [
    "RestaurantsPriceRange2.1",
    "RestaurantsPriceRange2.2",
    "RestaurantsPriceRange2.3",
    "RestaurantsDelivery",
    "RestaurantsTakeOut",
    "RestaurantsReservations",
    "OutdoorSeating",
    "WiFi.free",
    `OpenAt.${openAt}`,
    "HotAndNew",
  ]);
});

test("buildYelpSearchUrl rejects conflicting availability and unsafe category values", () => {
  assert.throws(
    () =>
      buildYelpSearchUrl({
        query: "coffee",
        location: "Oakland, CA",
        openNow: true,
        openAt: 1_800_000_000,
      }),
    /cannot be used together/,
  );
  assert.throws(
    () =>
      buildYelpSearchUrl({ query: "coffee", location: "Oakland, CA", category: "coffee shops" }),
    /category must be a Yelp category alias/,
  );
});

test("filter normalizers accept friendly values and reject unknown values", () => {
  assert.deepEqual(normalizePriceLevels("1,$$,4,1"), [1, 2, 4]);
  assert.deepEqual(normalizeServices("delivery,waitlist,delivery"), ["delivery", "waitlist"]);
  assert.deepEqual(normalizeFeatures("dogs-allowed,good-for-kids"), [
    "dogs-allowed",
    "good-for-kids",
  ]);
  assert.throws(() => normalizePriceLevels("free"), /prices must be/);
  assert.throws(() => normalizeServices("dine-in"), /unsupported values/);
  assert.throws(() => normalizeFeatures("rooftop"), /unsupported values/);
  assert.throws(() => normalizeOpenAt("2026-07-14T19:00:00"), /explicit timezone/);
});

test("business URL helpers accept aliases, canonical URLs, and Yelp ad redirects", () => {
  assert.equal(
    canonicalYelpBusinessUrl("the-coffee-movement-san-francisco-4"),
    "https://www.yelp.com/biz/the-coffee-movement-san-francisco-4",
  );
  assert.equal(
    canonicalYelpBusinessUrl(
      "https://www.yelp.com/adredir?redirect_url=https%3A%2F%2Fwww.yelp.com%2Fbiz%2Fkamari-coffee-san-francisco%3Fosq%3Dcoffee",
    ),
    "https://www.yelp.com/biz/kamari-coffee-san-francisco",
  );
  assert.equal(
    yelpBusinessAlias("/biz/house-of-prime-rib-san-francisco"),
    "house-of-prime-rib-san-francisco",
  );
  assert.equal(canonicalYelpBusinessUrl("House of Prime Rib"), null);
  assert.throws(
    () => canonicalYelpBusinessUrl("https://example.com/biz/not-yelp"),
    /must be an https:\/\/www\.yelp\.com/,
  );
});

test("review and photo URL builders preserve structured filters", () => {
  const reviewUrl = new URL(
    buildYelpReviewsUrl({
      businessUrl: "house-of-prime-rib-san-francisco",
      sort: "newest",
      keyword: "service",
      rating: 5,
      start: 10,
    }),
  );
  assert.equal(reviewUrl.pathname, "/biz/house-of-prime-rib-san-francisco");
  assert.equal(reviewUrl.searchParams.get("sort_by"), "date_desc");
  assert.equal(reviewUrl.searchParams.get("q"), "service");
  assert.equal(reviewUrl.searchParams.get("rr"), "5");
  assert.equal(reviewUrl.searchParams.get("start"), "10");

  const photoUrl = new URL(
    buildYelpPhotosUrl({
      businessUrl: "/biz/the-coffee-movement-san-francisco-4",
      category: "food",
    }),
  );
  assert.equal(photoUrl.pathname, "/biz_photos/the-coffee-movement-san-francisco-4");
  assert.equal(photoUrl.searchParams.get("tab"), "food");
  const insideUrl = new URL(
    buildYelpPhotosUrl({
      businessUrl: "/biz/the-coffee-movement-san-francisco-4",
      category: "inside",
    }),
  );
  assert.equal(insideUrl.searchParams.get("tab"), "interior");
});

test("compact numbers and HTML entities normalize Yelp display values", () => {
  assert.equal(parseCompactNumber("10.2k reviews"), 10_200);
  assert.equal(parseCompactNumber("1,330 Reviews"), 1_330);
  assert.equal(parseCompactNumber(284), 284);
  assert.equal(decodeHtml("Ham &amp; cheese &#x26; coffee"), "Ham & cheese & coffee");
});

test("search candidates normalize, dedupe, filter, and sort deterministically", () => {
  const sourceUrl = "https://www.yelp.com/search?find_desc=coffee&find_loc=San+Francisco";
  const rows = [
    normalizeSearchCandidate(
      {
        name: "Alpha Coffee",
        url: "/biz/alpha-coffee-san-francisco",
        rating_label: "4.7 star rating",
        review_text: "50",
        price: "$$",
        categories: ["Coffee &amp; Tea"],
        is_sponsored: false,
      },
      0,
      sourceUrl,
    ),
    normalizeSearchCandidate(
      {
        name: "Beta Coffee",
        url: "/biz/beta-coffee-san-francisco",
        rating_label: "4.9 star rating",
        review_text: "12",
        is_sponsored: true,
      },
      1,
      sourceUrl,
    ),
    normalizeSearchCandidate(
      {
        name: "Alpha Coffee duplicate",
        url: "https://www.yelp.com/biz/alpha-coffee-san-francisco?osq=coffee",
        rating_label: "5 star rating",
        review_text: "1",
        is_sponsored: false,
      },
      2,
      sourceUrl,
    ),
  ];
  const unique = dedupeSearchRows(rows);
  assert.equal(unique.length, 2);
  assert.equal(unique[0].categories, "Coffee & Tea");
  assert.deepEqual(
    filterAndSortSearchRows(unique, {
      minRating: 4.5,
      minReviews: 10,
      sponsored: "include",
      sort: "rating",
      limit: 5,
    }).map((row) => row.name),
    ["Beta Coffee", "Alpha Coffee"],
  );
  assert.deepEqual(
    filterAndSortSearchRows(unique, {
      sponsored: "exclude",
      sort: "recommended",
      limit: 5,
    }).map((row) => row.name),
    ["Alpha Coffee"],
  );
});

test("detail, review, and photo candidates keep useful structured fields", () => {
  const business = normalizeBusinessCandidate(
    {
      name: "The Coffee Movement",
      rating: 4.6,
      review_count: 284,
      price: "$$",
      categories: ["Coffee &amp; Tea"],
      claimed: true,
      open_now: true,
      hours_today: ["7:00 AM - 2:00 PM"],
      weekly_hours: ["Mon: 7:00 AM - 2:00 PM"],
      address: "1737 Balboa St\nSan Francisco, CA 94121",
      neighborhoods: ["Inner Richmond"],
      attributes: ["Outdoor seating", "Dogs allowed"],
      url: "https://www.yelp.com/biz/the-coffee-movement-san-francisco-4?osq=coffee",
    },
    "https://www.yelp.com/biz/the-coffee-movement-san-francisco-4",
  );
  assert.equal(business.categories, "Coffee & Tea");
  assert.equal(business.weekly_hours, "Mon: 7:00 AM - 2:00 PM");
  assert.equal(business.url, "https://www.yelp.com/biz/the-coffee-movement-san-francisco-4");

  const review = normalizeReviewCandidate(
    {
      author: "Sophie T.",
      author_location: "Milpitas, CA",
      rating_label: "4 star rating",
      date: "Jul 8, 2026",
      text: "Very cute spot.",
      photo_count: "1 photo",
      reactions: { helpful: 1, thanks: 1 },
    },
    0,
    {
      start: 10,
      business: business.name,
      businessUrl: business.url,
      sourceUrl: `${business.url}?start=10`,
    },
  );
  assert.equal(review.rank, 11);
  assert.equal(review.rating, 4);
  assert.equal(review.photo_count, 1);
  assert.equal(review.reactions, "helpful: 1, thanks: 1");

  assert.deepEqual(
    sortReviewRows(
      [
        review,
        { ...review, rank: 12, author: "Newer", date: "Jul 10, 2026", rating: 5 },
        { ...review, rank: 13, author: "Older", date: "Jul 1, 2026", rating: 2 },
      ],
      "newest",
    ).map((row) => row.author),
    ["Newer", "Sophie T.", "Older"],
  );
  assert.deepEqual(
    sortReviewRows(
      [review, { ...review, rank: 12, author: "Five stars", rating: 5 }],
      "highest",
    ).map((row) => row.author),
    ["Five stars", "Sophie T."],
  );

  const photo = normalizePhotoCandidate(
    {
      url: "https://s3-media0.fl.yelpcdn.com/bphoto/photo-id/o.jpg",
      thumbnail_url: "https://s3-media0.fl.yelpcdn.com/bphoto/photo-id/258s.jpg",
      caption: "Ham &amp; cheese croissant",
      author: "Misa K.",
      upload_date: "2025-11-25T15:53:35Z",
    },
    0,
    {
      category: "food",
      business: business.name,
      businessUrl: business.url,
      sourceUrl: "https://www.yelp.com/biz_photos/example?tab=food",
    },
  );
  assert.equal(photo.photo_id, "photo-id");
  assert.equal(photo.caption, "Ham & cheese croissant");
});
