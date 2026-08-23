import { CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  cleanText,
  filterCategories,
  integerInRange,
  normalizeSite,
} from "./craigslist-helpers.mjs";

async function extractCategories(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }
      var group = '';
      var categories = [];
      Array.from(document.querySelectorAll('a[href]')).forEach(function(anchor) {
        var href = anchor.href || '';
        var url;
        try { url = new URL(href, window.location.href); } catch (_) { return; }
        var code = url.searchParams.get('cat') || '';
        if (!code) {
          var match = url.pathname.match(
            /^\\/search\\/(?:area\\/[^\\/]+\\/)?([a-z0-9]{3})(?:\\/|$)/i
          );
          code = match ? match[1] : '';
        }
        if (!/^[a-z0-9]{3}$/i.test(code)) return;
        var nameNode = anchor.querySelector('.label');
        var name = clean(nameNode && nameNode.textContent || anchor.textContent);
        if (!name) return;
        var isGroup = anchor.classList.contains('heading') || /^(ccc|bbb|hhh|aut|sss|sse|jjj|ggg|rrr)$/.test(code);
        if (isGroup) group = name;
        categories.push({
          code: code.toLowerCase(),
          name: name,
          group: isGroup ? name : group,
          is_group: isGroup,
          url: url.toString(),
        });
      });
      var bodyText = clean(document.body && document.body.innerText || '');
      return {
        categories: categories,
        blocked: /automatically blocked|access denied|captcha|forbidden/i.test(bodyText),
      };
    })()
  `);
}

cli({
  site: "craigslist",
  name: "categories",
  aliases: ["cats"],
  access: "read",
  description:
    "List the public category names and three-character codes available on a Craigslist site",
  example: "opencli craigslist categories --site sfbay --group housing -f json",
  domain: "craigslist.org",
  strategy: Strategy.PUBLIC,
  browser: true,
  args: [
    {
      name: "query",
      type: "string",
      positional: true,
      default: "",
      help: "Optional category name or code search",
    },
    { name: "site", type: "string", required: true, help: "Craigslist site code or hostname" },
    {
      name: "group",
      type: "string",
      help: "Exact top-level group name, for example housing, jobs, or for sale",
    },
    { name: "limit", type: "int", default: 200, help: "Maximum categories to return (1-250)" },
  ],
  columns: ["code", "name", "group", "is_group", "url"],
  func: async (page, kwargs) => {
    if (!page)
      throw new CommandExecutionError("Browser session required for Craigslist categories");
    let site;
    let limit;
    try {
      site = normalizeSite(kwargs.site);
      limit = integerInRange(kwargs.limit, "limit", 1, 250);
    } catch (error) {
      throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
    }

    await page.goto(`https://${site}.craigslist.org/`);
    try {
      await page.wait({ selector: "a[href*='/search/'], a[href*='cat=']", timeout: 15 });
    } catch {
      await page.wait(2);
    }
    const payload = await extractCategories(page);
    if (payload?.blocked)
      throw new CommandExecutionError("Craigslist blocked the public site homepage");
    const rows = filterCategories(Array.isArray(payload?.categories) ? payload.categories : [], {
      query: kwargs.query,
      group: kwargs.group,
      limit,
    });
    if (rows.length === 0) {
      const description = [cleanText(kwargs.query), cleanText(kwargs.group)]
        .filter(Boolean)
        .join(" / ");
      throw new CommandExecutionError(
        `No Craigslist categories matched "${description}" on ${site}`,
      );
    }
    return rows;
  },
});
