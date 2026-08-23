import {
  cleanText,
  inferCurrency,
  integerInRange,
  normalizeRegion,
  parseStringList,
  uniqueText,
} from "./shopping-helpers.mjs";

const JOB_TYPE_QUERY = {
  "full-time": "full time",
  "part-time": "part time",
  contract: "contract",
  temporary: "temporary",
  internship: "internship",
  volunteer: "volunteer",
  "per-diem": "per diem",
};

const POSTED_WITHIN_HOURS = {
  day: 24,
  "3-days": 72,
  week: 24 * 7,
  month: 24 * 31,
};

export { cleanText, integerInRange, normalizeRegion };

export function buildJobsUrl({
  query,
  location = "",
  remote = "any",
  jobType = "any",
  region = "US",
}) {
  const normalizedQuery = cleanText(query);
  if (!normalizedQuery) throw new Error("query must not be empty");

  const terms = [];
  if (remote === "only" && !/\bremote\b/i.test(normalizedQuery)) terms.push("remote");
  terms.push(normalizedQuery);
  if (jobType !== "any" && JOB_TYPE_QUERY[jobType]) terms.push(JOB_TYPE_QUERY[jobType]);
  if (!/\bjobs?\b/i.test(normalizedQuery)) terms.push("jobs");
  const normalizedLocation = cleanText(location);
  if (normalizedLocation) terms.push(`in ${normalizedLocation}`);

  const url = new URL("https://www.google.com/search");
  // Google's dedicated Jobs result vertical. ibp=htl;jobs is the older
  // equivalent and currently redirects to this stable public search URL.
  url.searchParams.set("udm", "8");
  url.searchParams.set("q", terms.join(" "));
  // Candidate extraction relies on Google's English accessibility labels.
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", normalizeRegion(region).toLowerCase());
  return url.toString();
}

function parseSalaryNumber(value) {
  const normalized = cleanText(value).replace(/\s/g, "");
  const match = normalized.match(/([0-9]+(?:[.,][0-9]+)*)\s*([KMB])?/i);
  if (!match) return null;

  const suffix = (match[2] || "").toUpperCase();
  let numberText = match[1];
  const separatorIndex = Math.max(numberText.lastIndexOf(","), numberText.lastIndexOf("."));
  const trailingDigits = separatorIndex === -1 ? 0 : numberText.length - separatorIndex - 1;
  const separatorCharacter = separatorIndex === -1 ? "" : numberText[separatorIndex];
  const separatorCount = separatorCharacter ? numberText.split(separatorCharacter).length - 1 : 0;
  const usesDecimal =
    separatorIndex !== -1 && trailingDigits > 0 && trailingDigits <= 2 && separatorCount === 1;
  if (usesDecimal) {
    numberText = `${numberText.slice(0, separatorIndex).replace(/[.,]/g, "")}.${numberText.slice(separatorIndex + 1)}`;
  } else {
    numberText = numberText.replace(/[.,]/g, "");
  }

  const parsed = Number(numberText);
  if (!Number.isFinite(parsed)) return null;
  const multiplier = { K: 1_000, M: 1_000_000, B: 1_000_000_000 }[suffix] || 1;
  return parsed * multiplier;
}

export function parseSalary(value, region = "US") {
  const text = cleanText(value).replace(/^Salary\s+/i, "");
  if (!text) {
    return { text: null, minimum: null, maximum: null, currency: null, period: null };
  }

  const numberMatches = text.match(/[0-9]+(?:[.,][0-9]+)*\s*[KMB]?/gi) || [];
  const numbers = numberMatches.map(parseSalaryNumber).filter(Number.isFinite);
  const lowerText = text.toLowerCase();
  let minimum = numbers[0] ?? null;
  let maximum = numbers[1] ?? numbers[0] ?? null;
  if (/\b(?:up to|maximum|max)\b/i.test(text) && numbers.length === 1) minimum = null;
  if (/\b(?:from|minimum|min|starting at)\b/i.test(text) && numbers.length === 1) maximum = null;

  const period = ["hour", "day", "week", "month", "year"].find((candidate) =>
    new RegExp(`\\b(?:an?|per|/)\\s*${candidate}\\b|\\b${candidate}ly\\b`, "i").test(lowerText),
  );

  return {
    text,
    minimum,
    maximum,
    currency: inferCurrency(text, region),
    period: period || null,
  };
}

export function parsePostedHours(value) {
  const normalized = cleanText(value)
    .replace(/^Posted\s+/i, "")
    .toLowerCase();
  if (!normalized) return null;
  if (/^(?:just posted|today|new)$/.test(normalized)) return 0;
  if (/^yesterday$/.test(normalized)) return 24;

  const match = normalized.match(/([0-9]+)\+?\s*(minute|hour|day|week|month)s?\s+ago/);
  if (!match) return null;
  const count = Number(match[1]);
  const multiplier = {
    minute: 1 / 60,
    hour: 1,
    day: 24,
    week: 24 * 7,
    month: 24 * 30,
  }[match[2]];
  return count * multiplier;
}

function normalizeEmploymentType(value) {
  const normalized = cleanText(value)
    .replace(/^Employment Type\s+/i, "")
    .toLowerCase();
  if (/full[ -]?time/.test(normalized)) return "full-time";
  if (/part[ -]?time/.test(normalized)) return "part-time";
  if (/contract(?:or)?/.test(normalized)) return "contract";
  if (/temp(?:orary)?/.test(normalized)) return "temporary";
  if (/intern(?:ship)?/.test(normalized)) return "internship";
  if (/volunteer/.test(normalized)) return "volunteer";
  if (/per[ -]?diem/.test(normalized)) return "per-diem";
  return normalized || null;
}

export function normalizeJobsCandidate(candidate, index, context) {
  const location = cleanText(candidate.location);
  const tags = uniqueText(candidate.tags || []);
  const salary = parseSalary(candidate.salary_text, context.region);
  const postedText = cleanText(candidate.posted_text).replace(/^Posted\s+/i, "");
  const employmentType = normalizeEmploymentType(candidate.employment_type);
  const qualifications = cleanText(candidate.qualifications).replace(/^Qualification\s+/i, "");
  const jobId = cleanText(candidate.job_id) || null;
  const sourceUrl = cleanText(context.sourceUrl);
  const remote = /\b(?:remote|anywhere|work from home|home-based|telecommut(?:e|ing))\b/i.test(
    `${location} ${tags.join(" ")}`,
  );

  return {
    _pageOrder: index,
    _postedHours: parsePostedHours(postedText),
    rank: index + 1,
    page_rank: index + 1,
    title: cleanText(candidate.title),
    company: cleanText(candidate.company),
    location,
    remote,
    source: cleanText(candidate.source),
    posted: postedText,
    employment_type: employmentType,
    salary: salary.text,
    salary_min: salary.minimum,
    salary_max: salary.maximum,
    salary_currency: salary.currency,
    salary_period: salary.period,
    qualifications,
    tags,
    job_id: jobId,
    url: sourceUrl,
    source_url: sourceUrl,
  };
}

export function dedupeJobsRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const identity = row.job_id
      ? `id:${row.job_id}`
      : [row.title, row.company, row.location]
          .map((value) => cleanText(value).toLowerCase())
          .join("|");
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function matchesList(value, filters) {
  if (filters.length === 0) return true;
  const normalized = cleanText(value).toLowerCase();
  return filters.some((filter) => normalized.includes(filter));
}

function compareText(left, right, field) {
  return (
    cleanText(left[field]).localeCompare(cleanText(right[field])) ||
    left._pageOrder - right._pageOrder
  );
}

function compareRecent(left, right) {
  const leftAge = Number.isFinite(left._postedHours) ? left._postedHours : Number.POSITIVE_INFINITY;
  const rightAge = Number.isFinite(right._postedHours)
    ? right._postedHours
    : Number.POSITIVE_INFINITY;
  return leftAge - rightAge || left._pageOrder - right._pageOrder;
}

export function filterAndSortJobsRows(rows, options) {
  const companies = parseStringList(options.company);
  const excludedCompanies = parseStringList(options.excludeCompany);
  const sources = parseStringList(options.source);
  const excludedSources = parseStringList(options.excludeSource);
  const maximumAge = POSTED_WITHIN_HOURS[options.postedWithin] ?? null;

  const filtered = rows.filter((row) => {
    if (!row.title || !row.company) return false;
    if (!matchesList(row.company, companies)) return false;
    if (excludedCompanies.length > 0 && matchesList(row.company, excludedCompanies)) return false;
    if (!matchesList(row.source, sources)) return false;
    if (excludedSources.length > 0 && matchesList(row.source, excludedSources)) return false;
    if (options.remote === "only" && !row.remote) return false;
    if (options.remote === "exclude" && row.remote) return false;
    if (options.jobType !== "any" && row.employment_type !== options.jobType) return false;
    if (
      maximumAge !== null &&
      (!Number.isFinite(row._postedHours) || row._postedHours > maximumAge)
    ) {
      return false;
    }
    if (options.hasSalary && !row.salary) return false;
    return true;
  });

  const sorted = [...filtered];
  if (options.sort === "recent") sorted.sort(compareRecent);
  if (options.sort === "title") sorted.sort((left, right) => compareText(left, right, "title"));
  if (options.sort === "company") sorted.sort((left, right) => compareText(left, right, "company"));

  return sorted.slice(0, options.limit).map((row, index) => {
    const { _pageOrder, _postedHours, ...result } = row;
    return { ...result, rank: index + 1 };
  });
}
