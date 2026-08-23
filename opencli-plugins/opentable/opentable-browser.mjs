import { CommandExecutionError, EmptyResultError } from "@jackwener/opencli/errors";
import {
  buildOpenTableSearchUrl,
  canonicalOpenTableRestaurantUrl,
  cleanText,
} from "./opentable-helpers.mjs";

const HOME_URL = "https://www.opentable.com/?lang=en-US";

export function assertReadableOpenTablePage(payload, surface) {
  if (payload?.challenge) {
    throw new CommandExecutionError(
      `OpenTable served an access challenge during ${surface}`,
      "Wait a few minutes, then open OpenTable in the browser and retry after the public page loads normally.",
    );
  }
  if (payload?.not_found) {
    throw new EmptyResultError("opentable restaurant", `OpenTable could not find ${surface}`);
  }
}

export async function waitForOpenTableSelector(page, selector, timeout = 15) {
  try {
    await page.wait({ selector, timeout });
  } catch {
    await page.wait(2);
  }
}

export async function navigateFreshOpenTablePage(page, url, selector = "main, h1") {
  await page.goto(url);
  await waitForOpenTableSelector(page, selector);
}

export async function extractOpenTableAutocomplete(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/[\\u00a0\\u202f]/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }

      var options = Array.from(document.querySelectorAll('[role="option"]')).map(function(option) {
        var locationItem = option.querySelector('[data-test="location-autocomplete-item"]');
        var restaurantItem = option.querySelector('[data-test="restaurant-autocomplete-item"]');
        var freeTextItem = option.querySelector('[data-test="freetext-autocomplete-item"]');
        var item = locationItem || restaurantItem || freeTextItem || option;
        var labeled = item.querySelector('[aria-label]');
        var contextNode = item.querySelector('div:not([role]):last-child');
        return {
          id: clean(option.id),
          kind: locationItem ? 'location' : restaurantItem ? 'restaurant' : 'freetext',
          name: clean(labeled && labeled.getAttribute('aria-label'))
            || clean(item.querySelector('span') && item.querySelector('span').textContent)
            || clean(item.textContent),
          context: clean(contextNode && contextNode.textContent),
        };
      }).filter(function(item) { return item.id && item.name; });
      var bodyText = clean(document.body && document.body.innerText || '');
      return {
        options: options,
        challenge: /access denied|captcha|are you a human|unusual activity|akamai|temporarily blocked/i.test(bodyText)
          || /access denied|captcha/i.test(document.title || ''),
        title: document.title || '',
        url: location.href || '',
        body_text: bodyText.slice(0, 2500),
      };
    })()
  `);
}

function normalizeAutocompleteText(value) {
  return cleanText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function scoreOpenTableAutocompleteCandidate(candidate, query, location, kind) {
  if (candidate.kind !== kind) return -1;
  const name = normalizeAutocompleteText(candidate.name);
  const normalizedQuery = normalizeAutocompleteText(query);
  const context = normalizeAutocompleteText(candidate.context);
  const normalizedLocation = normalizeAutocompleteText(location);
  let score = 0;
  if (!name || !normalizedQuery) return score;
  if (name === normalizedQuery) score = 100;
  else if (name.startsWith(`${normalizedQuery} `) || normalizedQuery.startsWith(`${name} `)) {
    score = 70;
  } else if (` ${name} `.includes(` ${normalizedQuery} `)) {
    score = 40;
  }
  if (score > 0 && normalizedLocation && context.includes(normalizedLocation)) score += 30;
  return score;
}

async function loadAutocomplete(page, value) {
  await navigateFreshOpenTablePage(page, HOME_URL, '[data-test="search-autocomplete-input"]');
  const initialPayload = await extractOpenTableAutocomplete(page);
  assertReadableOpenTablePage(initialPayload, `autocomplete for "${value}"`);
  try {
    if (typeof page.fillText === "function") {
      await page.fillText('[data-test="search-autocomplete-input"]', value);
    } else {
      const encoded = JSON.stringify(value);
      const filled = await page.evaluate(`
        (function() {
          var input = document.querySelector('[data-test="search-autocomplete-input"]');
          if (!input) return false;
          var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          setter.call(input, ${encoded});
          input.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'insertText'}));
          input.dispatchEvent(new Event('change', {bubbles: true}));
          return true;
        })()
      `);
      if (!filled) throw new Error("search input not found");
    }
  } catch (error) {
    throw new CommandExecutionError(
      `OpenTable's public search input was unavailable for "${value}"`,
      `Inspect the browser for a changed page layout, then retry. ${cleanText(error?.message)}`,
    );
  }
  await waitForOpenTableSelector(
    page,
    '[role="option"], [data-test="autocomplete-items-dropdown"]',
  );
  const payload = await extractOpenTableAutocomplete(page);
  assertReadableOpenTablePage(payload, `autocomplete for "${value}"`);
  return payload;
}

async function clickAutocompleteAndReadUrl(page, candidate) {
  try {
    await page.click(`#${candidate.id}`);
  } catch (error) {
    if (!/navigat|target|context/i.test(String(error?.message || error))) throw error;
  }
  await page.wait(1).catch(() => {});
  return page.evaluate("location.href || ''");
}

export async function resolveOpenTableLocation(page, location) {
  const query = cleanText(location);
  const payload = await loadAutocomplete(page, query);
  const candidates = (payload.options || [])
    .map((candidate) => ({
      candidate,
      score: scoreOpenTableAutocompleteCandidate(candidate, query, "", "location"),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
  if (candidates.length === 0) {
    throw new EmptyResultError("opentable location", `No OpenTable location matched "${query}"`);
  }
  const selected = candidates[0].candidate;
  if (Number.isFinite(selected.latitude) && Number.isFinite(selected.longitude)) {
    return {
      name: selected.name,
      context: selected.context || null,
      latitude: selected.latitude,
      longitude: selected.longitude,
    };
  }

  const destination = await clickAutocompleteAndReadUrl(page, selected);
  const url = new URL(destination);
  const latitude = Number(url.searchParams.get("latitude"));
  const longitude = Number(url.searchParams.get("longitude"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new CommandExecutionError(
      `OpenTable selected "${selected.name}" but did not expose its search coordinates`,
    );
  }
  return {
    name: url.searchParams.get("searchedLocationName") || selected.name,
    context: selected.context || null,
    latitude,
    longitude,
  };
}

export async function resolveOpenTableBusiness(page, business, location) {
  const canonical = canonicalOpenTableRestaurantUrl(business);
  if (canonical) return { url: canonical, name: null };

  const query = cleanText(business);
  if (!query) throw new CommandExecutionError("business is required");
  const payload = await loadAutocomplete(page, query);
  const candidates = (payload.options || [])
    .map((candidate) => ({
      candidate,
      score: scoreOpenTableAutocompleteCandidate(candidate, query, location, "restaurant"),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
  if (candidates.length === 0) {
    const locationHint = location ? ` near "${location}"` : "";
    throw new EmptyResultError(
      "opentable restaurant",
      `No OpenTable restaurant suggestion matched "${query}"${locationHint}; pass a /r/ URL or alias to disambiguate`,
    );
  }
  const selected = candidates[0].candidate;
  const destination = await clickAutocompleteAndReadUrl(page, selected);
  let url;
  try {
    url = canonicalOpenTableRestaurantUrl(destination);
  } catch {
    url = null;
  }
  if (!url) {
    throw new CommandExecutionError(
      `OpenTable selected "${selected.name}" but did not navigate to a restaurant page`,
    );
  }
  return { url, name: selected.name };
}

export async function navigateOpenTableSearch(page, options) {
  const location = await resolveOpenTableLocation(page, options.location);
  const sourceUrl = buildOpenTableSearchUrl({ ...options, location });
  await navigateFreshOpenTablePage(
    page,
    sourceUrl,
    '[data-test="restaurant-card-link"], [data-testid="restaurant-card"], main',
  );
  return { sourceUrl, location };
}

export async function applyOpenTableFilterLabels(page, labels) {
  const uniqueLabels = [...new Set(labels.map(cleanText).filter(Boolean))];
  if (uniqueLabels.length === 0) return { applied: [], missing: [] };
  const encoded = JSON.stringify(uniqueLabels);
  let result = await page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/[\\u00a0\\u202f]/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }
      var requested = ${encoded};
      var filterButton = Array.from(document.querySelectorAll('button')).find(function(button) {
        return /^filters?$/i.test(clean(button.innerText || button.getAttribute('aria-label')));
      });
      var controls = document.querySelectorAll('input[type="checkbox"], [role="checkbox"]');
      if (controls.length === 0 && filterButton) filterButton.click();
      return {needs_wait: controls.length === 0 && Boolean(filterButton), requested: requested};
    })()
  `);
  if (result?.needs_wait) await page.wait(0.75);
  const expanded = await page.evaluate(`
    (function() {
      function clean(value) { return typeof value === 'string' ? value.replace(/\\s+/g, ' ').trim() : ''; }
      var buttons = Array.from(document.querySelectorAll('button')).filter(function(button) {
        return /^\\+?\\s*more$/i.test(clean(button.textContent));
      });
      buttons.forEach(function(button) { button.click(); });
      return buttons.length;
    })()
  `);
  if (expanded > 0) await page.wait(0.5);
  result = await page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/[\\u00a0\\u202f]/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }
      function labelText(control) {
        var id = control.id || '';
        var label = id ? document.querySelector('label[for="' + CSS.escape(id) + '"]') : null;
        if (!label) label = control.closest('label');
        if (!label) {
          var parent = control.closest('li, [role="option"], [data-test], div');
          label = parent && parent.textContent.length < 180 ? parent : null;
        }
        return clean(label && label.textContent || control.getAttribute('aria-label'));
      }
      var requested = ${encoded};
      var controls = Array.from(document.querySelectorAll('input[type="checkbox"], [role="checkbox"]'));
      var applied = [];
      var missing = [];
      requested.forEach(function(wanted) {
        var normalized = wanted.toLowerCase();
        var control = controls.find(function(candidate) {
          var text = labelText(candidate).toLowerCase();
          return text === normalized || text.startsWith(normalized + ' ');
        });
        if (!control) {
          missing.push(wanted);
          return;
        }
        var checked = control.checked === true || control.getAttribute('aria-checked') === 'true';
        if (!checked) control.click();
        applied.push(wanted);
      });
      return {applied: applied, missing: missing};
    })()
  `);
  if (result?.applied?.length) await page.wait(1);
  return result;
}

export async function extractOpenTableSearchCandidates(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/[\\u00a0\\u202f]/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }
      function canonical(value) {
        try {
          var url = new URL(value, location.origin);
          var match = url.pathname.match(/^\\/r\\/[^/?#]+/i);
          return match ? 'https://www.opentable.com' + match[0] : '';
        } catch (_) { return ''; }
      }
      function unique(values) {
        var seen = {};
        return values.map(clean).filter(function(value) {
          var key = value.toLowerCase();
          if (!value || seen[key]) return false;
          seen[key] = true;
          return true;
        });
      }

      var links = Array.from(document.querySelectorAll('a[href*="/r/"]'));
      var candidates = links.map(function(link, index) {
        var card = link.closest(
          '[data-test="restaurant-card"], [data-testid="restaurant-card"], article, li'
        ) || link;
        var text = clean(card.innerText || card.textContent);
        var heading = card.querySelector('h1, h2, h3, h4, [data-test="restaurant-name"]');
        var rating = card.querySelector('[aria-label*="star" i], [aria-label*="out of 5" i]');
        var priceNode = card.querySelector('[role="img"][aria-label^="Price:" i]');
        var priceWords = clean(priceNode && priceNode.getAttribute('aria-label')).replace(/^Price:\\s*/i, '').toLowerCase();
        var priceFromLabel = /very expensive|very pricey|luxury/.test(priceWords) ? '$$$$'
          : /expensive|pricey/.test(priceWords) ? '$$$'
          : /moderate/.test(priceWords) ? '$$'
          : /inexpensive|cheap|value/.test(priceWords) ? '$'
          : '';
        var reviews = text.match(/(?:\\(|\\b)([0-9][0-9,.]*\\s*[KMB]?)\\s*(?:verified\\s+)?reviews?\\b/i);
        var price = text.match(/(?:^|\\s)([$]{1,4})(?=\\s|[A-Za-z•·]|$)/)
          || text.match(/(\\$\\d+\\s+(?:to|and)\\s+\\$\\d+)/i);
        var booked = text.match(/Booked\\s+([0-9][0-9,.]*\\s*[KMB]?)\\s+times?\\s+today/i);
        var timeNodes = Array.from(card.querySelectorAll('a, button')).filter(function(node) {
          return /^(?:[01]?\\d|2[0-3]):[0-5]\\d(?:\\s*[AP]M)?$/i.test(clean(node.textContent));
        });
        var categoryLinks = Array.from(card.querySelectorAll('a[href*="cuisine"], a[href*="category"]'));
        var neighborhoodLinks = Array.from(card.querySelectorAll('a[href*="neighborhood"]'));
        var priceWrapper = priceNode && priceNode.parentElement;
        var metadata = priceWrapper && priceWrapper.parentElement;
        var metadataParts = metadata ? Array.from(metadata.children).map(function(node) {
          return clean(node.textContent);
        }).filter(Boolean) : [];
        var bulletParts = text.split(/\\s*[•·]\\s*/).map(clean).filter(Boolean);
        var cuisine = clean(categoryLinks[0] && categoryLinks[0].textContent)
          || (metadataParts.length >= 2 ? metadataParts[0] : '');
        var neighborhood = clean(neighborhoodLinks[0] && neighborhoodLinks[0].textContent)
          || (metadataParts.length >= 3 ? metadataParts[metadataParts.length - 1] : '');
        if (!cuisine && bulletParts.length >= 2) cuisine = bulletParts.find(function(part) {
          return !/review|booked|[$]|^[0-5](?:\\.\\d)?$|^[0-9:]+\\s*[AP]M$/i.test(part) && part.length < 80;
        }) || '';
        if (!neighborhood && bulletParts.length >= 3) neighborhood = bulletParts[bulletParts.length - 1];
        var badges = unique(Array.from(card.querySelectorAll(
          '[data-test*="badge"], [data-testid*="badge"], span, p'
        )).map(function(node) { return node.textContent; }).filter(function(value) {
          return /experience|award|michelin/i.test(value || '') && clean(value).length < 100;
        }));
        var rankMatch = text.match(/^\\s*(\\d+)[.)]?\\s/);
        return {
          rank: rankMatch ? Number(rankMatch[1]) : index + 1,
          name: clean(heading && heading.textContent) || clean(link.getAttribute('aria-label')),
          rating_label: clean(rating && rating.getAttribute('aria-label')),
          review_text: reviews ? reviews[1] : '',
          price: priceFromLabel || (price ? price[1] : ''),
          cuisine: cuisine,
          neighborhood: neighborhood,
          booked_today: booked ? booked[1] : '',
          available_times: unique(timeNodes.map(function(node) { return node.textContent; })),
          has_experiences: badges.some(function(value) { return /experience/i.test(value); }),
          url: canonical(link.href),
        };
      }).filter(function(candidate) { return candidate.name && candidate.url; });
      var bodyText = clean(document.body && document.body.innerText || '');
      return {
        candidates: candidates,
        no_results: /no restaurants|we couldn't find|try changing your search|0 restaurants/i.test(bodyText),
        challenge: /access denied|captcha|are you a human|unusual activity|akamai|temporarily blocked/i.test(bodyText)
          || /access denied|captcha/i.test(document.title || ''),
        title: document.title || '',
        url: location.href || '',
        body_text: bodyText.slice(0, 2500),
      };
    })()
  `);
}

export async function loadOpenTableSearchCandidates(page, targetCount) {
  let payload = await extractOpenTableSearchCandidates(page);
  assertReadableOpenTablePage(payload, "restaurant search");
  let previousCount = -1;
  let unchanged = 0;
  for (let attempt = 0; attempt < 8 && (payload.candidates || []).length < targetCount; attempt++) {
    const count = (payload.candidates || []).length;
    unchanged = count === previousCount ? unchanged + 1 : 0;
    if (unchanged >= 2 || typeof page.autoScroll !== "function") break;
    previousCount = count;
    await page.autoScroll({ times: 1, delayMs: 750 });
    payload = await extractOpenTableSearchCandidates(page);
    assertReadableOpenTablePage(payload, "restaurant search");
  }
  return payload;
}

function sectionClickScript(section) {
  return `
    (function() {
      function clean(value) {
        return typeof value === 'string' ? value.replace(/\\s+/g, ' ').trim() : '';
      }
      var wanted = ${JSON.stringify(section)}.toLowerCase();
      var node = Array.from(document.querySelectorAll('a, button')).find(function(candidate) {
        return clean(candidate.textContent).toLowerCase() === wanted;
      });
      if (!node) return false;
      node.click();
      return true;
    })()
  `;
}

export async function openOpenTableSection(page, section) {
  const clicked = await page.evaluate(sectionClickScript(section));
  if (clicked) await page.wait(0.75);
  if (typeof page.autoScroll === "function") await page.autoScroll({ times: 2, delayMs: 400 });
  return clicked;
}

export async function extractOpenTableRestaurant(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/[\\u00a0\\u202f]/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }
      function array(value) { return Array.isArray(value) ? value : value ? [value] : []; }
      function jsonLdObjects() {
        var output = [];
        document.querySelectorAll('script[type="application/ld+json"]').forEach(function(script) {
          try {
            var parsed = JSON.parse(script.textContent);
            var values = Array.isArray(parsed) ? parsed : parsed && parsed['@graph'] ? parsed['@graph'] : [parsed];
            output.push.apply(output, values.filter(Boolean));
          } catch (_) {}
        });
        return output;
      }
      function labelValue(label) {
        var nodes = Array.from(document.querySelectorAll('dt, h3, h4, p, span')).filter(function(node) {
          return clean(node.textContent).toLowerCase() === label.toLowerCase();
        });
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[i];
          var value = node.tagName === 'DT' ? node.nextElementSibling : node.nextElementSibling;
          if (!value && node.parentElement) value = node.parentElement.nextElementSibling;
          var text = clean(value && value.textContent);
          if (text && text.toLowerCase() !== label.toLowerCase()) return text;
        }
        return '';
      }
      function sectionText(heading) {
        var node = Array.from(document.querySelectorAll('h2, h3')).find(function(candidate) {
          return clean(candidate.textContent).toLowerCase() === heading.toLowerCase();
        });
        if (!node) return '';
        var container = node.closest('section') || node.parentElement;
        var paragraphs = Array.from(container ? container.querySelectorAll('p') : [])
          .map(function(p) { return clean(p.textContent); })
          .filter(Boolean);
        return paragraphs.join(' ');
      }

      var objects = jsonLdObjects();
      var restaurant = objects.find(function(value) {
        return array(value && value['@type']).some(function(type) {
          return /Restaurant|FoodEstablishment/i.test(String(type));
        });
      }) || {};
      var address = restaurant.address || {};
      var aggregate = restaurant.aggregateRating || {};
      var heading = document.querySelector('h1');
      var ratingNode = document.querySelector('[aria-label*="star" i], [aria-label*="out of 5" i]');
      var bodyText = clean(document.body && document.body.innerText || '');
      var reviewMatch = bodyText.match(/([0-9][0-9,.]*\\s*[KMB]?)\\s+reviews?\\b/i);
      var priceMatch = bodyText.match(/(?:\\$\\d+\\s+to\\s+\\$\\d+|[$]{1,4})/);
      var addressText = typeof restaurant.address === 'string' ? restaurant.address : [
        address.streetAddress, address.addressLocality, address.addressRegion, address.postalCode,
      ].filter(Boolean).join(', ');
      var websiteCandidates = array(restaurant.sameAs).concat(array(restaurant.url)).map(clean).filter(function(value) {
        return /^https?:/i.test(value) && !/(^|[.])opentable[.]com(?:[/]|$)/i.test(value);
      });
      var websiteLabel = labelValue('Website');
      if (/^https?:/i.test(websiteLabel)) websiteCandidates.push(websiteLabel);
      var websiteHeading = Array.from(document.querySelectorAll('dt, h3, h4, p, span')).find(function(node) {
        return clean(node.textContent).toLowerCase() === 'website';
      });
      var websiteContainer = websiteHeading && (websiteHeading.nextElementSibling || websiteHeading.parentElement);
      var websiteLink = websiteContainer && websiteContainer.querySelector && websiteContainer.querySelector('a[href]');
      if (websiteLink && !/(^|[.])opentable[.]com(?:[/]|$)/i.test(websiteLink.hostname)) {
        websiteCandidates.push(websiteLink.href);
      }
      var features = labelValue('Additional').split(',').map(clean).filter(Boolean);
      var cuisines = array(restaurant.servesCuisine).map(clean).filter(Boolean);
      if (cuisines.length === 0) cuisines = labelValue('Cuisines').split(',').map(clean).filter(Boolean);
      var hours = array(restaurant.openingHours || restaurant.openingHoursSpecification).map(function(value) {
        if (typeof value === 'string') return clean(value);
        if (!value) return '';
        var days = array(value.dayOfWeek).map(function(day) { return String(day).split('/').pop(); }).join(', ');
        return clean(days + ': ' + (value.opens || '') + '-' + (value.closes || ''));
      }).filter(Boolean);
      if (hours.length === 0) {
        var displayedHours = labelValue('Hours of operation');
        if (displayedHours) hours = [displayedHours];
      }
      var canonical = location.href.match(/^https:[/][/]www[.]opentable[.]com[/]r[/][^?#/]+/i);
      return {
        candidate: {
          name: clean(restaurant.name) || clean(heading && heading.textContent),
          rating: aggregate.ratingValue || clean(ratingNode && ratingNode.getAttribute('aria-label')),
          review_count: aggregate.reviewCount || (reviewMatch ? reviewMatch[1] : ''),
          price: clean(restaurant.priceRange) || (priceMatch ? priceMatch[0] : ''),
          cuisines: cuisines,
          neighborhood: labelValue('Neighborhood'),
          address: clean(addressText) || labelValue('Location'),
          hours: hours,
          phone: clean(restaurant.telephone) || labelValue('Phone number') || labelValue('Contact'),
          website: websiteCandidates[0] || (function() {
            var link = Array.from(document.querySelectorAll('a[href]')).find(function(a) {
              return /website/i.test(clean(a.textContent)) && !/opentable\\.com/i.test(a.href);
            });
            return link && link.href || '';
          })(),
          dining_style: labelValue('Dining style'),
          dress_code: labelValue('Dress code'),
          features: features,
          description: clean(restaurant.description) || sectionText('About this restaurant'),
          url: canonical ? canonical[0] : location.href,
        },
        challenge: /access denied|captcha|are you a human|unusual activity|akamai|temporarily blocked/i.test(bodyText)
          || /access denied|captcha/i.test(document.title || ''),
        not_found: /page not found|restaurant not found|404/i.test(document.title || '')
          || /we can't find that restaurant/i.test(bodyText),
        title: document.title || '',
        url: location.href || '',
        body_text: bodyText.slice(0, 2500),
      };
    })()
  `);
}

export async function extractOpenTableAvailability(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/[\\u00a0\\u202f]/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }
      function absolute(value) {
        try {
          var url = value ? new URL(value, location.origin) : null;
          return url && /^(?:http|https):$/.test(url.protocol) ? url.href : '';
        } catch (_) { return ''; }
      }
      function reservationTime(value) {
        var match = clean(value).match(/^(\\d{1,2}):(\\d{2})(?:\\s*([AP])M)?$/i);
        if (!match) return '';
        var hours = Number(match[1]);
        var minutes = Number(match[2]);
        var meridiem = (match[3] || '').toUpperCase();
        if (meridiem) {
          if (hours === 12) hours = 0;
          if (meridiem === 'P') hours += 12;
        }
        if (hours > 23 || minutes > 59) return '';
        return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':00';
      }
      function bookingUrl(node, time) {
        var direct = node.href
          || node.getAttribute('data-href')
          || node.getAttribute('formaction')
          || (node.form && node.form.action)
          || (node.closest('form[action]') && node.closest('form[action]').action);
        var destination = absolute(direct);
        if (destination) return destination;
        try {
          var slot = new URL(location.href);
          var restaurantPath = slot.pathname.match(/^\\/r\\/[^/?#]+/i);
          var dateTime = slot.searchParams.get('dateTime') || '';
          var date = dateTime.match(/^(\\d{4}-\\d{2}-\\d{2})/);
          var normalizedTime = reservationTime(time);
          if (!restaurantPath || !date || !normalizedTime) return '';
          slot.pathname = restaurantPath[0];
          slot.hash = '';
          Array.from(slot.searchParams.keys()).forEach(function(key) {
            if (!/^(?:covers|dateTime|lang)$/i.test(key)) slot.searchParams.delete(key);
          });
          slot.searchParams.set('dateTime', date[1] + 'T' + normalizedTime);
          return slot.href;
        } catch (_) { return ''; }
      }
      var restaurant = clean(document.querySelector('h1') && document.querySelector('h1').textContent);
      var nodes = Array.from(document.querySelectorAll('a, button')).filter(function(node) {
        var text = clean(node.textContent);
        var label = clean(node.getAttribute('aria-label'));
        return /^(?:[01]?\\d|2[0-3]):[0-5]\\d(?:\\s*[AP]M)?$/i.test(text)
          || /(?:reserve|select|book).*(?:[01]?\\d|2[0-3]):[0-5]\\d\\s*[AP]M/i.test(label);
      });
      var candidates = nodes.map(function(node) {
        var text = clean(node.textContent);
        var label = clean(node.getAttribute('aria-label'));
        var timeMatch = (text || label).match(/((?:[01]?\\d|2[0-3]):[0-5]\\d(?:\\s*[AP]M)?)/i);
        var card = node.closest('[data-test*="time"], [data-testid*="time"], article, li, section, div');
        var cardText = clean(card && card.innerText || '');
        var seating = cardText.match(/\\b(Standard|Bar|Counter|High Top|Hightop|Outdoor|Patio)\\b/i);
        var price = cardText.match(/(?:\\$\\s*\\d+(?:\\.\\d{1,2})?(?:\\s+per person)?|[$]{1,4})/i);
        var policy = cardText.match(/(?:free cancellation|non-refundable|prepaid|credit card required|deposit required)[^.]*[.]?/i);
        var experienceNode = card && card.querySelector('h3, h4, [data-test*="experience"]');
        return {
          time: timeMatch ? timeMatch[1].toUpperCase().replace(/\\s+/g, ' ') : '',
          seating_type: seating ? seating[1] : '',
          experience: clean(experienceNode && experienceNode.textContent),
          price: price ? clean(price[0]) : '',
          cancellation_policy: policy ? clean(policy[0]) : '',
          booking_url: bookingUrl(node, timeMatch ? timeMatch[1] : ''),
        };
      }).filter(function(value) { return value.time; });
      var seen = {};
      candidates = candidates.filter(function(value) {
        var key = [value.time, value.seating_type, value.experience, value.booking_url].join('|');
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
      var bodyText = clean(document.body && document.body.innerText || '');
      return {
        restaurant: restaurant,
        candidates: candidates,
        no_results: /no online availability|no times available|find next available/i.test(bodyText),
        challenge: /access denied|captcha|are you a human|unusual activity|akamai|temporarily blocked/i.test(bodyText)
          || /access denied|captcha/i.test(document.title || ''),
        title: document.title || '',
        url: location.href || '',
        body_text: bodyText.slice(0, 2500),
      };
    })()
  `);
}

export async function extractOpenTableReviews(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/[\\u00a0\\u202f]/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }
      var roots = Array.from(document.querySelectorAll(
        '[data-test*="review-card"], [data-testid*="review-card"], [data-test="reviews-list"] li, article'
      )).filter(function(root) {
        var text = clean(root.innerText || root.textContent);
        return text.length > 40 && Boolean(root.querySelector('[aria-label*="star" i], [aria-label*="out of 5" i]'));
      });
      var candidates = roots.map(function(root) {
        var text = clean(root.innerText || root.textContent);
        var rating = root.querySelector('[aria-label*="star" i], [aria-label*="out of 5" i]');
        var author = root.querySelector('[data-test*="author"], [data-testid*="author"], h3, h4, strong');
        var time = root.querySelector('time');
        var paragraphs = Array.from(root.querySelectorAll('p')).map(function(p) {
          return clean(p.textContent);
        }).filter(Boolean);
        var dateMatch = text.match(/\\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2},\\s+\\d{4}\\b/i)
          || text.match(/\\b\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}\\b/);
        var occasion = text.match(/Dined (?:on|for) ([^.•]+)/i);
        var summaryNode = root.querySelector('[data-test*="summary"], [data-testid*="summary"], h5, h6');
        return {
          author: clean(author && author.textContent),
          rating_label: clean(rating && rating.getAttribute('aria-label')),
          date: clean(time && (time.getAttribute('datetime') || time.textContent)) || (dateMatch ? dateMatch[0] : ''),
          occasion: occasion ? clean(occasion[1]) : '',
          summary: clean(summaryNode && summaryNode.textContent),
          text: paragraphs.sort(function(a, b) { return b.length - a.length; })[0] || '',
        };
      }).filter(function(value) { return value.text; });
      var bodyText = clean(document.body && document.body.innerText || '');
      return {
        restaurant: clean(document.querySelector('h1') && document.querySelector('h1').textContent),
        candidates: candidates,
        no_results: /no reviews yet|0 reviews/i.test(bodyText),
        challenge: /access denied|captcha|are you a human|unusual activity|akamai|temporarily blocked/i.test(bodyText)
          || /access denied|captcha/i.test(document.title || ''),
        title: document.title || '',
        url: location.href || '',
        body_text: bodyText.slice(0, 2500),
      };
    })()
  `);
}

export async function extractOpenTableMenu(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/[\\u00a0\\u202f]/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }
      function sectionRoot(name) {
        var heading = Array.from(document.querySelectorAll('h2, h3')).find(function(node) {
          return clean(node.textContent).toLowerCase() === name.toLowerCase();
        });
        return heading && (heading.closest('section') || heading.parentElement);
      }
      var root = sectionRoot('Menu') || document;
      var external = Array.from(root.querySelectorAll('a[href]')).find(function(link) {
        return /view menu|restaurant.{0,12}website|full menu/i.test(clean(link.textContent));
      });
      var itemRoots = Array.from(root.querySelectorAll(
        '[data-test*="menu-item"], [data-testid*="menu-item"], article, li'
      )).filter(function(item) {
        var text = clean(item.innerText || item.textContent);
        return text.length > 2 && text.length < 1200 && Boolean(item.querySelector('h3, h4, strong, img[alt]'));
      });
      var candidates = itemRoots.map(function(item) {
        var title = item.querySelector('[data-test*="item-name"], h3, h4, strong, img[alt]');
        var name = title && title.tagName === 'IMG' ? title.getAttribute('alt') : title && title.textContent;
        var text = clean(item.innerText || item.textContent);
        var price = text.match(/(?:^|\\s)(\\$\\s*\\d+(?:\\.\\d{1,2})?)(?=\\s|$)/);
        var reviews = text.match(/([0-9][0-9,.]*\\s*[KMB]?)\\s+reviews?\\b/i);
        var section = item.closest('section');
        var sectionHeading = section && section.querySelector('h2, h3');
        var paragraphs = Array.from(item.querySelectorAll('p')).map(function(p) {
          return clean(p.textContent);
        }).filter(function(value) { return value && value !== clean(name); });
        var image = item.querySelector('img[src]');
        return {
          name: clean(name),
          section: clean(sectionHeading && sectionHeading.textContent),
          description: paragraphs.sort(function(a, b) { return b.length - a.length; })[0] || '',
          price: price ? clean(price[1]) : '',
          review_count: reviews ? reviews[1] : '',
          photo_url: image && image.src || '',
        };
      }).filter(function(value) { return value.name && !/^menu$/i.test(value.name); });
      var seen = {};
      candidates = candidates.filter(function(value) {
        var key = value.name.toLowerCase() + '|' + value.section.toLowerCase();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
      var bodyText = clean(document.body && document.body.innerText || '');
      return {
        restaurant: clean(document.querySelector('h1') && document.querySelector('h1').textContent),
        menu_url: external && external.href || '',
        candidates: candidates,
        no_results: !/\\bmenu\\b/i.test(bodyText),
        challenge: /access denied|captcha|are you a human|unusual activity|akamai|temporarily blocked/i.test(bodyText)
          || /access denied|captcha/i.test(document.title || ''),
        title: document.title || '',
        url: location.href || '',
        body_text: bodyText.slice(0, 2500),
      };
    })()
  `);
}

export async function openOpenTablePhotos(page) {
  const clicked = await page.evaluate(`
    (function() {
      function clean(value) { return typeof value === 'string' ? value.replace(/\\s+/g, ' ').trim() : ''; }
      var button = Array.from(document.querySelectorAll('a, button')).find(function(node) {
        return /^(?:see|view)(?: all)? [0-9,]*\\s*photos?|^photos$/i.test(clean(node.textContent || node.getAttribute('aria-label')));
      });
      if (!button) return false;
      button.click();
      return true;
    })()
  `);
  if (clicked) await page.wait(1);
  if (typeof page.autoScroll === "function") await page.autoScroll({ times: 3, delayMs: 400 });
  return clicked;
}

export async function extractOpenTablePhotos(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/[\\u00a0\\u202f]/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }
      function bestSource(image) {
        var srcset = clean(image.getAttribute('srcset'));
        if (srcset) {
          var options = srcset.split(',').map(function(entry) {
            var parts = clean(entry).split(/\\s+/);
            return {url: parts[0], width: Number((parts[1] || '').replace(/w$/, '')) || 0};
          }).sort(function(a, b) { return b.width - a.width; });
          if (options[0] && options[0].url) return options[0].url;
        }
        return image.currentSrc || image.src || '';
      }
      var roots = document.querySelectorAll('[role="dialog"], [data-test*="photo"], [data-testid*="photo"]');
      var scope = roots.length ? Array.from(roots) : [document];
      var images = [];
      scope.forEach(function(root) {
        images.push.apply(images, Array.from(root.querySelectorAll('img[src], img[srcset]')));
      });
      var candidates = images.map(function(image) {
        var src = bestSource(image);
        var card = image.closest('figure, article, li, [data-test*="photo"], [data-testid*="photo"]');
        var text = clean(card && card.innerText || '');
        var category = text.match(/\\b(Food|Interior|Exterior|Ambience|Menu)\\b/i);
        var author = text.match(/(?:Photo by|Uploaded by)\\s+([^•|]+)/i);
        var caption = clean(image.getAttribute('alt')) || clean(card && card.querySelector('figcaption') && card.querySelector('figcaption').textContent);
        return {
          category: category ? category[1].toLowerCase() : '',
          caption: caption,
          author: author ? clean(author[1]) : '',
          image_url: src,
          thumbnail_url: image.src || src,
        };
      }).filter(function(value) {
        return /^https?:/i.test(value.image_url)
          && !/logo|avatar|icon|pixel|tracking/i.test(value.image_url + ' ' + value.caption);
      });
      var seen = {};
      candidates = candidates.filter(function(value) {
        var key = value.image_url.replace(/\\?.*$/, '');
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
      var bodyText = clean(document.body && document.body.innerText || '');
      return {
        restaurant: clean(document.querySelector('h1') && document.querySelector('h1').textContent),
        candidates: candidates,
        no_results: /no photos/i.test(bodyText),
        challenge: /access denied|captcha|are you a human|unusual activity|akamai|temporarily blocked/i.test(bodyText)
          || /access denied|captcha/i.test(document.title || ''),
        title: document.title || '',
        url: location.href || '',
        body_text: bodyText.slice(0, 2500),
      };
    })()
  `);
}

export async function extractOpenTableExperiences(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/[\\u00a0\\u202f]/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }
      var heading = Array.from(document.querySelectorAll('h2, h3')).find(function(node) {
        return /^experiences$/i.test(clean(node.textContent));
      });
      var root = heading && (heading.closest('section') || heading.parentElement);
      var cards = root ? Array.from(root.querySelectorAll('article, li, [data-test*="experience"]')) : [];
      if (root && cards.length === 0) cards = Array.from(root.children);
      var candidates = cards.map(function(card) {
        var title = card.querySelector('h3, h4, strong');
        var text = clean(card.innerText || card.textContent);
        var price = text.match(/\\$\\s*\\d+(?:\\.\\d{1,2})?(?:\\s+per person)?/i);
        var party = text.match(/(?:1|[2-9]|1\\d|20)\\s*(?:-|to)\\s*(?:[2-9]|1\\d|20)\\s+people/i)
          || text.match(/(?:up to\\s+)?(?:[1-9]|1\\d|20)\\s+people/i);
        var dates = text.match(/multiple dates available|[A-Z][a-z]{2,8}\\s+\\d{1,2}(?:,\\s+\\d{4})?/i);
        var link = Array.from(card.querySelectorAll('a[href]')).find(function(a) {
          return /reserve|book/i.test(clean(a.textContent || a.getAttribute('aria-label')));
        });
        var paragraphs = Array.from(card.querySelectorAll('p')).map(function(p) {
          return clean(p.textContent);
        }).filter(Boolean);
        return {
          name: clean(title && title.textContent),
          price: price ? clean(price[0]) : '',
          party_size: party ? clean(party[0]) : '',
          dates: dates ? clean(dates[0]) : '',
          description: paragraphs.sort(function(a, b) { return b.length - a.length; })[0] || '',
          booking_url: link && link.href || '',
        };
      }).filter(function(value) { return value.name && !/^experiences$/i.test(value.name); });
      var seen = {};
      candidates = candidates.filter(function(value) {
        var key = value.name.toLowerCase();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
      var bodyText = clean(document.body && document.body.innerText || '');
      return {
        restaurant: clean(document.querySelector('h1') && document.querySelector('h1').textContent),
        candidates: candidates,
        no_results: !heading,
        challenge: /access denied|captcha|are you a human|unusual activity|akamai|temporarily blocked/i.test(bodyText)
          || /access denied|captcha/i.test(document.title || ''),
        title: document.title || '',
        url: location.href || '',
        body_text: bodyText.slice(0, 2500),
      };
    })()
  `);
}
