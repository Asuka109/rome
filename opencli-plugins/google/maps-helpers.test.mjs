import assert from "node:assert/strict";
import test from "node:test";
import {
  MAPS_REVIEW_SORT_LABELS,
  buildMapsUrl,
  dedupeMapsRows,
  filterMapsReviewRows,
  filterAndSortMapsRows,
  normalizeMapsPlaceCandidate,
  normalizeMapsReviewCandidate,
  normalizeMapsRouteCandidate,
  normalizeMapsSearchCandidate,
  parseCoordinatesFromUrl,
  parseMapsRatingLabel,
} from "./maps-helpers.mjs";

test("review sort choices map to the labels exposed by standard and hotel panels", () => {
  assert.deepEqual(MAPS_REVIEW_SORT_LABELS, {
    relevant: "Most relevant",
    newest: "Newest",
    highest: "Highest rating",
    lowest: "Lowest rating",
  });
});

test("buildMapsUrl creates localized categorical searches", () => {
  const url = new URL(
    buildMapsUrl({
      operation: "search",
      query: "coffee",
      near: "Ferry Building, San Francisco",
      region: "us",
    }),
  );
  assert.equal(url.pathname, "/maps/search/");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("query"), "coffee near Ferry Building, San Francisco");
  assert.equal(url.searchParams.get("hl"), "en");
  assert.equal(url.searchParams.get("gl"), "US");
});

test("buildMapsUrl supports precise places and structured directions", () => {
  const placeUrl = new URL(
    buildMapsUrl({
      operation: "place",
      query: "Ferry Building",
      placeId: "ChIJexample",
    }),
  );
  assert.equal(placeUrl.searchParams.get("query_place_id"), "ChIJexample");

  const reviewsUrl = new URL(
    buildMapsUrl({
      operation: "reviews",
      query: "Ferry Building",
      placeId: "ChIJexample",
    }),
  );
  assert.equal(reviewsUrl.pathname, "/maps/search/");
  assert.equal(reviewsUrl.searchParams.get("query"), "Ferry Building");
  assert.equal(reviewsUrl.searchParams.get("query_place_id"), "ChIJexample");

  const directionsUrl = new URL(
    buildMapsUrl({
      operation: "directions",
      query: "Ferry Building, San Francisco",
      destination: "Golden Gate Bridge",
      travelMode: "bicycling",
      waypoints: "Pier 39|Palace of Fine Arts",
      waypointPlaceIds: "place-one|place-two",
      avoid: "ferries,tolls,ferries",
      region: "US",
    }),
  );
  assert.equal(directionsUrl.pathname, "/maps/dir/");
  assert.equal(directionsUrl.searchParams.get("origin"), "Ferry Building, San Francisco");
  assert.equal(directionsUrl.searchParams.get("destination"), "Golden Gate Bridge");
  assert.equal(directionsUrl.searchParams.get("travelmode"), "bicycling");
  assert.equal(directionsUrl.searchParams.get("waypoints"), "Pier 39|Palace of Fine Arts");
  assert.equal(directionsUrl.searchParams.get("avoid"), "ferries,tolls");
});

test("directions validation rejects ambiguous waypoint ids and unknown avoid values", () => {
  assert.throws(
    () =>
      buildMapsUrl({
        operation: "directions",
        query: "A",
        destination: "B",
        waypoints: "C|D",
        waypointPlaceIds: "only-one",
      }),
    /one pipe-separated id for every waypoint/,
  );
  assert.throws(
    () =>
      buildMapsUrl({
        operation: "directions",
        query: "A",
        destination: "B",
        avoid: "traffic",
      }),
    /unsupported values: traffic/,
  );
  assert.throws(
    () =>
      buildMapsUrl({
        operation: "directions",
        query: "A",
        destination: "B",
        travelMode: "transit",
        waypoints: "C",
      }),
    /not supported for transit/,
  );
});

test("coordinates prefer a place pin over the map viewport", () => {
  assert.deepEqual(
    parseCoordinatesFromUrl(
      "https://www.google.com/maps/place/X/@1.2,3.4,12z/data=!3d37.7951537!4d-122.392711",
    ),
    { latitude: 37.7951537, longitude: -122.392711 },
  );
  assert.deepEqual(parseCoordinatesFromUrl("https://www.google.com/maps"), {
    latitude: null,
    longitude: null,
  });
});

test("rating labels normalize comma-separated and compact review counts", () => {
  assert.deepEqual(parseMapsRatingLabel("4.6 stars 37,900 Reviews"), {
    rating: 4.6,
    review_count: 37_900,
  });
  assert.deepEqual(parseMapsRatingLabel("4.8 stars 2.1K Reviews"), {
    rating: 4.8,
    review_count: 2_100,
  });
  assert.deepEqual(parseMapsRatingLabel("1 star"), {
    rating: 1,
    review_count: null,
  });
  assert.deepEqual(parseMapsRatingLabel("4/5"), {
    rating: 4,
    review_count: null,
  });
});

test("search cards normalize useful place fields", () => {
  const row = normalizeMapsSearchCandidate(
    {
      name: "Red Bay Coffee Ferry Building",
      rating_label: "4.0 stars 329 Reviews",
      lines: [
        "Red Bay Coffee Ferry Building",
        "4.0(329) · $1–10",
        "Coffee shop ·  · Ferry Building, 1, Shop 46",
        "Open · Closes 6 PM",
      ],
      url: "https://www.google.com/maps/place/Red+Bay/data=!3d37.7951537!4d-122.392711",
    },
    0,
    "https://www.google.com/maps/search/?api=1&query=coffee",
  );
  assert.equal(row.name, "Red Bay Coffee Ferry Building");
  assert.equal(row.category, "Coffee shop");
  assert.equal(row.address, "Ferry Building, 1, Shop 46");
  assert.equal(row.rating, 4);
  assert.equal(row.review_count, 329);
  assert.equal(row.price_level, "$1–10");
  assert.equal(row.open_status, "Open · Closes 6 PM");
  assert.equal(row.latitude, 37.7951537);
});

function searchRow(overrides) {
  return {
    _pageOrder: overrides.page_rank - 1,
    rank: overrides.page_rank,
    page_rank: overrides.page_rank,
    name: `Place ${overrides.page_rank}`,
    rating: 4,
    review_count: 100,
    open_status: "Open · Closes 8 PM",
    url: `https://example.com/${overrides.page_rank}`,
    ...overrides,
  };
}

test("search filters compose and missing sort values stay last", () => {
  const rows = [
    searchRow({ page_rank: 1, rating: 4.4, review_count: 500 }),
    searchRow({ page_rank: 2, rating: 4.9, review_count: 40 }),
    searchRow({ page_rank: 3, rating: 4.7, review_count: 900, open_status: "Closed" }),
    searchRow({ page_rank: 4, rating: null, review_count: 700 }),
  ];
  const filtered = filterAndSortMapsRows(rows, {
    minRating: 4.3,
    minReviews: 50,
    openNow: true,
    sort: "rating",
    limit: 10,
  });
  assert.deepEqual(
    filtered.map((row) => row.page_rank),
    [1],
  );

  const sorted = filterAndSortMapsRows(rows, {
    minRating: null,
    minReviews: null,
    openNow: false,
    sort: "rating",
    limit: 10,
  });
  assert.deepEqual(
    sorted.map((row) => row.page_rank),
    [2, 3, 1, 4],
  );
  assert.equal("_pageOrder" in sorted[0], false);
});

test("duplicate map URLs keep their first page occurrence", () => {
  const rows = [
    searchRow({ page_rank: 1, url: "https://example.com/same" }),
    searchRow({ page_rank: 2, url: "https://example.com/same" }),
  ];
  assert.deepEqual(
    dedupeMapsRows(rows).map((row) => row.page_rank),
    [1],
  );
});

test("place and route normalizers preserve detailed fields", () => {
  const place = normalizeMapsPlaceCandidate(
    {
      name: "Ferry Building",
      category: "Historical landmark",
      rating_label: "4.6 stars",
      reviews_label: "37,900 reviews",
      address: "1 Ferry Building, San Francisco, CA 94105",
      open_status: "Open · Closes 10 PM",
      hours: "Monday: 6 AM–10 PM; Tuesday: 6 AM–10 PM",
      phone: "(415) 983-8000",
      website: "https://www.ferrybuildingmarketplace.com/",
      plus_code: "QJW4+5H Embarcadero, San Francisco, CA",
      url: "https://www.google.com/maps/place/Ferry/@1,2,15z/data=!3d37.7954425!4d-122.3936136",
    },
    "https://www.google.com/maps/search/?api=1&query=Ferry",
  );
  assert.equal(place.review_count, 37_900);
  assert.equal(place.phone, "(415) 983-8000");
  assert.equal(place.longitude, -122.3936136);

  const route = normalizeMapsRouteCandidate(
    {
      name: "via US-101",
      travel_mode: "Driving",
      duration: "18 min",
      distance: "5.3 miles",
      details: "Fastest route now due to traffic conditions",
    },
    0,
    {
      origin: "Ferry Building",
      destination: "Golden Gate Bridge",
      waypoints: [],
      travelMode: "driving",
      sourceUrl: "https://www.google.com/maps/dir/?api=1",
    },
  );
  assert.equal(route.travel_mode, "driving");
  assert.equal(route.duration, "18 min");
  assert.equal(route.destination, "Golden Gate Bridge");

  const transit = normalizeMapsRouteCandidate(
    {
      name: "\uE88E 11:48 AM—12:14 PM",
      travel_mode: "Transit",
      duration: "26 min",
      details: "11:54 AM from Embarcadero \uE536 9 min every 10 min",
    },
    0,
    {
      origin: "Ferry Building",
      destination: "Golden Gate Park",
      waypoints: [],
      travelMode: "transit",
      sourceUrl: "https://www.google.com/maps/dir/?api=1",
    },
  );
  assert.equal(transit.name, "11:48 AM—12:14 PM");
  assert.equal(transit.details, "11:54 AM from Embarcadero 9 min every 10 min");
});

test("review normalizers preserve public author, engagement, and owner-response fields", () => {
  const review = normalizeMapsReviewCandidate(
    {
      review_id: "review-123",
      author: "Ada Lovelace",
      author_metadata: "Local Guide · 1.2K reviews · 345 photos",
      author_url: "https://www.google.com/maps/contrib/123/reviews",
      rating_label: "4 stars",
      date: "Edited 2 weeks ago",
      review_source: "Google",
      text: "A thoughtful and complete review.",
      language: "en",
      photo_count: 3,
      like_label: "2.1K likes",
      owner_response: "Thanks for visiting.",
      owner_response_date: "a week ago",
    },
    4,
    {
      business: "Ferry Building",
      businessUrl: "https://www.google.com/maps/place/Ferry+Building",
      sourceUrl: "https://www.google.com/maps/place/Ferry+Building/reviews",
    },
  );

  assert.equal(review.rank, 5);
  assert.equal(review.review_id, "review-123");
  assert.equal(review.local_guide, true);
  assert.equal(review.author_review_count, 1_200);
  assert.equal(review.author_photo_count, 345);
  assert.equal(review.rating, 4);
  assert.equal(review.review_source, "Google");
  assert.equal(review.photo_count, 3);
  assert.equal(review.like_count, 2_100);
  assert.equal(review.owner_response, "Thanks for visiting.");
  assert.equal(review.business, "Ferry Building");

  const filtered = filterMapsReviewRows(
    [
      review,
      { ...review, rank: 6, review_id: "review-456", rating: 5 },
      { ...review, rank: 7, review_id: "review-789", rating: 4 },
    ],
    { rating: 4, limit: 1 },
  );
  assert.deepEqual(
    filtered.map((row) => [row.rank, row.review_id]),
    [[1, "review-123"]],
  );
});
