import { CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  buildSearchUrl,
  dedupeSearchRows,
  integerInRange,
  normalizeCategory,
  normalizeSearchCandidate,
  normalizeSite,
  SEARCH_SORTS,
  sortAndLimitSearchRows,
} from "./craigslist-helpers.mjs";

function validationError(error) {
  throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
}

async function waitForSearchPage(page) {
  try {
    await page.wait({
      selector: ".cl-search-result, .result-row, .noresults",
      timeout: 15,
    });
  } catch {
    await page.wait(2);
  }
}

async function extractSearchCandidates(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }
      function first(root, selectors) {
        for (var i = 0; i < selectors.length; i++) {
          var node = root.querySelector(selectors[i]);
          if (node) return node;
        }
        return null;
      }
      function text(root, selectors) {
        var node = first(root, selectors);
        return clean(node && (node.textContent || node.getAttribute('aria-label')));
      }
      function extract(root) {
        var link = first(root, [
          'a.posting-title[href]',
          'a.result-title[href]',
          'a[href*="/view/d/"]',
          'a[href$=".html"]',
        ]);
        var postedNode = first(root, [
          'time.result-date',
          'time[datetime]',
          '.result-posted-date',
          '.meta span[title]',
        ]);
        var meta = root.querySelector('.meta');
        var metaClone = meta && meta.cloneNode(true);
        if (metaClone) {
          Array.from(metaClone.querySelectorAll('button, .separator, .result-posted-date, [title]'))
            .forEach(function(node) { node.remove(); });
        }
        var imageNodes = Array.from(root.querySelectorAll('img[src], img[data-src]'));
        var imageUrls = imageNodes.map(function(image) {
          return image.currentSrc || image.src || image.getAttribute('data-src') || '';
        }).filter(function(url) {
          return url && !/(?:\\/empty\\.png|\\/no_image\\.)/i.test(url);
        });
        var dots = root.querySelectorAll('.dots .dot, .gallery .dot').length;
        return {
          post_id: clean(root.getAttribute('data-pid') || root.dataset && root.dataset.pid),
          title: text(root, ['.posting-title .label', '.result-title', 'a.posting-title', 'a[href*="/view/d/"]']),
          price_text: text(root, ['.priceinfo', '.result-price', '.price']),
          location: text(root, ['.result-location', '.result-hood', '.posting-location']),
          posted: clean(postedNode && postedNode.textContent),
          posted_at: clean(postedNode && (
            postedNode.getAttribute('datetime') || postedNode.getAttribute('title')
          )),
          snippet: clean(metaClone && metaClone.textContent),
          image_urls: imageUrls,
          image_count: Math.max(imageUrls.length, dots),
          url: link && link.href || '',
        };
      }

      var roots = Array.from(document.querySelectorAll('.cl-search-result[data-pid], .result-row[data-pid]'));
      var bodyText = clean(document.body && document.body.innerText || '');
      return {
        candidates: roots.map(extract),
        body_text: bodyText.slice(0, 4000),
        title: document.title || '',
        url: window.location.href || '',
        no_results: /no results|nothing found|zero local results/i.test(bodyText)
          || !!document.querySelector('.noresults'),
        blocked: /automatically blocked|access denied|captcha|unusual traffic|forbidden/i.test(bodyText)
          || /blocked|forbidden/i.test(document.title || ''),
      };
    })()
  `);
}

cli({
  site: "craigslist",
  name: "search",
  aliases: ["browse"],
  access: "read",
  description:
    "Search public Craigslist listings across for-sale, housing, jobs, gigs, services, community, and events",
  example:
    'opencli craigslist search "road bike" --site sfbay --category bicycles --max-price 800 --has-image -f json',
  domain: "craigslist.org",
  strategy: Strategy.PUBLIC,
  browser: true,
  args: [
    {
      name: "query",
      type: "string",
      positional: true,
      default: "",
      help: "Optional keywords; omit to browse the selected category",
    },
    {
      name: "site",
      type: "string",
      required: true,
      help: "Craigslist site code or hostname, for example sfbay, newyork, or london",
    },
    {
      name: "category",
      type: "string",
      default: "for-sale",
      help: "Three-character category code or common alias; use `craigslist categories` to discover codes",
    },
    {
      name: "sort",
      type: "string",
      default: "newest",
      choices: SEARCH_SORTS,
      help: "Sort by newest, relevance, ascending price, or descending price",
    },
    { name: "limit", type: "int", default: 20, help: "Maximum results to return (1-100)" },
    { name: "offset", type: "int", default: 0, help: "Result offset for paging" },
    { name: "min-price", type: "float", help: "Minimum listing price" },
    { name: "max-price", type: "float", help: "Maximum listing price" },
    { name: "has-image", type: "boolean", default: false, help: "Only listings with images" },
    { name: "posted-today", type: "boolean", default: false, help: "Only listings posted today" },
    { name: "titles-only", type: "boolean", default: false, help: "Search listing titles only" },
    {
      name: "hide-duplicates",
      type: "boolean",
      default: false,
      help: "Hide bundled duplicate posts",
    },
    {
      name: "include-nearby",
      type: "boolean",
      default: false,
      help: "Include nearby Craigslist sites",
    },
    {
      name: "seller",
      type: "string",
      default: "any",
      choices: ["any", "owner", "dealer"],
      help: "Filter for owner or dealer listings",
    },
    { name: "postal", type: "string", help: "Postal/ZIP code used as the radius center" },
    { name: "radius", type: "float", help: "Search radius in miles; requires --postal" },
    {
      name: "condition",
      type: "string",
      help: "Comma-separated item conditions, for example new,like-new,good",
    },
    {
      name: "delivery-available",
      type: "boolean",
      default: false,
      help: "Only for-sale listings offering delivery",
    },
    { name: "min-bedrooms", type: "int", help: "Minimum bedrooms for housing searches" },
    { name: "max-bedrooms", type: "int", help: "Maximum bedrooms for housing searches" },
    { name: "min-bathrooms", type: "float", help: "Minimum bathrooms for housing searches" },
    { name: "max-bathrooms", type: "float", help: "Maximum bathrooms for housing searches" },
    { name: "min-sqft", type: "int", help: "Minimum square footage for housing searches" },
    { name: "max-sqft", type: "int", help: "Maximum square footage for housing searches" },
    { name: "cats-ok", type: "boolean", default: false, help: "Only housing that allows cats" },
    { name: "dogs-ok", type: "boolean", default: false, help: "Only housing that allows dogs" },
    { name: "furnished", type: "boolean", default: false, help: "Only furnished housing" },
    { name: "no-smoking", type: "boolean", default: false, help: "Only no-smoking housing" },
    {
      name: "wheelchair",
      type: "boolean",
      default: false,
      help: "Only wheelchair-accessible housing",
    },
    { name: "ev-charging", type: "boolean", default: false, help: "Only housing with EV charging" },
    {
      name: "air-conditioning",
      type: "boolean",
      default: false,
      help: "Only housing with air conditioning",
    },
    { name: "remote", type: "boolean", default: false, help: "Only jobs marked telecommuting" },
    { name: "internship", type: "boolean", default: false, help: "Only jobs marked internship" },
    { name: "nonprofit", type: "boolean", default: false, help: "Only jobs marked nonprofit" },
    { name: "min-year", type: "int", help: "Minimum model year for vehicle searches" },
    { name: "max-year", type: "int", help: "Maximum model year for vehicle searches" },
    { name: "min-odometer", type: "int", help: "Minimum odometer miles for vehicle searches" },
    { name: "max-odometer", type: "int", help: "Maximum odometer miles for vehicle searches" },
    { name: "make-model", type: "string", help: "Vehicle make/model text" },
    {
      name: "params",
      type: "string",
      help: 'Extra category-specific query parameters, for example "bicycle_type=8&bicycle_frame_material=3"',
    },
  ],
  columns: ["rank", "post_id", "title", "price", "location", "posted", "image_count", "url"],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError("Browser session required for Craigslist search");

    let site;
    let category;
    let limit;
    let sourceUrl;
    try {
      site = normalizeSite(kwargs.site);
      category = normalizeCategory(kwargs.category);
      limit = integerInRange(kwargs.limit, "limit", 1, 100);
      sourceUrl = buildSearchUrl({
        site,
        category,
        query: kwargs.query,
        sort: kwargs.sort,
        offset: kwargs.offset,
        minPrice: kwargs["min-price"],
        maxPrice: kwargs["max-price"],
        hasImage: kwargs["has-image"] === true,
        postedToday: kwargs["posted-today"] === true,
        titlesOnly: kwargs["titles-only"] === true,
        hideDuplicates: kwargs["hide-duplicates"] === true,
        includeNearby: kwargs["include-nearby"] === true,
        seller: kwargs.seller,
        postal: kwargs.postal,
        radius: kwargs.radius,
        condition: kwargs.condition,
        deliveryAvailable: kwargs["delivery-available"] === true,
        minBedrooms: kwargs["min-bedrooms"],
        maxBedrooms: kwargs["max-bedrooms"],
        minBathrooms: kwargs["min-bathrooms"],
        maxBathrooms: kwargs["max-bathrooms"],
        minSqft: kwargs["min-sqft"],
        maxSqft: kwargs["max-sqft"],
        catsOk: kwargs["cats-ok"] === true,
        dogsOk: kwargs["dogs-ok"] === true,
        furnished: kwargs.furnished === true,
        noSmoking: kwargs["no-smoking"] === true,
        wheelchair: kwargs.wheelchair === true,
        evCharging: kwargs["ev-charging"] === true,
        airConditioning: kwargs["air-conditioning"] === true,
        remote: kwargs.remote === true,
        internship: kwargs.internship === true,
        nonprofit: kwargs.nonprofit === true,
        minYear: kwargs["min-year"],
        maxYear: kwargs["max-year"],
        minOdometer: kwargs["min-odometer"],
        maxOdometer: kwargs["max-odometer"],
        makeModel: kwargs["make-model"],
        params: kwargs.params,
      });
    } catch (error) {
      validationError(error);
    }

    await page.goto(sourceUrl);
    await waitForSearchPage(page);
    const payload = await extractSearchCandidates(page);
    if (payload?.blocked) {
      throw new CommandExecutionError(
        "Craigslist blocked the public search page",
        "Inspect the connected browser, wait before retrying, or narrow the request rate",
      );
    }

    let rows = dedupeSearchRows(
      (Array.isArray(payload?.candidates) ? payload.candidates : [])
        .map((candidate, index) =>
          normalizeSearchCandidate(candidate, index, {
            site,
            category,
            sourceUrl: payload?.url || sourceUrl,
          }),
        )
        .filter((row) => row.title && row.url),
    );
    if (rows.length === 0) {
      const query = String(kwargs.query || "").trim();
      const context = query ? ` for "${query}"` : "";
      if (payload?.no_results) return [];
      throw new CommandExecutionError(
        `Craigslist exposed no readable ${category} listings${context}`,
        "Try another site/category or inspect the browser for a changed page layout",
      );
    }
    rows = sortAndLimitSearchRows(rows, { sort: kwargs.sort, limit });
    return rows;
  },
});
