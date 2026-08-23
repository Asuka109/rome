import { CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import { cleanText, filterLocations, integerInRange } from "./craigslist-helpers.mjs";

async function extractLocations(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }
      var section = '';
      var region = '';
      var locations = [];
      Array.from(document.querySelectorAll('h2, h4, a[href]')).forEach(function(node) {
        if (node.tagName === 'H2') {
          section = clean(node.textContent);
          region = '';
          return;
        }
        if (node.tagName === 'H4') {
          region = clean(node.textContent);
          return;
        }
        var href = node.href || '';
        var match = href.match(/^https:\\/\\/([a-z0-9-]+)\\.craigslist\\.org\\/?(?:[?#].*)?$/i);
        if (!match || match[1].toLowerCase() === 'www') return;
        locations.push({
          code: match[1].toLowerCase(),
          name: clean(node.textContent),
          region: region,
          section: section,
          url: href,
        });
      });
      var bodyText = clean(document.body && document.body.innerText || '');
      return {
        locations: locations,
        blocked: /automatically blocked|access denied|captcha|forbidden/i.test(bodyText),
      };
    })()
  `);
}

cli({
  site: "craigslist",
  name: "locations",
  aliases: ["sites"],
  access: "read",
  description: "Find Craigslist site codes and URLs worldwide by city, region, country, or code",
  example: 'opencli craigslist locations "san francisco" -f json',
  domain: "craigslist.org",
  strategy: Strategy.PUBLIC,
  browser: true,
  args: [
    {
      name: "query",
      type: "string",
      positional: true,
      default: "",
      help: "Optional city, site code, region, or section search",
    },
    {
      name: "section",
      type: "string",
      help: "Exact worldwide section, for example US, Canada, Europe, or Oceania",
    },
    { name: "limit", type: "int", default: 25, help: "Maximum locations to return (1-200)" },
  ],
  columns: ["code", "name", "region", "section", "url"],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError("Browser session required for Craigslist locations");
    let limit;
    try {
      limit = integerInRange(kwargs.limit, "limit", 1, 200);
    } catch (error) {
      throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
    }

    await page.goto("https://www.craigslist.org/about/sites");
    try {
      await page.wait({ selector: "h2, h4, a[href$='.craigslist.org/']", timeout: 15 });
    } catch {
      await page.wait(2);
    }
    const payload = await extractLocations(page);
    if (payload?.blocked)
      throw new CommandExecutionError("Craigslist blocked the public sites directory");
    const rows = filterLocations(Array.isArray(payload?.locations) ? payload.locations : [], {
      query: kwargs.query,
      section: kwargs.section,
      limit,
    });
    if (rows.length === 0) {
      const description = [cleanText(kwargs.query), cleanText(kwargs.section)]
        .filter(Boolean)
        .join(" / ");
      throw new CommandExecutionError(`No Craigslist locations matched "${description}"`);
    }
    return rows;
  },
});
