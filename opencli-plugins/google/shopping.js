import { CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  buildShoppingUrl,
  dedupeShoppingRows,
  filterAndSortShoppingRows,
  integerInRange,
  normalizeRegion,
  normalizeShoppingCandidate,
  optionalNonNegativeNumber,
} from "./shopping-helpers.mjs";

const SORT_CHOICES = ["relevance", "price-low", "price-high", "rating", "reviews", "discount"];

function validationError(error) {
  throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
}

async function extractShoppingCandidates(page) {
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

      function firstText(root, selectors) {
        for (var i = 0; i < selectors.length; i++) {
          var node = root.querySelector(selectors[i]);
          var text = clean(node && (node.getAttribute('aria-label') || node.textContent));
          if (text) return text;
        }
        return '';
      }

      function firstHref(root, selectors) {
        for (var i = 0; i < selectors.length; i++) {
          var node = root.querySelector(selectors[i]);
          if (node && node.href) return node.href;
        }
        return '';
      }

      function firstMatchingLine(cardLines, pattern) {
        for (var i = 0; i < cardLines.length; i++) {
          if (pattern.test(cardLines[i])) return cardLines[i];
        }
        return '';
      }

      function priceFromLabel(label, prefix) {
        var normalized = clean(label);
        if (!normalized) return '';
        // Strip only the accessibility-label prefix. Localized prices can use
        // dots as grouping separators (for example 1.299,95 €), so parsing or
        // truncating at punctuation here corrupts the value. Node-side
        // parsePriceText owns numeric interpretation.
        return clean(normalized.replace(new RegExp('^' + prefix + '\\s*', 'i'), ''));
      }

      function merchantAfterPrice(cardLines, priceText, originalPriceText) {
        var priceIndex = cardLines.indexOf(clean(priceText));
        if (priceIndex === -1) return '';
        for (var i = priceIndex + 1; i < cardLines.length; i++) {
          var value = cardLines[i];
          if (value === clean(originalPriceText)) continue;
          if (/^(?:pre-owned|preowned|used|refurbished|new)$/i.test(value)) continue;
          if (/^\\(?[€£$¥₹₩₱฿]|^[A-Z]{3}\\s*[0-9]/.test(value)) continue;
          if (/^&\\s*more$/i.test(value)) continue;
          return value;
        }
        return '';
      }

      function unique(values) {
        var seen = {};
        return values.map(clean).filter(function(value) {
          if (!value || seen[value]) return false;
          seen[value] = true;
          return true;
        });
      }

      function extractSponsored(root) {
        var cardLines = lines(root);
        var merchantLabel = firstText(root, ['[aria-label^="From "]']);
        var ratingLabel = firstText(root, ['[aria-label^="Rated "]']);
        var title = firstText(root, ['[role="heading"]']);
        var priceText = firstText(root, ['.VbBaOe', '[aria-label^="Current Price:"]']);
        var originalPriceText = firstText(root, ['.tWaJ3e', '[aria-label^=" Was "]']);
        var delivery = firstText(root, ['.PPi4nd', '.ybnj7e']);
        var details = firstText(root, ['.OCkIVb.nJCZm', '.nJCZm']);
        var merchant = merchantLabel.replace(/^From\\s+/i, '');
        var discount = firstMatchingLine(cardLines, /(?:\\d+(?:[.,]\\d+)?%\\s*off|^sale$)/i);
        var location = firstMatchingLine(cardLines, /^(?:nearby|also nearby|[A-Za-z ]+ District)$/i);

        return {
          title: title,
          price_text: priceFromLabel(priceText, 'Current Price:'),
          original_price_text: priceFromLabel(originalPriceText, '(?:Was|Original Price):'),
          merchant: merchant || merchantAfterPrice(cardLines, priceText, originalPriceText),
          rating_text: ratingLabel,
          delivery: delivery,
          returns: firstMatchingLine(cardLines, /returns?/i),
          location: location,
          condition: firstMatchingLine(cardLines, /^(?:pre-owned|preowned|used|refurbished|new)$/i),
          details: details,
          discount_text: discount,
          badges: unique(cardLines.filter(function(line) {
            return /(?:%\\s*off|^sale$|^low price$|^special offer$|^free \\d+-day$)/i.test(line);
          })),
          is_sponsored: true,
          merchant_id: root.getAttribute('data-merchant-id') || '',
          offer_id: root.getAttribute('data-offer-id') || '',
          product_id: '',
          url: firstHref(root, [
            'a.pla-unit-single-clickable-target[href]',
            'a[data-merchant-id][data-offer-id][href]',
            'a[href]',
          ]),
          text: cardLines.join(' '),
        };
      }

      function extractProduct(root) {
        var cardLines = lines(root);
        var productButton = root.querySelector('[role="button"][aria-label*="product viewer"]');
        var title = firstText(root, [
          'g-inner-card [role="img"][title]',
          '[role="img"][title]',
          '.gkQHve',
          'h3',
        ]);
        if (!title && productButton) {
          title = clean((productButton.getAttribute('aria-label') || '').split('.  ')[0]);
        }

        var currentPriceLabel = firstText(root, ['[aria-label^="Current Price:"]']);
        var originalPriceLabel = firstText(root, ['[aria-label^=" Was "]']);
        var priceText = priceFromLabel(currentPriceLabel, 'Current Price:')
          || firstText(root, ['.lmQWe', '.a8Pemb']);
        var originalPriceText = priceFromLabel(originalPriceLabel, '(?:Was|Original Price):?')
          || firstText(root, ['.DoCHT', '.Lshnu']);
        var ratingText = firstText(root, ['[aria-label^="Rated "]', '.QIrs8']);
        var merchant = firstText(root, ['.WJMUdc', '.aULzUe']);

        return {
          title: title,
          price_text: priceText,
          original_price_text: originalPriceText,
          merchant: merchant || merchantAfterPrice(cardLines, priceText, originalPriceText),
          rating_text: ratingText,
          delivery: firstText(root, ['.ybnj7e', '.Rsc7Yb'])
            || firstMatchingLine(cardLines, /^(?:free (?:delivery|shipping)|delivery|shipping|get it|arrives)/i),
          returns: firstText(root, ['.l9Ycjb']) || firstMatchingLine(cardLines, /returns?/i),
          location: firstText(root, ['.HFWEFb'])
            || firstMatchingLine(cardLines, /^(?:nearby|also nearby)/i),
          condition: firstMatchingLine(cardLines, /^(?:pre-owned|preowned|used|refurbished|new)$/i),
          details: firstText(root, ['.QIrs8']),
          discount_text: firstText(root, ['[aria-label*="OFF"]'])
            || firstMatchingLine(cardLines, /(?:\\d+(?:[.,]\\d+)?%\\s*off|^sale$)/i),
          badges: unique(cardLines.filter(function(line) {
            return /(?:%\\s*off|^sale$|^low price$|^special offer$|^3D$|^180$|^360$)/i.test(line);
          })),
          is_sponsored: false,
          merchant_id: root.getAttribute('data-merchant-id') || '',
          offer_id: root.getAttribute('data-offer-id') || '',
          product_id: root.getAttribute('data-pid') || root.getAttribute('data-docid') || '',
          url: firstHref(root, ['a.shntl[href]', 'a[href]']),
          text: cardLines.join(' '),
        };
      }

      var candidates = [];
      var seenRoots = [];
      var roots = Array.from(document.querySelectorAll([
        '[data-merchant-id][data-offer-id][data-pla-slot-pos]',
        '[data-pid][data-oid][data-gid]',
        '.sh-dgr__grid-result',
        '.sh-dlr__list-result',
      ].join(',')));

      roots.forEach(function(root) {
        if (seenRoots.indexOf(root) !== -1) return;
        seenRoots.push(root);
        var isSponsored = root.hasAttribute('data-pla-slot-pos');
        candidates.push(isSponsored ? extractSponsored(root) : extractProduct(root));
      });

      var bodyText = clean(document.body && document.body.innerText || '');
      return {
        candidates: candidates,
        body_text: bodyText.slice(0, 3000),
        challenge: /unusual traffic|not a robot|recaptcha|captcha/i.test(bodyText)
          || /sorry|before you continue/i.test(document.title || ''),
        language: (document.documentElement.getAttribute('lang') || '').toLowerCase(),
        title: document.title || '',
        url: window.location.href || '',
      };
    })()
  `);
}

cli({
  site: "google",
  name: "shopping",
  access: "read",
  description:
    "Search and compare Google Shopping products with price, merchant, and quality filters",
  domain: "google.com",
  strategy: Strategy.PUBLIC,
  browser: true,
  args: [
    {
      name: "query",
      type: "string",
      positional: true,
      required: true,
      help: 'Product query, for example "noise cancelling headphones"',
    },
    {
      name: "min-price",
      type: "float",
      help: "Minimum displayed price (client-side filter)",
    },
    {
      name: "max-price",
      type: "float",
      help: "Maximum displayed price (client-side filter)",
    },
    {
      name: "merchant",
      type: "string",
      help: "Comma-separated merchant allowlist (case-insensitive substring match)",
    },
    {
      name: "exclude-merchant",
      type: "string",
      help: "Comma-separated merchants to exclude (case-insensitive substring match)",
    },
    {
      name: "min-rating",
      type: "float",
      help: "Minimum product rating from 0 to 5; unrated products are excluded",
    },
    {
      name: "condition",
      type: "string",
      default: "any",
      choices: ["any", "new", "used", "refurbished"],
      help: "Product condition filter",
    },
    {
      name: "on-sale",
      type: "boolean",
      default: false,
      help: "Return only products with a displayed or calculated discount",
    },
    {
      name: "free-shipping",
      type: "boolean",
      default: false,
      help: "Return only products whose displayed delivery text starts with Free",
    },
    {
      name: "sponsored",
      type: "string",
      default: "include",
      choices: ["include", "exclude", "only"],
      help: "Include all results, exclude sponsored offers, or return sponsored offers only",
    },
    {
      name: "sort",
      type: "string",
      default: "relevance",
      choices: SORT_CHOICES,
      help: "Sort by page relevance, price, rating, review count, or discount",
    },
    {
      name: "limit",
      type: "int",
      default: 10,
      help: "Maximum number of products to return (1-50)",
    },
    {
      name: "region",
      type: "string",
      default: "US",
      help: "Two-letter Google Shopping country code used for region and currency inference",
    },
  ],
  columns: [
    "rank",
    "result_type",
    "title",
    "price",
    "currency",
    "original_price",
    "discount_percent",
    "merchant",
    "rating",
    "review_count",
    "condition",
    "delivery",
    "url",
  ],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError("Browser session required for google shopping");

    let query;
    let limit;
    let minPrice;
    let maxPrice;
    let minRating;
    let region;
    try {
      query = String(kwargs.query || "").trim();
      if (!query) throw new Error("query must not be empty");
      limit = integerInRange(kwargs.limit, "limit", 1, 50);
      minPrice = optionalNonNegativeNumber(kwargs["min-price"], "min-price");
      maxPrice = optionalNonNegativeNumber(kwargs["max-price"], "max-price");
      minRating = optionalNonNegativeNumber(kwargs["min-rating"], "min-rating", 5);
      if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
        throw new Error("min-price must be less than or equal to max-price");
      }
      region = normalizeRegion(kwargs.region);
    } catch (error) {
      validationError(error);
    }

    const sourceUrl = buildShoppingUrl({ query, region });
    await page.goto(sourceUrl);
    try {
      await page.wait({
        selector:
          "[data-pid][data-oid][data-gid], [data-merchant-id][data-offer-id][data-pla-slot-pos], .sh-dgr__grid-result",
        timeout: 12,
      });
    } catch {
      await page.wait(2);
    }

    let payload = await extractShoppingCandidates(page);
    if ((payload?.candidates || []).length < Math.min(limit, 20)) {
      for (let attempt = 0; attempt < 3; attempt++) {
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
        await page.wait(1);
      }
      payload = await extractShoppingCandidates(page);
    }

    if (payload?.challenge) {
      throw new CommandExecutionError(
        "Google Shopping served a CAPTCHA or unusual-traffic page; clear it in the browser and retry",
      );
    }

    if (!String(payload?.language || "").startsWith("en")) {
      throw new CommandExecutionError(
        `Google Shopping did not honor the required English extraction locale (rendered ${payload?.language || "an unknown locale"})`,
      );
    }

    const rawCandidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
    const normalizedRows = dedupeShoppingRows(
      rawCandidates
        .map((candidate, index) =>
          normalizeShoppingCandidate(candidate, index, {
            sourceUrl: payload?.url || sourceUrl,
            region,
          }),
        )
        .filter((row) => row.title),
    );

    if (normalizedRows.length === 0) {
      throw new CommandExecutionError(
        `Google Shopping returned no readable product cards for "${query}"; try another query or inspect the browser for a consent page`,
      );
    }

    const results = filterAndSortShoppingRows(normalizedRows, {
      minPrice,
      maxPrice,
      merchant: kwargs.merchant,
      excludeMerchant: kwargs["exclude-merchant"],
      minRating,
      condition: kwargs.condition,
      onSale: kwargs["on-sale"] === true,
      freeShipping: kwargs["free-shipping"] === true,
      sponsored: kwargs.sponsored,
      sort: kwargs.sort,
      limit,
    });

    if (results.length === 0) {
      throw new CommandExecutionError(
        `Google Shopping exposed ${normalizedRows.length} product cards, but none matched the requested filters`,
      );
    }

    return results;
  },
});
