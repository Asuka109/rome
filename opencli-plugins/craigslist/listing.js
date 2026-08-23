import { CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  cleanMultilineText,
  cleanText,
  normalizeListingUrl,
  parsePriceText,
} from "./craigslist-helpers.mjs";

function validationError(error) {
  throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
}

async function waitForListingPage(page) {
  try {
    await page.wait({
      selector: "#postingbody, .postingtitle, .removed, .postingdeleted",
      timeout: 15,
    });
  } catch {
    await page.wait(2);
  }
}

async function extractListing(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }
      function multiline(value) {
        return typeof value === 'string'
          ? value.replace(/\\r\\n?/g, '\\n').split('\\n').map(function(line) {
              return line.replace(/\\u00a0/g, ' ').replace(/[ \\t]+/g, ' ').trim();
            }).filter(function(line, index, lines) {
              return line || (index > 0 && lines[index - 1]);
            }).join('\\n').trim()
          : '';
      }
      function text(selector) {
        var node = document.querySelector(selector);
        return clean(node && node.textContent);
      }
      function meta(name) {
        var node = document.querySelector('meta[name="' + name + '"], meta[property="' + name + '"]');
        return clean(node && node.content);
      }
      function timeFor(label) {
        var entries = Array.from(document.querySelectorAll('.postinginfo'));
        var entry = entries.find(function(node) {
          return clean(node.textContent).toLowerCase().indexOf(label + ':') === 0;
        });
        var time = entry && entry.querySelector('time');
        return {
          relative: clean(time && time.textContent),
          datetime: clean(time && time.getAttribute('datetime')),
        };
      }

      var attributes = {};
      Array.from(document.querySelectorAll('.attrgroup .attr')).forEach(function(root) {
        var label = clean(root.querySelector('.labl') && root.querySelector('.labl').textContent)
          .replace(/:\\s*$/, '');
        var value = clean(root.querySelector('.valu') && root.querySelector('.valu').textContent);
        if (label && value) attributes[label] = value;
      });
      var imageUrls = Array.from(document.querySelectorAll('#thumbs a[href], .gallery img[src]'))
        .map(function(node) { return node.href || node.currentSrc || node.src || ''; })
        .filter(function(value, index, all) { return value && all.indexOf(value) === index; });
      var map = document.querySelector('[data-latitude][data-longitude]');
      var breadcrumbs = Array.from(document.querySelectorAll('.breadcrumbs a, .crumb a'))
        .map(function(node) { return clean(node.textContent); })
        .filter(Boolean);
      var postingInfo = Array.from(document.querySelectorAll('.postinginfo'))
        .map(function(node) { return clean(node.textContent); });
      var postIdLine = postingInfo.find(function(value) { return /^post id:/i.test(value); }) || '';
      var posted = timeFor('posted');
      var updated = timeFor('updated');
      var bodyText = clean(document.body && document.body.innerText || '');

      return {
        title: text('#titletextonly') || text('.postingtitle'),
        price_text: text('.postingtitle .price, .price'),
        description: multiline(document.querySelector('#postingbody') && document.querySelector('#postingbody').innerText)
          .replace(/^QR Code Link to This Post\\s*/i, ''),
        attributes: attributes,
        image_urls: imageUrls,
        latitude: map && map.getAttribute('data-latitude') || '',
        longitude: map && map.getAttribute('data-longitude') || '',
        location_accuracy: map && map.getAttribute('data-accuracy') || '',
        location: meta('geo.placename'),
        region: meta('geo.region'),
        breadcrumbs: breadcrumbs,
        post_id: clean(postIdLine.replace(/^post id:\\s*/i, '')),
        posted: posted,
        updated: updated,
        reply_available: !!document.querySelector('.reply-button'),
        url: window.location.href || '',
        body_text: bodyText.slice(0, 4000),
        removed: /posting has been deleted|posting has expired|this posting is no longer available/i.test(bodyText)
          || !!document.querySelector('.removed, .postingdeleted'),
        blocked: /automatically blocked|access denied|captcha|unusual traffic|forbidden/i.test(bodyText)
          || /blocked|forbidden/i.test(document.title || ''),
      };
    })()
  `);
}

cli({
  site: "craigslist",
  name: "listing",
  aliases: ["detail", "show", "view"],
  access: "read",
  description:
    "Read a public Craigslist listing's full description, attributes, images, dates, and map data",
  example: 'opencli craigslist listing "https://www.craigslist.org/view/d/..." -f json',
  domain: "craigslist.org",
  strategy: Strategy.PUBLIC,
  browser: true,
  args: [
    {
      name: "url",
      type: "string",
      positional: true,
      required: true,
      help: "Full public listing URL returned by `craigslist search`",
    },
  ],
  columns: [
    "post_id",
    "title",
    "price",
    "location",
    "posted_at",
    "updated_at",
    "attributes",
    "description",
    "image_urls",
    "latitude",
    "longitude",
    "reply_available",
    "url",
  ],
  func: async (page, kwargs) => {
    if (!page)
      throw new CommandExecutionError("Browser session required for Craigslist listing details");
    let sourceUrl;
    try {
      sourceUrl = normalizeListingUrl(kwargs.url);
    } catch (error) {
      validationError(error);
    }

    await page.goto(sourceUrl);
    await waitForListingPage(page);
    const listing = await extractListing(page);
    if (listing?.blocked) {
      throw new CommandExecutionError(
        "Craigslist blocked the public listing page",
        "Inspect the connected browser or wait before retrying",
      );
    }
    if (listing?.removed) {
      throw new CommandExecutionError(
        "Craigslist says this listing is deleted, expired, or unavailable",
      );
    }
    if (!listing?.title || !listing?.description) {
      throw new CommandExecutionError(
        "Craigslist listing did not expose readable detail content",
        "The listing may have expired, or the page layout may have changed",
      );
    }

    const priceText = cleanText(listing.price_text);
    const breadcrumbText = Array.isArray(listing.breadcrumbs)
      ? listing.breadcrumbs.join(" > ")
      : "";
    const sellerMatch = breadcrumbText.match(/by (owner|dealer)/i);
    return [
      {
        post_id: cleanText(listing.post_id),
        title: cleanText(listing.title),
        price: parsePriceText(priceText),
        price_text: priceText,
        location: cleanText(listing.location),
        region: cleanText(listing.region),
        breadcrumbs: Array.isArray(listing.breadcrumbs) ? listing.breadcrumbs : [],
        seller_type: sellerMatch ? sellerMatch[1].toLowerCase() : "",
        posted: cleanText(listing.posted?.relative),
        posted_at: cleanText(listing.posted?.datetime),
        updated: cleanText(listing.updated?.relative),
        updated_at: cleanText(listing.updated?.datetime),
        attributes: listing.attributes || {},
        description: cleanMultilineText(listing.description),
        image_urls: Array.isArray(listing.image_urls) ? listing.image_urls : [],
        latitude: listing.latitude === "" ? null : Number(listing.latitude),
        longitude: listing.longitude === "" ? null : Number(listing.longitude),
        location_accuracy:
          listing.location_accuracy === "" ? null : Number(listing.location_accuracy),
        reply_available: listing.reply_available === true,
        url: cleanText(listing.url) || sourceUrl,
      },
    ];
  },
});
