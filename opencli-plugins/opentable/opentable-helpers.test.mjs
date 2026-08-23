import assert from "node:assert/strict";
import test from "node:test";
import * as openTableBrowser from "./opentable-browser.mjs";
import {
  buildOpenTableRestaurantUrl,
  buildOpenTableSearchUrl,
  canonicalOpenTableRestaurantUrl,
  combineDateTime,
  decodeHtml,
  dedupeSearchRows,
  filterAndSortSearchRows,
  normalizeAvailabilityCandidate,
  normalizeDate,
  normalizeExperienceCandidate,
  normalizeFeatures,
  normalizeMenuCandidate,
  normalizePhotoCandidate,
  normalizePriceLevels,
  normalizeRestaurantCandidate,
  normalizeReviewCandidate,
  normalizeSearchCandidate,
  normalizeSeating,
  normalizeTime,
  openTableFilterLabels,
  openTableRestaurantAlias,
  parseCompactNumber,
  parseRating,
  sortReviewRows,
} from "./opentable-helpers.mjs";

test("browser extraction scripts remain valid standalone page JavaScript", async () => {
  const extractors = Object.entries(openTableBrowser).filter(([name]) =>
    name.startsWith("extract"),
  );
  assert.ok(extractors.length >= 7);
  for (const [name, extractor] of extractors) {
    let source = "";
    await extractor({
      evaluate: async (value) => {
        source = value;
        return null;
      },
    });
    assert.doesNotThrow(() => new Function(`return (${source})`), name);
  }
});

test("autocomplete scoring requires a positive restaurant or location name match", () => {
  const score = openTableBrowser.scoreOpenTableAutocompleteCandidate;
  assert.equal(
    score(
      { kind: "location", name: "San Francisco", context: "California" },
      "San Francisco, CA",
      "",
      "location",
    ),
    70,
  );
  assert.equal(
    score(
      { kind: "location", name: "San Jose", context: "San Francisco Bay Area" },
      "Unknown Place",
      "San Francisco",
      "location",
    ),
    0,
  );
  assert.equal(
    score(
      { kind: "restaurant", name: "Lolinda", context: "Mission District, San Francisco" },
      "Lolinda",
      "San Francisco",
      "restaurant",
    ),
    130,
  );
  assert.equal(
    score(
      { kind: "restaurant", name: "The French Laundry", context: "Yountville" },
      "French",
      "",
      "restaurant",
    ),
    40,
  );
});

test("availability DOM fixture gives a button slot a canonical non-submitting URL", async () => {
  let source = "";
  await openTableBrowser.extractOpenTableAvailability({
    evaluate: async (value) => {
      source = value;
      return null;
    },
  });
  const currentUrl =
    "https://www.opentable.com/r/lolinda-reservations-san-francisco?dateTime=2026-07-19T18%3A30%3A00&covers=2&ot_source=test";
  const card = {
    innerText: "7:00 PM Standard",
    querySelector: () => null,
  };
  const button = {
    textContent: "7:00 PM",
    href: "",
    form: null,
    getAttribute: () => null,
    closest: (selector) => (selector === "form[action]" ? null : card),
  };
  const heading = { textContent: "Lolinda" };
  const documentFixture = {
    title: "Lolinda — OpenTable",
    body: { innerText: "Lolinda 7:00 PM Standard" },
    querySelector: (selector) => (selector === "h1" ? heading : null),
    querySelectorAll: (selector) => (selector === "a, button" ? [button] : []),
  };
  const payload = new Function("document", "location", "URL", `return (${source})`)(
    documentFixture,
    new URL(currentUrl),
    URL,
  );
  assert.equal(payload.candidates.length, 1);
  const bookingUrl = new URL(payload.candidates[0].booking_url);
  assert.equal(bookingUrl.pathname, "/r/lolinda-reservations-san-francisco");
  assert.equal(bookingUrl.searchParams.get("dateTime"), "2026-07-19T19:00:00");
  assert.equal(bookingUrl.searchParams.get("covers"), "2");
  assert.equal(bookingUrl.searchParams.has("ot_source"), false);
});

test("date and time validators accept real 15-minute reservation times", () => {
  assert.equal(normalizeDate("2026-07-19"), "2026-07-19");
  assert.equal(normalizeTime("19:45"), "19:45");
  assert.equal(combineDateTime("2026-07-19", "19:45"), "2026-07-19T19:45:00");
  assert.throws(() => normalizeDate("2026-02-29"), /valid calendar date/);
  assert.throws(() => normalizeDate("07/19/2026"), /YYYY-MM-DD/);
  assert.throws(() => normalizeTime("7:00 PM"), /24-hour HH:MM/);
  assert.throws(() => normalizeTime("19:10"), /15-minute boundary/);
});

test("friendly OpenTable filters normalize and map to visible UI labels", () => {
  const prices = normalizePriceLevels("$,2,$$$$,1");
  const seating = normalizeSeating("outdoor,high-top,bar,outdoor");
  const features = normalizeFeatures("charming,good-for-groups");
  assert.deepEqual(prices, [1, 2, 4]);
  assert.deepEqual(seating, ["outdoor", "high-top", "bar"]);
  assert.deepEqual(features, ["charming", "good-for-groups"]);
  assert.deepEqual(
    openTableFilterLabels({
      cuisines: ["Italian"],
      neighborhoods: ["Mission District"],
      prices,
      seating,
      features,
      wheelchairAccessible: true,
    }),
    [
      "Italian",
      "Mission District",
      "$",
      "$$",
      "$$$$",
      "Outdoor",
      "High Top",
      "Bar",
      "Charming",
      "Good for groups",
      "Wheelchair access",
    ],
  );
  assert.throws(() => normalizePriceLevels("free"), /prices must be/);
  assert.throws(() => normalizeSeating("rooftop"), /unsupported values/);
  assert.throws(() => normalizeFeatures("quiet"), /unsupported values/);
});

test("restaurant URL helpers accept aliases and strip tracking parameters", () => {
  assert.equal(
    canonicalOpenTableRestaurantUrl("lolinda-reservations-san-francisco"),
    "https://www.opentable.com/r/lolinda-reservations-san-francisco",
  );
  assert.equal(
    canonicalOpenTableRestaurantUrl(
      "https://www.opentable.com/r/lolinda-reservations-san-francisco?lang=en-US&ot_source=test",
    ),
    "https://www.opentable.com/r/lolinda-reservations-san-francisco",
  );
  assert.equal(
    openTableRestaurantAlias("/r/lolinda-reservations-san-francisco"),
    "lolinda-reservations-san-francisco",
  );
  assert.equal(canonicalOpenTableRestaurantUrl("Lolinda"), null);
  assert.throws(
    () => canonicalOpenTableRestaurantUrl("https://example.com/r/lolinda"),
    /must be an https:\/\/www\.opentable\.com/,
  );
  assert.throws(
    () => canonicalOpenTableRestaurantUrl("https://www.opentable.com/s?q=lolinda"),
    /must point to an OpenTable \/r\//,
  );
});

test("search URL carries resolved location and reservation criteria", () => {
  const url = new URL(
    buildOpenTableSearchUrl({
      query: "Italian",
      location: {
        name: "San Francisco",
        latitude: 37.78212741566524,
        longitude: -122.41931087188841,
      },
      date: "2026-07-19",
      time: "19:00",
      partySize: 4,
    }),
  );
  assert.equal(url.pathname, "/s");
  assert.equal(url.searchParams.get("dateTime"), "2026-07-19T19:00:00");
  assert.equal(url.searchParams.get("covers"), "4");
  assert.equal(url.searchParams.get("searchedLocationName"), "San Francisco");
  assert.equal(url.searchParams.get("term"), "Italian");
  assert.equal(url.searchParams.get("shouldUseLatLongSearch"), "true");
  assert.throws(
    () =>
      buildOpenTableSearchUrl({
        location: { name: "Nowhere", latitude: 95, longitude: 0 },
        date: "2026-07-19",
        time: "19:00",
        partySize: 2,
      }),
    /latitude must be between/,
  );
});

test("restaurant URL builder adds availability criteria without losing the canonical alias", () => {
  const url = new URL(
    buildOpenTableRestaurantUrl({
      businessUrl: "lolinda-reservations-san-francisco",
      date: "2026-07-19",
      time: "18:30",
      partySize: 2,
    }),
  );
  assert.equal(url.pathname, "/r/lolinda-reservations-san-francisco");
  assert.equal(url.searchParams.get("dateTime"), "2026-07-19T18:30:00");
  assert.equal(url.searchParams.get("covers"), "2");
});

test("display values parse compact counts, ratings, and HTML entities", () => {
  assert.equal(parseCompactNumber("12.2K reviews"), 12_200);
  assert.equal(parseCompactNumber("Booked 1,234 times"), 1_234);
  assert.equal(parseRating("4.7 stars out of 5"), 4.7);
  assert.equal(parseRating("Not rated"), null);
  assert.equal(
    decodeHtml("Steakhouse &amp; Argentinean &#x26; Wine"),
    "Steakhouse & Argentinean & Wine",
  );
});

test("search candidates normalize, dedupe, filter, and sort deterministically", () => {
  const sourceUrl = "https://www.opentable.com/s?searchedLocationName=San+Francisco";
  const rows = [
    normalizeSearchCandidate(
      {
        name: "Alpha",
        url: "/r/alpha-san-francisco",
        rating_label: "4.7 stars",
        review_text: "200 reviews",
        price: "$$",
        cuisine: "Italian",
        neighborhood: "Mission District",
        booked_today: "22",
        available_times: ["6:45 PM", "7:00 PM"],
      },
      0,
      sourceUrl,
    ),
    normalizeSearchCandidate(
      {
        name: "Beta",
        url: "/r/beta-san-francisco",
        rating_label: "4.9 stars",
        review_text: "75 reviews",
        price: "$$$",
        cuisine: "Seafood",
        neighborhood: "Embarcadero",
        booked_today: "50",
        available_times: ["7:15 PM"],
        has_experiences: true,
      },
      1,
      sourceUrl,
    ),
    normalizeSearchCandidate(
      {
        name: "Alpha duplicate",
        url: "https://www.opentable.com/r/alpha-san-francisco?lang=en",
        rating_label: "5 stars",
        available_times: ["8:00 PM"],
      },
      2,
      sourceUrl,
    ),
    normalizeSearchCandidate(
      {
        name: "No Availability",
        url: "/r/no-availability-san-francisco",
        rating_label: "5 stars",
        review_text: "900 reviews",
        price: "$$",
        cuisine: "Italian",
      },
      3,
      sourceUrl,
    ),
  ];
  const unique = dedupeSearchRows(rows);
  assert.equal(unique.length, 3);
  assert.deepEqual(
    filterAndSortSearchRows(unique, {
      cuisines: ["italian"],
      neighborhoods: ["Mission"],
      prices: [2],
      minRating: 4.5,
      minReviews: 100,
      availableOnly: true,
      sort: "rating",
      limit: 10,
    }).map((row) => row.name),
    ["Alpha"],
  );
  assert.deepEqual(
    filterAndSortSearchRows(unique, {
      availableOnly: true,
      experiencesOnly: true,
      sort: "booked",
      limit: 10,
    }).map((row) => row.name),
    ["Beta"],
  );
});

test("restaurant details preserve public profile fields", () => {
  const row = normalizeRestaurantCandidate(
    {
      name: "Lolinda",
      rating: "4.6 stars",
      review_count: "3,230",
      price: "$31 to $50",
      cuisines: ["Steakhouse", "Argentinean"],
      neighborhood: "Mission District",
      address: "2518 Mission Street, San Francisco, CA 94110",
      hours: ["Tue-Thu: 17:30-22:00", "Fri-Sat: 17:30-23:00"],
      phone: "(415) 550-6970",
      website: "https://www.lolindasf.com/",
      dining_style: "Casual Elegant",
      dress_code: "Smart Casual",
      features: ["Counter Seating", "Wheelchair Access"],
      description: "Cuisine inspired by Latin America.",
      url: "https://www.opentable.com/r/lolinda-reservations-san-francisco?lang=en",
    },
    "https://www.opentable.com/r/lolinda-reservations-san-francisco",
  );
  assert.equal(row.rating, 4.6);
  assert.equal(row.review_count, 3_230);
  assert.equal(row.cuisines, "Steakhouse, Argentinean");
  assert.equal(row.hours, "Tue-Thu: 17:30-22:00; Fri-Sat: 17:30-23:00");
  assert.equal(row.url, "https://www.opentable.com/r/lolinda-reservations-san-francisco");
});

test("availability, menu, photo, and experience rows use stable structured fields", () => {
  const availability = normalizeAvailabilityCandidate(
    {
      time: "7:00 PM",
      seating_type: "Outdoor",
      experience: "Prime Rib Sunday",
      price: "$68 per person",
      cancellation_policy: "Free cancellation until 24 hours before",
      booking_url: "https://www.opentable.com/booking/experiences-availability?rid=123",
    },
    0,
    {
      restaurant: "Lolinda",
      date: "2026-07-19",
      partySize: 2,
      sourceUrl: "https://www.opentable.com/r/lolinda-reservations-san-francisco",
    },
  );
  assert.equal(availability.party_size, 2);
  assert.equal(availability.time, "7:00 PM");
  assert.equal(availability.seating_type, "Outdoor");

  const menu = normalizeMenuCandidate(
    {
      item_type: "popular_dish",
      name: "Hanger Steak",
      section: "Popular dishes",
      description: "8 oz",
      review_count: "14 reviews",
      photo_url: "https://images.otstatic.com/hanger.jpg",
    },
    0,
    {
      restaurant: "Lolinda",
      menuUrl: "https://www.lolindasf.com/menu",
      sourceUrl: "https://www.opentable.com/r/lolinda-reservations-san-francisco",
    },
  );
  assert.equal(menu.item_type, "popular_dish");
  assert.equal(menu.review_count, 14);

  const photo = normalizePhotoCandidate(
    {
      category: "food",
      caption: "Hanger steak &amp; vegetables",
      author: "OpenTable Diner",
      image_url: "https://images.otstatic.com/full.jpg",
      thumbnail_url: "https://images.otstatic.com/thumb.jpg",
    },
    0,
    {
      restaurant: "Lolinda",
      category: "all",
      sourceUrl: "https://www.opentable.com/r/lolinda-reservations-san-francisco",
    },
  );
  assert.equal(photo.caption, "Hanger steak & vegetables");

  const experience = normalizeExperienceCandidate(
    {
      name: "Prime Rib Sunday",
      price: "$68 per person",
      party_size: "1 - 12 people",
      dates: "Multiple dates available",
      description: "Slow-roasted and carved.",
      booking_url: "https://www.opentable.com/booking/experiences-availability?rid=123",
    },
    0,
    {
      restaurant: "Lolinda",
      sourceUrl: "https://www.opentable.com/r/lolinda-reservations-san-francisco",
    },
  );
  assert.equal(experience.party_size, "1 - 12 people");
});

test("review rows filter and sort without losing restaurant context", () => {
  const context = {
    start: 10,
    restaurant: "Lolinda",
    businessUrl: "https://www.opentable.com/r/lolinda-reservations-san-francisco",
    sourceUrl: "https://www.opentable.com/r/lolinda-reservations-san-francisco#reviews",
  };
  const rows = [
    normalizeReviewCandidate(
      { author: "A", rating: 4, date: "Jul 10, 2026", text: "Great dinner." },
      0,
      context,
    ),
    normalizeReviewCandidate(
      { author: "B", rating: 5, date: "Jul 12, 2026", text: "Excellent dinner." },
      1,
      context,
    ),
    normalizeReviewCandidate(
      { author: "C", rating: 2, date: "Jul 1, 2026", text: "Slow service." },
      2,
      context,
    ),
  ];
  assert.deepEqual(
    sortReviewRows(rows, "newest").map((row) => row.author),
    ["B", "A", "C"],
  );
  assert.deepEqual(
    sortReviewRows(rows, "highest").map((row) => row.author),
    ["B", "A", "C"],
  );
  assert.deepEqual(
    sortReviewRows(rows, "lowest").map((row) => row.author),
    ["C", "A", "B"],
  );
  assert.equal(rows[0].rank, 11);
  assert.equal(rows[0].restaurant, "Lolinda");
});
