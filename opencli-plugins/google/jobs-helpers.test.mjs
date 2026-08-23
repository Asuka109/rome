import assert from "node:assert/strict";
import test from "node:test";
import {
  buildJobsUrl,
  dedupeJobsRows,
  filterAndSortJobsRows,
  normalizeJobsCandidate,
  parsePostedHours,
  parseSalary,
} from "./jobs-helpers.mjs";

function row(overrides = {}) {
  return {
    _pageOrder: 0,
    _postedHours: 24,
    title: "Software Engineer",
    company: "Acme",
    location: "San Francisco, CA",
    remote: false,
    source: "LinkedIn",
    posted: "1 day ago",
    employment_type: "full-time",
    salary: "$150K–$180K a year",
    job_id: "job-1",
    ...overrides,
  };
}

function options(overrides = {}) {
  return {
    company: "",
    excludeCompany: "",
    source: "",
    excludeSource: "",
    remote: "any",
    jobType: "any",
    postedWithin: "any",
    hasSalary: false,
    sort: "relevance",
    limit: 10,
    ...overrides,
  };
}

test("buildJobsUrl composes dedicated Google Jobs queries", () => {
  const url = new URL(
    buildJobsUrl({
      query: "staff platform engineer",
      location: "New York, NY",
      remote: "only",
      jobType: "full-time",
      region: "US",
    }),
  );
  assert.equal(url.origin + url.pathname, "https://www.google.com/search");
  assert.equal(url.searchParams.get("udm"), "8");
  assert.equal(
    url.searchParams.get("q"),
    "remote staff platform engineer full time jobs in New York, NY",
  );
  assert.equal(url.searchParams.get("hl"), "en");
  assert.equal(url.searchParams.get("gl"), "us");
});

test("buildJobsUrl does not duplicate existing job or remote terms", () => {
  const url = new URL(
    buildJobsUrl({ query: "remote design jobs", remote: "only", jobType: "any", region: "GB" }),
  );
  assert.equal(url.searchParams.get("q"), "remote design jobs");
  assert.equal(url.searchParams.get("gl"), "gb");
});

test("parseSalary reads ranges, bounds, currencies, and periods", () => {
  assert.deepEqual(parseSalary("Salary $180K–$220K a year", "US"), {
    text: "$180K–$220K a year",
    minimum: 180_000,
    maximum: 220_000,
    currency: "USD",
    period: "year",
  });
  assert.deepEqual(parseSalary("Up to £80 an hour", "GB"), {
    text: "Up to £80 an hour",
    minimum: null,
    maximum: 80,
    currency: "GBP",
    period: "hour",
  });
  assert.deepEqual(parseSalary("From $120,000 a year", "US"), {
    text: "From $120,000 a year",
    minimum: 120_000,
    maximum: null,
    currency: "USD",
    period: "year",
  });
  assert.deepEqual(parseSalary("$22.50 an hour", "US"), {
    text: "$22.50 an hour",
    minimum: 22.5,
    maximum: 22.5,
    currency: "USD",
    period: "hour",
  });
});

test("parsePostedHours handles Google recency labels", () => {
  assert.equal(parsePostedHours("Posted Just posted"), 0);
  assert.equal(parsePostedHours("8 hours ago"), 8);
  assert.equal(parsePostedHours("3 days ago"), 72);
  assert.equal(parsePostedHours("2 weeks ago"), 336);
  assert.equal(parsePostedHours("Yesterday"), 24);
  assert.equal(parsePostedHours("unknown"), null);
});

test("normalizeJobsCandidate extracts structured job metadata", () => {
  const normalized = normalizeJobsCandidate(
    {
      title: " Senior Engineer ",
      company: " Acme ",
      location: "Anywhere",
      source: "Indeed",
      posted_text: "Posted 3 days ago",
      salary_text: "Salary $160K–$190K a year",
      employment_type: "Employment Type Full-time",
      qualifications: "Qualification No degree mentioned",
      tags: ["Work from home", "Health insurance", "Work from home"],
      job_id: "abc",
    },
    2,
    { region: "US", sourceUrl: "https://www.google.com/search?udm=8" },
  );

  assert.equal(normalized.page_rank, 3);
  assert.equal(normalized.title, "Senior Engineer");
  assert.equal(normalized.remote, true);
  assert.equal(normalized.employment_type, "full-time");
  assert.equal(normalized.salary_min, 160_000);
  assert.equal(normalized.salary_max, 190_000);
  assert.equal(normalized.salary_currency, "USD");
  assert.equal(normalized.salary_period, "year");
  assert.equal(normalized.qualifications, "No degree mentioned");
  assert.deepEqual(normalized.tags, ["Work from home", "Health insurance"]);
});

test("dedupeJobsRows prefers stable ids and falls back to job identity", () => {
  const rows = dedupeJobsRows([
    row(),
    row({ _pageOrder: 1 }),
    row({ _pageOrder: 2, job_id: null, title: "Designer" }),
    row({ _pageOrder: 3, job_id: null, title: "Designer" }),
  ]);
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((candidate) => candidate._pageOrder),
    [0, 2],
  );
});

test("filterAndSortJobsRows composes company, source, work-style, and recency filters", () => {
  const rows = [
    row({ _pageOrder: 0, job_id: "1", company: "Acme AI", _postedHours: 48 }),
    row({
      _pageOrder: 1,
      job_id: "2",
      company: "Acme Labs",
      source: "Indeed",
      remote: true,
      location: "Remote",
      _postedHours: 2,
    }),
    row({
      _pageOrder: 2,
      job_id: "3",
      company: "Other Co",
      remote: true,
      _postedHours: 1,
    }),
  ];

  const result = filterAndSortJobsRows(
    rows,
    options({
      company: "Acme",
      excludeSource: "Indeed",
      remote: "exclude",
      postedWithin: "3-days",
    }),
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].job_id, "1");
  assert.equal(result[0].rank, 1);
  assert.equal("_pageOrder" in result[0], false);
  assert.equal("_postedHours" in result[0], false);
});

test("filterAndSortJobsRows excludes unknown ages and salaries when requested", () => {
  const rows = [
    row({ job_id: "1", _postedHours: null }),
    row({ job_id: "2", _pageOrder: 1, _postedHours: 2, salary: null }),
    row({ job_id: "3", _pageOrder: 2, _postedHours: 4 }),
  ];
  const result = filterAndSortJobsRows(rows, options({ postedWithin: "day", hasSalary: true }));
  assert.deepEqual(
    result.map((candidate) => candidate.job_id),
    ["3"],
  );
});

test("filterAndSortJobsRows supports deterministic recent, title, and company sorts", () => {
  const rows = [
    row({ job_id: "1", title: "Zoo", company: "Beta", _postedHours: null }),
    row({ job_id: "2", title: "Alpha", company: "Gamma", _postedHours: 8, _pageOrder: 1 }),
    row({ job_id: "3", title: "Middle", company: "Acme", _postedHours: 2, _pageOrder: 2 }),
  ];
  assert.deepEqual(
    filterAndSortJobsRows(rows, options({ sort: "recent" })).map((candidate) => candidate.job_id),
    ["3", "2", "1"],
  );
  assert.deepEqual(
    filterAndSortJobsRows(rows, options({ sort: "title" })).map((candidate) => candidate.job_id),
    ["2", "3", "1"],
  );
  assert.deepEqual(
    filterAndSortJobsRows(rows, options({ sort: "company" })).map((candidate) => candidate.job_id),
    ["3", "1", "2"],
  );
});
