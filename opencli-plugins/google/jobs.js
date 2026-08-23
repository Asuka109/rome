import { CommandExecutionError } from "@jackwener/opencli/errors";
import { cli, Strategy } from "@jackwener/opencli/registry";
import {
  buildJobsUrl,
  dedupeJobsRows,
  filterAndSortJobsRows,
  integerInRange,
  normalizeJobsCandidate,
  normalizeRegion,
} from "./jobs-helpers.mjs";

function validationError(error) {
  throw new CommandExecutionError(error instanceof Error ? error.message : String(error));
}

async function extractJobsCandidates(page) {
  return page.evaluate(`
    (function() {
      function clean(value) {
        return typeof value === 'string'
          ? value.replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      }

      function ariaText(root, prefix) {
        var node = Array.from(root.querySelectorAll('[aria-label]')).find(function(candidate) {
          return clean(candidate.getAttribute('aria-label')).toLowerCase().indexOf(prefix.toLowerCase()) === 0;
        });
        return clean(node && node.getAttribute('aria-label'));
      }

      function firstText(root, selectors) {
        for (var i = 0; i < selectors.length; i++) {
          var node = root.querySelector(selectors[i]);
          var value = clean(node && node.textContent);
          if (value) return value;
        }
        return '';
      }

      function headerParts(root) {
        var header = root.querySelector('.GoEOPd');
        var parts = header
          ? Array.from(header.children).map(function(node) { return clean(node.textContent); }).filter(Boolean)
          : [];
        return {
          title: firstText(root, ['.tNxQIb']) || parts[0] || '',
          company: firstText(root, ['.a3jPc']) || parts[1] || '',
          locationSource: firstText(root, ['.FqK3wc']) || parts[2] || '',
        };
      }

      function extractCandidate(root) {
        var header = headerParts(root);
        if (!header.title) {
          var saveLabel = ariaText(root, 'Add ');
          var match = saveLabel.match(/^Add (.+) to saves list$/i);
          if (match) header.title = clean(match[1]);
        }

        var locationSource = header.locationSource.match(/^(.*?)\\s*[•·]\\s*via\\s+(.+)$/i);
        var metadata = root.querySelector('.ApHyTb');
        var tags = metadata
          ? Array.from(metadata.children).filter(function(node) {
              return !node.querySelector([
                '[aria-label^="Posted "]',
                '[aria-label^="Salary "]',
                '[aria-label^="Employment Type "]',
                '[aria-label^="Qualification "]',
              ].join(','));
            }).map(function(node) { return clean(node.textContent); }).filter(Boolean)
          : [];
        var dataUrl = clean(root.getAttribute('data-fc-up'));
        var dataId = dataUrl.match(/(?:^|[\\/,])docid=([^,\\/]+)/i);

        return {
          title: header.title,
          company: header.company,
          location: locationSource ? clean(locationSource[1]) : header.locationSource,
          source: locationSource ? clean(locationSource[2]) : '',
          posted_text: ariaText(root, 'Posted '),
          salary_text: ariaText(root, 'Salary '),
          employment_type: ariaText(root, 'Employment Type '),
          qualifications: ariaText(root, 'Qualification '),
          tags: tags,
          job_id: clean(root.id) || (dataId ? clean(dataId[1]) : ''),
        };
      }

      var primary = Array.from(document.querySelectorAll(
        '[data-fc-up*="docid="][role="button"], [jsname="y1Aese"][role="button"]'
      ));
      var fallback = Array.from(document.querySelectorAll('[role="button"][tabindex="0"]')).filter(
        function(root) {
          return !!root.querySelector('[aria-label^="Posted "], [aria-label^="Employment Type "]')
            && !!root.querySelector('[aria-label$=" to saves list"]');
        }
      );
      var roots = primary.concat(fallback).filter(function(root, index, all) {
        return all.indexOf(root) === index;
      });
      var candidates = roots.map(extractCandidate).filter(function(candidate) {
        return candidate.title && candidate.company;
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

async function scrollJobsResults(page) {
  return page.evaluate(`
    (function() {
      var cards = Array.from(document.querySelectorAll(
        '[data-fc-up*="docid="][role="button"], [jsname="y1Aese"][role="button"]'
      ));
      var last = cards[cards.length - 1];
      if (last && last.scrollIntoView) last.scrollIntoView({block: 'end'});
      var scrollables = Array.from(document.querySelectorAll('div')).filter(function(node) {
        var style = getComputedStyle(node);
        return node.scrollHeight > node.clientHeight + 100 && /(auto|scroll)/.test(style.overflowY);
      }).sort(function(left, right) { return right.scrollHeight - left.scrollHeight; });
      scrollables.slice(0, 3).forEach(function(node) { node.scrollTop = node.scrollHeight; });
      window.scrollTo(0, document.body.scrollHeight);
      return cards.length;
    })()
  `);
}

async function extractJobDetails(page, jobId) {
  const encodedId = JSON.stringify(jobId);
  return page.evaluate(`
    (async function() {
      var jobId = ${encodedId};
      var clean = function(value) {
        return typeof value === 'string'
          ? value.replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim()
          : '';
      };
      var findById = function(selector, attribute) {
        return Array.from(document.querySelectorAll(selector)).find(function(node) {
          return clean(node.getAttribute(attribute)) === jobId;
        });
      };
      var cardIdentity = function(card) {
        var id = clean(card.id);
        if (id) return id;
        var dataUrl = clean(card.getAttribute('data-fc-up'));
        var dataId = dataUrl.match(/(?:^|[\\/,])docid=([^,\\/]+)/i);
        return dataId ? clean(dataId[1]) : '';
      };
      var findCard = function() {
        return Array.from(document.querySelectorAll('[role="button"][tabindex="0"]')).find(
          function(card) { return cardIdentity(card) === jobId; }
        );
      };
      var group = findById(
        '[data-encoded-docid][role="group"][aria-label^="Job details for "]',
        'data-encoded-docid'
      );
      if (!group) {
        var card = findCard();
        if (!card) return {loaded: false};
        card.click();
        for (var attempt = 0; attempt < 30 && !group; attempt++) {
          await new Promise(function(resolve) { setTimeout(resolve, 100); });
          group = findById(
            '[data-encoded-docid][role="group"][aria-label^="Job details for "]',
            'data-encoded-docid'
          );
        }
      } else {
        var matchingCard = findCard();
        if (matchingCard) matchingCard.click();
        await new Promise(function(resolve) { setTimeout(resolve, 150); });
      }
      if (!group) return {loaded: false};

      var applications = Array.from(group.querySelectorAll('a[href]')).map(function(anchor) {
        var label = clean(anchor.textContent || anchor.getAttribute('aria-label'));
        return {label: label, url: anchor.href || ''};
      }).filter(function(application, index, all) {
        return /^Apply\\b/i.test(application.label)
          && /^https?:\\/\\//i.test(application.url)
          && all.findIndex(function(other) { return other.url === application.url; }) === index;
      });
      var descriptionHeading = Array.from(group.querySelectorAll('h2, h3')).find(function(node) {
        return clean(node.textContent).toLowerCase() === 'job description';
      });
      var descriptionRoot = descriptionHeading && descriptionHeading.parentElement;
      var firstDescription = descriptionRoot && descriptionRoot.querySelector('[jsname="QAWWu"]');
      var remainingDescription = descriptionRoot && descriptionRoot.querySelector('[jsname="ij8cu"]');
      var textWithBreaks = function(node) {
        if (!node) return '';
        var clone = node.cloneNode(true);
        Array.from(clone.querySelectorAll('br')).forEach(function(br) {
          br.replaceWith(document.createTextNode(' '));
        });
        return clone.textContent || '';
      };
      var description = clean(
        textWithBreaks(firstDescription) + textWithBreaks(remainingDescription)
      );
      if (!description && descriptionRoot) {
        description = clean(descriptionRoot.textContent).replace(/^Job description\\s*/i, '');
      }

      return {
        loaded: true,
        google_url: window.location.href || '',
        apply_url: applications[0] ? applications[0].url : '',
        applications: applications,
        description: description,
      };
    })()
  `);
}

cli({
  site: "google",
  name: "jobs",
  access: "read",
  description:
    "Search Google Jobs with location, recency, employer, source, and work-style filters",
  domain: "google.com",
  strategy: Strategy.PUBLIC,
  browser: true,
  args: [
    {
      name: "query",
      type: "string",
      positional: true,
      required: true,
      help: 'Role, skill, or job query, for example "staff software engineer"',
    },
    {
      name: "location",
      type: "string",
      help: 'City, region, country, or area, for example "San Francisco, CA"',
    },
    {
      name: "remote",
      type: "string",
      default: "any",
      choices: ["any", "only", "exclude"],
      help: "Include all jobs, return remote jobs only, or exclude remote jobs",
    },
    {
      name: "job-type",
      type: "string",
      default: "any",
      choices: [
        "any",
        "full-time",
        "part-time",
        "contract",
        "temporary",
        "internship",
        "volunteer",
        "per-diem",
      ],
      help: "Employment type; matching Google results are also filtered client-side",
    },
    {
      name: "posted-within",
      type: "string",
      default: "any",
      choices: ["any", "day", "3-days", "week", "month"],
      help: "Maximum displayed listing age; jobs without a readable age are excluded",
    },
    {
      name: "company",
      type: "string",
      help: "Comma-separated company allowlist (case-insensitive substring match)",
    },
    {
      name: "exclude-company",
      type: "string",
      help: "Comma-separated companies to exclude (case-insensitive substring match)",
    },
    {
      name: "source",
      type: "string",
      help: "Comma-separated posting-source allowlist, such as LinkedIn or Indeed",
    },
    {
      name: "exclude-source",
      type: "string",
      help: "Comma-separated posting sources to exclude",
    },
    {
      name: "has-salary",
      type: "boolean",
      default: false,
      help: "Return only jobs with compensation displayed on the result card",
    },
    {
      name: "sort",
      type: "string",
      default: "relevance",
      choices: ["relevance", "recent", "title", "company"],
      help: "Sort by Google relevance, displayed age, title, or company",
    },
    {
      name: "details",
      type: "boolean",
      default: false,
      help: "Load each selected job's full description and direct application options (limit 10)",
    },
    {
      name: "limit",
      type: "int",
      default: 10,
      help: "Maximum number of jobs to return (1-50, or 1-10 with --details)",
    },
    {
      name: "region",
      type: "string",
      default: "US",
      help: "Two-letter country code used for Google result localization",
    },
  ],
  columns: [
    "rank",
    "title",
    "company",
    "location",
    "remote",
    "posted",
    "employment_type",
    "salary",
    "source",
    "apply_url",
    "url",
  ],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError("Browser session required for google jobs");

    let query;
    let limit;
    let region;
    const details = kwargs.details === true;
    try {
      query = String(kwargs.query || "").trim();
      if (!query) throw new Error("query must not be empty");
      limit = integerInRange(kwargs.limit, "limit", 1, details ? 10 : 50);
      region = normalizeRegion(kwargs.region);
    } catch (error) {
      validationError(error);
    }

    const sourceUrl = buildJobsUrl({
      query,
      location: kwargs.location,
      remote: kwargs.remote,
      jobType: kwargs["job-type"],
      region,
    });
    await page.goto(sourceUrl);
    try {
      await page.wait({
        selector: '[data-fc-up*="docid="][role="button"], [jsname="y1Aese"][role="button"]',
        timeout: 12,
      });
    } catch {
      await page.wait(2);
    }

    let payload = await extractJobsCandidates(page);
    let previousCount = -1;
    let stagnantAttempts = 0;
    for (let attempt = 0; attempt < 6 && (payload?.candidates || []).length < 50; attempt++) {
      const currentCount = (payload?.candidates || []).length;
      if (currentCount >= Math.max(limit * 2, 20)) break;
      stagnantAttempts = currentCount === previousCount ? stagnantAttempts + 1 : 0;
      if (stagnantAttempts >= 2) break;
      previousCount = currentCount;
      await scrollJobsResults(page);
      await page.wait(1);
      payload = await extractJobsCandidates(page);
    }

    if (payload?.challenge) {
      throw new CommandExecutionError(
        "Google Jobs served a CAPTCHA or unusual-traffic page; clear it in the browser and retry",
      );
    }
    if (!String(payload?.language || "").startsWith("en")) {
      throw new CommandExecutionError(
        `Google Jobs did not honor the required English extraction locale (rendered ${payload?.language || "an unknown locale"})`,
      );
    }

    const rawCandidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
    const normalizedRows = dedupeJobsRows(
      rawCandidates.map((candidate, index) =>
        normalizeJobsCandidate(candidate, index, {
          sourceUrl: payload?.url || sourceUrl,
          region,
        }),
      ),
    );
    if (normalizedRows.length === 0) {
      throw new CommandExecutionError(
        `Google Jobs returned no readable job cards for "${query}"; try another query or inspect the browser for a consent page`,
      );
    }

    const results = filterAndSortJobsRows(normalizedRows, {
      company: kwargs.company,
      excludeCompany: kwargs["exclude-company"],
      source: kwargs.source,
      excludeSource: kwargs["exclude-source"],
      remote: kwargs.remote,
      jobType: kwargs["job-type"],
      postedWithin: kwargs["posted-within"],
      hasSalary: kwargs["has-salary"] === true,
      sort: kwargs.sort,
      limit,
    });
    if (results.length === 0) {
      throw new CommandExecutionError(
        `Google Jobs exposed ${normalizedRows.length} job cards, but none matched the requested filters`,
      );
    }

    if (!details) return results;
    const detailedResults = [];
    for (const result of results) {
      const detail = result.job_id
        ? await extractJobDetails(page, result.job_id)
        : { loaded: false };
      detailedResults.push({
        ...result,
        details_loaded: detail?.loaded === true,
        description: detail?.description || null,
        applications: detail?.applications || [],
        apply_url: detail?.apply_url || null,
        url: detail?.google_url || result.url,
      });
    }
    return detailedResults;
  },
});
