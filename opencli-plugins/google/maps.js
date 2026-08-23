import { CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  MAPS_OPERATIONS,
  MAPS_REVIEW_SORT_LABELS,
  MAPS_REVIEW_SORTS,
  MAPS_SORTS,
  MAPS_TRAVEL_MODES,
  buildMapsUrl,
  dedupeMapsRows,
  filterMapsReviewRows,
  filterAndSortMapsRows,
  integerInRange,
  normalizeMapsPlaceCandidate,
  normalizeMapsReviewCandidate,
  normalizeMapsRouteCandidate,
  normalizeMapsSearchCandidate,
  normalizeRegion,
  optionalNonNegativeInteger,
  optionalNumberInRange,
  parseDelimitedList,
} from "./maps-helpers.mjs";

function validationError(error) {
  throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
}

async function extractMapsSearchCandidates(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }

      function lines(root) {
        return (root && root.innerText || '')
          .replace(/\\u00a0/g, ' ')
          .split('\\n')
          .map(clean)
          .filter(Boolean);
      }

      var articles = Array.from(document.querySelectorAll('[role="feed"] [role="article"]'));
      var candidates = articles.map(function(article) {
        var link = article.querySelector('a[aria-label][href*="/maps/place/"]')
          || article.querySelector('a[aria-label][href]');
        var rating = article.querySelector('[role="img"][aria-label*=" stars"]');
        var cardLines = lines(article);
        return {
          name: clean(link && link.getAttribute('aria-label')),
          url: link && link.href || '',
          rating_label: clean(rating && rating.getAttribute('aria-label')),
          is_sponsored: cardLines.some(function(line) {
            return /^(?:Sponsored|Ad)$/i.test(line);
          }),
          lines: cardLines,
        };
      });
      var bodyText = clean(document.body && document.body.innerText || '');
      return {
        candidates: candidates,
        challenge: /unusual traffic|not a robot|recaptcha|captcha/i.test(bodyText)
          || /sorry|before you continue/i.test(document.title || ''),
        language: (document.documentElement.getAttribute('lang') || '').toLowerCase(),
        title: document.title || '',
        url: window.location.href || '',
        body_text: bodyText.slice(0, 2500),
      };
    })()
  `);
}

async function scrollMapsFeed(page, target) {
  let previousCount = -1;
  let unchangedAttempts = 0;
  for (let attempt = 0; attempt < 10; attempt++) {
    const state = await page.evaluate(`
      (function() {
        var feed = document.querySelector('[role="feed"]');
        if (!feed) return {count: 0, found: false};
        var count = feed.querySelectorAll('[role="article"]').length;
        feed.scrollTop = feed.scrollHeight;
        return {count: count, found: true};
      })()
    `);
    if (!state?.found || state.count >= target) return;
    unchangedAttempts = state.count === previousCount ? unchangedAttempts + 1 : 0;
    if (unchangedAttempts >= 2) return;
    previousCount = state.count;
    await page.wait(1);
  }
}

async function expandMapsReviewText(page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const expanded = await page.evaluate(`
      (function() {
        var buttons = Array.from(document.querySelectorAll(
          'div[data-review-id][aria-label] button[aria-label="See more"]'
        ));
        buttons.forEach(function(button) { button.click(); });
        return buttons.length;
      })()
    `);
    if (!expanded) return;
    await page.wait(0.25);
  }
}

async function scrollMapsReviews(page, target, rating) {
  let previousCount = -1;
  let unchangedAttempts = 0;
  for (let attempt = 0; attempt < 40; attempt++) {
    const state = await page.evaluate(`
      (function() {
        var desiredRating = ${JSON.stringify(rating)};
        var cards = Array.from(document.querySelectorAll('div[data-review-id][aria-label]'))
          .filter(function(card) {
            return card.querySelector('.d4r55') && card.querySelector('.DU9Pgb');
          });
        cards.forEach(function(card) {
          var more = card.querySelector('button[aria-label="See more"]');
          if (more) more.click();
        });
        var sortLabels = ${JSON.stringify(Object.values(MAPS_REVIEW_SORT_LABELS))};
        var hotelSort = Array.from(
          document.querySelectorAll('button[aria-haspopup="true"][aria-label]')
        ).find(function(button) {
          return sortLabels.indexOf((button.getAttribute('aria-label') || '').trim()) !== -1;
        });
        var anchor = cards[cards.length - 1]
          || document.querySelector('button[aria-label="Sort reviews"]')
          || hotelSort;
        var scroller = anchor && anchor.parentElement;
        while (scroller) {
          var style = window.getComputedStyle(scroller);
          if (scroller.scrollHeight > scroller.clientHeight + 50
              && /(?:auto|scroll)/.test(style.overflowY)) break;
          scroller = scroller.parentElement;
        }
        var matching = desiredRating === null ? cards.length : cards.filter(function(card) {
          var star = card.querySelector('[role="img"][aria-label*=" star"]');
          var label = star && star.getAttribute('aria-label') || '';
          var outOfFive = Array.from(card.querySelectorAll('.DU9Pgb span')).find(function(node) {
            var parts = (node.textContent || '').replace(/\\s+/g, '').split('/');
            var value = Number((parts[0] || '').replace(',', '.'));
            return parts.length === 2 && parts[0] !== '' && parts[1] === '5'
              && value >= 0 && value <= 5;
          });
          var outOfFiveValue = Number(
            (outOfFive && outOfFive.textContent || '').replace(/\\s+/g, '').split('/')[0]
          );
          return new RegExp('^' + desiredRating + ' stars?$', 'i').test(label.trim())
            || outOfFiveValue === desiredRating;
        }).length;
        if (!scroller) return {count: cards.length, matching: matching, found: false};
        scroller.scrollTop = scroller.scrollHeight;
        scroller.dispatchEvent(new Event('scroll', {bubbles: true}));
        return {count: cards.length, matching: matching, found: true};
      })()
    `);
    if (state?.matching >= target || (rating !== null && state?.count >= 200)) break;
    if (!state?.found) {
      if ((state?.count ?? 0) === 0 && attempt < 8) {
        await page.wait(1);
        continue;
      }
      return;
    }
    unchangedAttempts = state.count === previousCount ? unchangedAttempts + 1 : 0;
    if (unchangedAttempts >= 8) break;
    previousCount = state.count;
    await page.wait(1);
  }
  await expandMapsReviewText(page);
}

async function openMapsReviewPanel(page) {
  const opened = await page.evaluate(`
    (function() {
      var tab = document.querySelector('[role="tab"][aria-label^="Reviews for "]');
      if (tab && tab.getAttribute('aria-selected') === 'true') return true;
      var control = tab || document.querySelector('button[aria-label^="More reviews"]')
        || Array.from(document.querySelectorAll('button')).find(function(button) {
          return /^More reviews(?:\\s|\\()/i.test((button.innerText || '').trim());
        });
      if (!control) return Boolean(document.querySelector('button[aria-label="Sort reviews"]'));
      control.click();
      return true;
    })()
  `);
  if (!opened) return false;
  await page.wait(0.75);
  await waitForMapsSelector(
    page,
    'button[aria-label="Sort reviews"], button[aria-label="All reviews"][aria-haspopup="true"], div[data-review-id][aria-label]',
  );
  return page.evaluate(`
    Boolean(
      document.querySelector('button[aria-label="Sort reviews"]')
      || document.querySelector('button[aria-label="All reviews"][aria-haspopup="true"]')
      || document.querySelector('div[data-review-id][aria-label]')
    )
  `);
}

async function selectGoogleHotelReviews(page) {
  const sourceButton = await page.evaluate(`
    (function() {
      var button = document.querySelector(
        'button[aria-label="All reviews"][aria-haspopup="true"]'
      );
      if (!button) return false;
      button.click();
      return true;
    })()
  `);
  if (!sourceButton) return;
  await waitForMapsSelector(page, '[role="menuitemradio"]');
  const selected = await page.evaluate(`
    (function() {
      var item = Array.from(document.querySelectorAll('[role="menuitemradio"]'))
        .find(function(candidate) {
          return (candidate.innerText || candidate.textContent || '').trim() === 'Google';
        });
      if (!item) return false;
      item.click();
      return true;
    })()
  `);
  if (!selected) {
    throw new CommandExecutionError("Google Maps did not expose its Google hotel-review source");
  }
  await page.wait(1);
}

async function selectMapsReviewSort(page, sort) {
  if (sort === "relevant") return;
  const label = MAPS_REVIEW_SORT_LABELS[sort];
  const sortControl = await page.evaluate(`
    (function() {
      var labels = ${JSON.stringify(Object.values(MAPS_REVIEW_SORT_LABELS))};
      var desired = ${JSON.stringify(label)};
      var button = document.querySelector('button[aria-label="Sort reviews"]')
        || Array.from(document.querySelectorAll('button[aria-haspopup="true"][aria-label]'))
          .find(function(candidate) {
            return labels.indexOf((candidate.getAttribute('aria-label') || '').trim()) !== -1;
          });
      if (!button) return {found: false, already_selected: false};
      if ((button.getAttribute('aria-label') || '').trim() === desired) {
        return {found: true, already_selected: true};
      }
      button.click();
      return {found: true, already_selected: false};
    })()
  `);
  if (!sortControl?.found) {
    throw new CommandExecutionError("Google Maps did not expose its review sorting control");
  }
  if (sortControl.already_selected) return;
  await waitForMapsSelector(page, '[role="menuitemradio"]');
  const selected = await page.evaluate(`
    (function() {
      var label = ${JSON.stringify(label)};
      var item = Array.from(document.querySelectorAll('[role="menuitemradio"]'))
        .find(function(candidate) {
          return (candidate.innerText || candidate.textContent || '').trim() === label;
        });
      if (!item) return false;
      item.click();
      return true;
    })()
  `);
  if (!selected) {
    throw new CommandExecutionError(`Google Maps did not expose its ${label} review sort`);
  }
  await page.wait(1);
}

async function extractMapsPlace(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }

      function ariaValue(selector, prefix) {
        var node = document.querySelector(selector);
        var label = clean(node && node.getAttribute('aria-label'));
        return label.replace(new RegExp('^' + prefix + '\\s*', 'i'), '');
      }

      var main = document.querySelector('[role="main"]') || document;
      var heading = main.querySelector('h1.DUwDvf') || main.querySelector('h1');
      var header = heading && heading.closest('.TIHn2') || main;
      var rating = header.querySelector('.F7nice [role="img"][aria-label$=" stars"]')
        || header.querySelector('.F7nice [role="img"][aria-label*=" stars"]');
      var reviews = header.querySelector('.F7nice [role="img"][aria-label*=" reviews"]');
      var website = main.querySelector('[data-item-id="authority"]');
      var hoursIcon = main.querySelector('[role="img"][aria-label="Hours"]');
      var hoursContainer = hoursIcon && hoursIcon.closest('[role="button"]');
      var hoursSection = hoursContainer && hoursContainer.parentElement;
      var openStatus = hoursContainer && (hoursContainer.querySelector('.ZDu9vd')
        || hoursContainer.querySelector('.o0Svhf'));
      var weeklyHours = Array.from(hoursSection ? hoursSection.querySelectorAll('tr') : [])
        .map(function(row) {
          var cells = Array.from(row.querySelectorAll('td')).map(function(cell) {
            return clean(cell.textContent);
          }).filter(Boolean);
          return cells.length >= 2 ? cells[0] + ': ' + cells[1] : '';
        })
        .filter(Boolean);
      var price = header.querySelector('[role="img"][aria-label$=" priced"]');
      var headerText = clean(header && header.innerText || '');
      var priceRange = headerText.match(
        /(?:[$€£¥₹₩₱฿]{1,3}|[A-Z]{3}\\s*)\\s*\\d+(?:[.,]\\d+)?\\s*[–-]\\s*\\d+(?:[.,]\\d+)?/
      );
      var bodyText = clean(document.body && document.body.innerText || '');

      return {
        name: clean(heading && heading.textContent),
        category: clean((header.querySelector('button.DkEaL') || {}).textContent),
        rating_label: clean(rating && rating.getAttribute('aria-label')),
        reviews_label: clean(reviews && reviews.getAttribute('aria-label')),
        price_level: clean(price && price.textContent) || clean(priceRange && priceRange[0]),
        address: ariaValue('[data-item-id="address"]', 'Address:'),
        open_status: clean(openStatus && openStatus.textContent),
        hours: weeklyHours.join('; '),
        phone: ariaValue('[data-item-id^="phone:"]', 'Phone:'),
        website: website && website.href || '',
        plus_code: ariaValue('[data-item-id="oloc"]', 'Plus code:'),
        url: window.location.href || '',
        language: (document.documentElement.getAttribute('lang') || '').toLowerCase(),
        challenge: /unusual traffic|not a robot|recaptcha|captcha/i.test(bodyText)
          || /sorry|before you continue/i.test(document.title || ''),
        body_text: bodyText.slice(0, 2500),
      };
    })()
  `);
}

async function extractMapsReviews(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }

      function reviewPhotoCount(card) {
        var photos = Array.from(card.querySelectorAll('button[data-photo-index]'));
        if (!photos.length) return 0;
        var lastLabel = clean(photos[photos.length - 1].getAttribute('aria-label'));
        var more = lastLabel.match(/^\\+\\s*([0-9][0-9,]*)\\s+more\\s+photos?/i);
        return more
          ? Math.max(0, photos.length - 1) + Number(more[1].replace(/,/g, ''))
          : photos.length;
      }

      var main = document.querySelector('[role="main"]') || document;
      var heading = main.querySelector('h1.DUwDvf') || main.querySelector('h1');
      var cards = Array.from(main.querySelectorAll('div[data-review-id][aria-label]'))
        .filter(function(card) {
          return card.querySelector('.d4r55') && card.querySelector('.DU9Pgb');
        });
      var reviews = cards.map(function(card) {
        var authorLink = card.querySelector('[data-href*="/maps/contrib/"]')
          || card.querySelector('a[href*="/maps/contrib/"]');
        var ownerResponse = card.querySelector('.CDe7pd');
        var rating = card.querySelector(
          '[role="img"][aria-label$=" star"], [role="img"][aria-label$=" stars"]'
        );
        var outOfFive = Array.from(card.querySelectorAll('.DU9Pgb span')).find(function(node) {
          var parts = clean(node.textContent).replace(/\\s+/g, '').split('/');
          var value = Number((parts[0] || '').replace(',', '.'));
          return parts.length === 2 && parts[0] !== '' && parts[1] === '5'
            && value >= 0 && value <= 5;
        });
        var date = card.querySelector('.DU9Pgb .rsqaWe') || card.querySelector('.rsqaWe');
        var hotelDate = card.querySelector('.DU9Pgb .xRkPPb');
        var reviewSource = card.querySelector('.DU9Pgb .qmhsmd');
        var text = card.querySelector('.MyEned .wiI7pd') || card.querySelector('.wiI7pd');
        var language = card.querySelector('.MyEned[lang]');
        var like = Array.from(card.querySelectorAll('button[aria-label]')).find(function(button) {
          return /^(?:Like|[0-9][0-9.,]*\\s*[KMB]?\\s+likes?)$/i.test(
            clean(button.getAttribute('aria-label'))
          );
        });
        return {
          review_id: clean(card.getAttribute('data-review-id')),
          author: clean((card.querySelector('.d4r55') || {}).textContent)
            || clean(card.getAttribute('aria-label')),
          author_metadata: clean((card.querySelector('.RfnDt') || {}).textContent),
          author_url: clean(authorLink && (authorLink.getAttribute('data-href') || authorLink.href)),
          rating_label: clean(rating && rating.getAttribute('aria-label'))
            || clean(outOfFive && outOfFive.textContent),
          date: clean(date && date.textContent)
            || clean(hotelDate && hotelDate.textContent).replace(/\\s+on\\s+.+$/i, ''),
          review_source: clean(reviewSource && reviewSource.textContent) || 'Google',
          text: clean(text && text.textContent),
          language: clean(language && language.getAttribute('lang')),
          photo_count: reviewPhotoCount(card),
          like_label: clean(like && like.getAttribute('aria-label')),
          owner_response: clean((ownerResponse && ownerResponse.querySelector('.wiI7pd') || {})
            .textContent),
          owner_response_date: clean((ownerResponse && ownerResponse.querySelector('.rsqaWe') || {})
            .textContent),
        };
      });
      var bodyText = clean(document.body && document.body.innerText || '');
      return {
        business: clean(heading && heading.textContent),
        reviews: reviews,
        challenge: /unusual traffic|not a robot|recaptcha|captcha/i.test(bodyText)
          || /sorry|before you continue/i.test(document.title || ''),
        language: (document.documentElement.getAttribute('lang') || '').toLowerCase(),
        title: document.title || '',
        url: window.location.href || '',
        body_text: bodyText.slice(0, 2500),
      };
    })()
  `);
}

async function extractMapsRoutes(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }

      var cards = Array.from(document.querySelectorAll('div[data-trip-index][role]'))
        .filter(function(card) {
          return card.querySelector('h1') && card.querySelector('[role="img"][aria-label]');
        });
      var routes = cards.map(function(card) {
        var mode = card.querySelector('[role="img"][aria-label]');
        var duration = card.querySelector('.Fk3sm');
        var distance = card.querySelector('.ivN21e');
        var name = card.querySelector('h1');
        var details = card.querySelector('.ue5qRc .JxBYrc') || card.querySelector('.ue5qRc');
        return {
          name: clean(name && name.textContent),
          travel_mode: clean(mode && mode.getAttribute('aria-label')),
          duration: clean(duration && duration.textContent),
          distance: clean(distance && distance.textContent),
          details: clean(details && details.textContent),
        };
      });
      var bodyText = clean(document.body && document.body.innerText || '');
      return {
        routes: routes,
        challenge: /unusual traffic|not a robot|recaptcha|captcha/i.test(bodyText)
          || /sorry|before you continue/i.test(document.title || ''),
        language: (document.documentElement.getAttribute('lang') || '').toLowerCase(),
        title: document.title || '',
        url: window.location.href || '',
        body_text: bodyText.slice(0, 2500),
      };
    })()
  `);
}

function assertReadableMapsPage(payload, surface) {
  if (payload?.challenge) {
    throw new CommandExecutionError(
      `Google Maps served a CAPTCHA or consent page during ${surface}; clear it in the browser and retry`,
    );
  }
  if (!String(payload?.language || "").startsWith("en")) {
    throw new CommandExecutionError(
      `Google Maps did not honor the required English extraction locale (rendered ${payload?.language || "an unknown locale"})`,
    );
  }
}

async function waitForMapsSelector(page, selector) {
  try {
    await page.wait({ selector, timeout: 15 });
  } catch {
    await page.wait(2);
  }
}

async function waitForResolvedPlaceUrl(page) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const currentUrl = await page.evaluate("window.location.href || ''");
    if (/\/maps\/place\//.test(currentUrl) && /(?:!3d|@-?\d)/.test(currentUrl)) return;
    await page.wait(0.5);
  }
}

async function resolveMapsPlace(page, query) {
  await waitForResolvedPlaceUrl(page);
  let detail = await extractMapsPlace(page);
  assertReadableMapsPage(detail, "place lookup");
  if (!detail?.name) {
    const firstPlaceUrl = await page.evaluate(`
      (function() {
        var link = document.querySelector(
          '[role="feed"] [role="article"] a[aria-label][href*="/maps/place/"]'
        );
        return link && link.href || '';
      })()
    `);
    if (!firstPlaceUrl) {
      throw new CommandExecutionError(
        `Google Maps returned no place matching "${query}"; try a more specific name or address`,
      );
    }
    await page.goto(firstPlaceUrl);
    await waitForMapsSelector(page, "h1.DUwDvf");
    await waitForResolvedPlaceUrl(page);
    detail = await extractMapsPlace(page);
    assertReadableMapsPage(detail, "place detail lookup");
  }
  if (!detail?.name) {
    throw new CommandExecutionError(
      `Google Maps could not read details for "${query}"; inspect the browser for an interstitial`,
    );
  }
  return detail;
}

cli({
  site: "google",
  name: "maps",
  access: "read",
  description: "Search Google Maps places, read place details or reviews, or compare routes",
  example:
    'opencli google maps reviews "Ferry Building, San Francisco" --review-sort newest --limit 5 -f json',
  domain: "google.com",
  strategy: Strategy.PUBLIC,
  browser: true,
  args: [
    {
      name: "operation",
      type: "string",
      positional: true,
      required: true,
      choices: MAPS_OPERATIONS,
      help: "Operation to run: search, place, reviews, or directions",
    },
    {
      name: "query",
      type: "string",
      positional: true,
      required: true,
      help: "Place/category or merchant query, or the route origin for directions",
    },
    {
      name: "near",
      type: "string",
      help: "Search near this landmark, address, neighborhood, or city",
    },
    {
      name: "place-id",
      type: "string",
      help: "Google Place ID that disambiguates a search, place, or reviews query",
    },
    {
      name: "min-rating",
      type: "float",
      help: "Minimum search-result rating from 0 to 5",
    },
    {
      name: "min-reviews",
      type: "int",
      help: "Minimum search-result review count",
    },
    {
      name: "open-now",
      type: "boolean",
      default: false,
      help: "Return only search results displayed as open",
    },
    {
      name: "sort",
      type: "string",
      default: "relevance",
      choices: MAPS_SORTS,
      help: "Sort search results by map relevance, rating, or review count",
    },
    {
      name: "review-sort",
      type: "string",
      default: "relevant",
      choices: MAPS_REVIEW_SORTS,
      help: "Use the review panel's Google relevance, newest, highest, or lowest sort",
    },
    {
      name: "rating",
      type: "int",
      help: "Return reviews with this star rating (1-5)",
    },
    {
      name: "to",
      type: "string",
      help: "Route destination (required for directions)",
    },
    {
      name: "origin-place-id",
      type: "string",
      help: "Google Place ID that disambiguates the route origin",
    },
    {
      name: "destination-place-id",
      type: "string",
      help: "Google Place ID that disambiguates the route destination",
    },
    {
      name: "waypoints",
      type: "string",
      help: "Up to nine pipe-separated intermediate route stops, in order",
    },
    {
      name: "waypoint-place-ids",
      type: "string",
      help: "Pipe-separated Place IDs corresponding one-for-one with waypoints",
    },
    {
      name: "travel-mode",
      type: "string",
      default: "driving",
      choices: MAPS_TRAVEL_MODES,
      help: "Directions travel mode",
    },
    {
      name: "avoid",
      type: "string",
      help: "Comma-separated route features to avoid: ferries, highways, tolls",
    },
    {
      name: "limit",
      type: "int",
      default: 10,
      help: "Maximum places, reviews, or route alternatives to return (1-50)",
    },
    {
      name: "region",
      type: "string",
      default: "US",
      help: "Two-letter country code used for local ranking and address conventions",
    },
  ],
  columns: [
    "result_type",
    "rank",
    "name",
    "business",
    "review_id",
    "author",
    "author_url",
    "local_guide",
    "author_review_count",
    "author_photo_count",
    "review_source",
    "date",
    "text",
    "language",
    "like_count",
    "photo_count",
    "owner_response",
    "owner_response_date",
    "business_url",
    "category",
    "rating",
    "review_count",
    "price_level",
    "address",
    "open_status",
    "distance",
    "duration",
    "travel_mode",
    "phone",
    "website",
    "latitude",
    "longitude",
    "url",
  ],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError("Browser session required for google maps");

    let operation;
    let query;
    let destination;
    let limit;
    let minRating;
    let minReviews;
    let rating = null;
    let reviewSort;
    let region;
    let sourceUrl;
    try {
      operation = String(kwargs.operation || "")
        .trim()
        .toLowerCase();
      query = String(kwargs.query || "").trim();
      destination = String(kwargs.to || "").trim();
      limit = integerInRange(kwargs.limit, "limit", 1, 50);
      minRating = optionalNumberInRange(kwargs["min-rating"], "min-rating", 0, 5);
      minReviews = optionalNonNegativeInteger(kwargs["min-reviews"], "min-reviews");
      if (kwargs.rating !== undefined && kwargs.rating !== null && kwargs.rating !== "") {
        rating = integerInRange(kwargs.rating, "rating", 1, 5);
      }
      reviewSort = String(kwargs["review-sort"] || "relevant");
      if (!MAPS_REVIEW_SORTS.includes(reviewSort)) {
        throw new Error(`review-sort must be one of: ${MAPS_REVIEW_SORTS.join(", ")}`);
      }
      region = normalizeRegion(kwargs.region);
      if (operation !== "search") {
        if (String(kwargs.near || "").trim()) throw new Error("near is only valid for search");
        if (
          minRating !== null ||
          minReviews !== null ||
          kwargs["open-now"] === true ||
          kwargs.sort !== "relevance"
        ) {
          throw new Error(
            "min-rating, min-reviews, open-now, and sort filters are only valid for search",
          );
        }
      }
      if (operation !== "reviews" && (rating !== null || reviewSort !== "relevant")) {
        throw new Error("rating and review-sort are only valid for reviews");
      }
      if (operation !== "directions" && destination) {
        throw new Error("to is only valid for directions");
      }
      if (
        operation !== "directions" &&
        [
          kwargs["origin-place-id"],
          kwargs["destination-place-id"],
          kwargs.waypoints,
          kwargs["waypoint-place-ids"],
          kwargs.avoid,
        ].some((value) => String(value || "").trim())
      ) {
        throw new Error(
          "origin/destination Place IDs, waypoints, and avoid are only valid for directions",
        );
      }
      if (operation === "directions" && String(kwargs["place-id"] || "").trim()) {
        throw new Error("use origin-place-id or destination-place-id for directions");
      }
      sourceUrl = buildMapsUrl({
        operation,
        query,
        near: kwargs.near,
        placeId: kwargs["place-id"],
        destination,
        originPlaceId: kwargs["origin-place-id"],
        destinationPlaceId: kwargs["destination-place-id"],
        waypoints: kwargs.waypoints,
        waypointPlaceIds: kwargs["waypoint-place-ids"],
        travelMode: kwargs["travel-mode"],
        avoid: kwargs.avoid,
        region,
      });
    } catch (error) {
      validationError(error);
    }

    await page.goto(sourceUrl);

    if (operation === "directions") {
      await waitForMapsSelector(page, "div[data-trip-index][role]");
      const payload = await extractMapsRoutes(page);
      assertReadableMapsPage(payload, "directions lookup");
      const routes = Array.isArray(payload?.routes) ? payload.routes : [];
      if (routes.length === 0) {
        throw new CommandExecutionError(
          `Google Maps returned no readable routes from "${query}" to "${destination}"; check the locations and travel mode`,
        );
      }
      return routes.slice(0, limit).map((route, index) =>
        normalizeMapsRouteCandidate(route, index, {
          origin: query,
          destination,
          waypoints: parseDelimitedList(kwargs.waypoints, "|"),
          travelMode: kwargs["travel-mode"],
          sourceUrl: payload?.url || sourceUrl,
        }),
      );
    }

    await waitForMapsSelector(page, '[role="feed"] [role="article"], h1.DUwDvf');

    if (operation === "place") {
      const detail = await resolveMapsPlace(page, query);
      return [normalizeMapsPlaceCandidate(detail, sourceUrl)];
    }

    if (operation === "reviews") {
      const detail = await resolveMapsPlace(page, query);
      const businessUrl = detail.url || sourceUrl;
      if (!(await openMapsReviewPanel(page))) {
        throw new CommandExecutionError(
          `Google Maps exposed no public reviews for "${detail.name}"`,
        );
      }
      await selectGoogleHotelReviews(page);
      await selectMapsReviewSort(page, reviewSort);
      await scrollMapsReviews(page, limit, rating);
      const payload = await extractMapsReviews(page);
      assertReadableMapsPage(payload, "review lookup");
      const seen = new Set();
      const rows = (Array.isArray(payload?.reviews) ? payload.reviews : [])
        .map((candidate, index) =>
          normalizeMapsReviewCandidate(candidate, index, {
            business: payload?.business || detail.name,
            businessUrl,
            sourceUrl: payload?.url || businessUrl,
          }),
        )
        .filter((row) => {
          const identity = row.review_id || `${row.author}|${row.date}|${row.text}`;
          if (seen.has(identity)) return false;
          seen.add(identity);
          return true;
        });
      if (rows.length === 0) {
        throw new CommandExecutionError(
          `Google Maps returned no readable reviews for "${detail.name}"; inspect the browser for an interstitial`,
        );
      }
      const results = filterMapsReviewRows(rows, { rating, limit });
      if (results.length === 0) {
        throw new CommandExecutionError(
          `Google Maps exposed ${rows.length} reviews for "${detail.name}", but none matched the ${rating}-star filter; try a different review sort`,
        );
      }
      return results;
    }

    const needsBroadLoad =
      minRating !== null ||
      minReviews !== null ||
      kwargs["open-now"] === true ||
      kwargs.sort !== "relevance";
    await scrollMapsFeed(page, needsBroadLoad ? 50 : limit);
    const payload = await extractMapsSearchCandidates(page);
    assertReadableMapsPage(payload, "place search");
    let rows = dedupeMapsRows(
      (Array.isArray(payload?.candidates) ? payload.candidates : [])
        .map((candidate, index) =>
          normalizeMapsSearchCandidate(candidate, index, payload?.url || sourceUrl),
        )
        .filter((row) => row.name),
    );

    // A sufficiently specific Maps search may open a detail panel instead of a
    // result feed. Preserve the search contract by returning that place as rank 1.
    if (rows.length === 0) {
      await waitForResolvedPlaceUrl(page);
      const detail = await extractMapsPlace(page);
      assertReadableMapsPage(detail, "place search");
      if (detail?.name) {
        const place = normalizeMapsPlaceCandidate(detail, sourceUrl);
        rows = [{ ...place, _pageOrder: 0, page_rank: 1, result_type: "place" }];
      }
    }

    if (rows.length === 0) {
      throw new CommandExecutionError(
        `Google Maps returned no readable places for "${query}"; try another query or inspect the browser for an interstitial`,
      );
    }

    const results = filterAndSortMapsRows(rows, {
      minRating,
      minReviews,
      openNow: kwargs["open-now"] === true,
      sort: kwargs.sort,
      limit,
    });
    if (results.length === 0) {
      throw new CommandExecutionError(
        `Google Maps exposed ${rows.length} places, but none matched the requested filters`,
      );
    }
    return results;
  },
});
