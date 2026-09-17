import assert from "node:assert/strict";
import test from "node:test";
import { summarizeReport } from "./report-shadcn-lint.mjs";

function report(diagnostics = []) {
  return JSON.stringify({ number_of_files: 12, diagnostics });
}

test("advisory findings remain visible even when the scan succeeds", () => {
  const diagnostic = { code: "shadcn(no-restyle)", filename: "page.tsx", severity: "warning" };
  const result = summarizeReport(report([diagnostic, diagnostic]), "", "success");
  assert.equal(result.incomplete, false);
  assert.match(result.annotation, /2 advisory diagnostics across 1 files/);
  assert.match(result.summary, /shadcn\(no-restyle\) \| 2/);
});

test("a clean scan and an unavailable scan have different outcomes", () => {
  const clean = summarizeReport(report(), "", "success");
  assert.equal(clean.annotation, null);
  assert.equal(clean.incomplete, false);
  for (const [text, outcome] of [
    ["", "skipped"],
    ["not JSON", "success"],
    ["{}", "success"],
    [JSON.stringify({ number_of_files: 0, diagnostics: [] }), "success"],
    [report([null]), "success"],
    [report(), "failure"],
  ]) {
    const result = summarizeReport(text, "", outcome);
    assert.equal(result.incomplete, true);
    assert.match(result.summary, /Do not interpret this as zero findings/);
  }
});

test("advice and future severity names do not hide other findings", () => {
  const diagnostics = ["warning", "error", "advice", "future-severity"].map((severity) => ({
    code: "shadcn(no-restyle)",
    filename: "page.tsx",
    severity,
  }));
  const result = summarizeReport(report(diagnostics), "", "success");
  assert.equal(result.incomplete, false);
  assert.match(result.annotation, /4 advisory diagnostics across 1 files/);
  assert.match(result.summary, /shadcn\(no-restyle\) \| 4/);
});

test("missing, blank, and non-string severities remain invalid", () => {
  for (const severity of [undefined, null, "", " \t\n", 1, false, {}, []]) {
    const result = summarizeReport(
      report([{ code: "shadcn(no-restyle)", filename: "page.tsx", severity }]),
      "",
      "success",
    );
    assert.equal(result.incomplete, true);
    assert.match(result.summary, /Do not interpret this as zero findings/);
  }
});

test("discovery warnings remain visible without rule diagnostics", () => {
  const result = summarizeReport(report(), "Theme resolution failed", "success");
  assert.ok(result.annotation);
  assert.match(result.summary, /Discovery warnings were emitted/);
});

test("rule names cannot inject Markdown or workflow commands into the summary", () => {
  const result = summarizeReport(
    report([
      {
        code: "rule|<b>`\n::error::injected",
        filename: "page.tsx",
        severity: "warning",
      },
    ]),
    "",
    "success",
  );
  assert.doesNotMatch(result.summary, /\n::error|<b>/);
  assert.match(result.summary, /rule&#124;&#60;b&#62;&#96;&#10;/);
});
