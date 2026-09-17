import { randomUUID } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

function escapeMarkdown(value) {
  return value.replace(/[&<>|`\r\n]/g, (character) => `&#${character.charCodeAt(0)};`);
}

export function summarizeReport(reportText, stderr, outcome) {
  const introduction = [
    "## shadcn lint (advisory)",
    "",
    "This check does not block CI. A successful job does not mean the design system has no findings.",
    "",
  ];
  let report;
  try {
    report = JSON.parse(reportText);
  } catch {
    report = null;
  }
  const valid =
    Number.isInteger(report?.number_of_files) &&
    report.number_of_files > 0 &&
    Array.isArray(report.diagnostics) &&
    report.diagnostics.every(
      (diagnostic) =>
        typeof diagnostic?.code === "string" &&
        typeof diagnostic.filename === "string" &&
        ["warning", "error"].includes(diagnostic.severity),
    );
  if (outcome !== "success" || !valid) {
    return {
      incomplete: true,
      annotation: "shadcn lint did not complete. This is not a clean scan. Inspect the job logs.",
      summary: introduction
        .concat(
          "**Scan incomplete or unavailable. Do not interpret this as zero findings.**",
          "",
          "Inspect setup/scan step logs and the diagnostic log groups, if available.",
          "Reproduce with `pnpm lint:shadcn`. See DEVELOPMENT.md for scope and known limitations.",
          "",
        )
        .join("\n"),
    };
  }

  const counts = new Map();
  for (const diagnostic of report.diagnostics) {
    counts.set(diagnostic.code, (counts.get(diagnostic.code) ?? 0) + 1);
  }
  const findings = report.diagnostics.length;
  const files = new Set(report.diagnostics.map((diagnostic) => diagnostic.filename)).size;
  const summary = introduction
    .concat(
      `Scanned **${report.number_of_files} files**: **${findings} diagnostics** across **${files} files**.`,
      "",
      "| Rule | Diagnostics |",
      "| --- | ---: |",
      ...[...counts]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([rule, count]) => `| ${escapeMarkdown(rule)} | ${count} |`),
      "",
      stderr.trim()
        ? "**Discovery warnings were emitted. Check the stderr log group before judging coverage.**"
        : "No stderr diagnostics were emitted.",
      "",
      "Known noise: named typography and shadow tokens can be mistaken for colors. Token references can be reported as arbitrary values.",
      "Review findings in changed files against DESIGN.md. Do not invent color tokens or change intentional brand artwork to silence warnings.",
      "",
      "Read the diagnostic log groups for all source locations and messages. Reproduce with `pnpm lint:shadcn`.",
      "Agents: report actionable findings, known noise, and any coverage limits in the handoff. See DEVELOPMENT.md for details.",
      "",
    )
    .join("\n");
  return {
    incomplete: false,
    annotation:
      findings || stderr.trim()
        ? `shadcn lint: ${findings} advisory diagnostics across ${files} files. Review the job summary and diagnostic log groups; known token false positives apply.`
        : null,
    summary,
  };
}

function readOptional(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [reportPath, stderrPath, outcome] = process.argv.slice(2);
  const reportText = readOptional(reportPath);
  const stderr = readOptional(stderrPath);
  const result = summarizeReport(reportText, stderr, outcome);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.summary);
  }
  console.log(result.summary);
  if (result.annotation)
    console.log(`::warning title=shadcn lint (advisory)::${result.annotation}`);
  for (const [title, contents] of [
    ["shadcn JSON diagnostics", reportText],
    ["shadcn stderr", stderr],
  ]) {
    const token = randomUUID();
    console.log(`::group::${title}`);
    console.log(`::stop-commands::${token}`);
    console.log(contents || "(no output)");
    console.log(`::${token}::`);
    console.log("::endgroup::");
  }
  if (result.incomplete) process.exitCode = 1;
}
