import type { AuditReport } from "./types";

/**
 * Turns triage decisions into a prompt for a coding agent.
 *
 * The prose fields already carry Markdown inline syntax, so they pass straight
 * through — the page and the prompt never drift because there is only one copy
 * of every sentence. Declined findings are listed too: an agent that can see
 * what was considered and rejected won't re-raise it.
 */
export function buildPrompt(
  report: AuditReport,
  decisions: Record<string, "open" | "fix" | "skip">,
): string {
  const fix = report.findings.filter((f) => decisions[f.id] === "fix");
  const skip = report.findings.filter((f) => decisions[f.id] === "skip");

  const out: string[] = [];
  out.push(`# UX fixes for \`${report.route}\``);
  out.push("");
  out.push(
    `From a rule-based UX audit of \`${report.route}\`. ${fix.length} finding${
      fix.length === 1 ? "" : "s"
    } to fix, in priority order. Each is independent — land them one at a time.`,
  );
  out.push("");

  fix.forEach((f, i) => {
    out.push("---");
    out.push("");
    out.push(`## ${i + 1}. ${f.title}`);
    out.push("");
    out.push(`- Severity: ${f.severity} · rule: \`${f.rule}\` · surface: ${f.surface}`);
    out.push(`- Where: \`${f.evidence.where}\``);
    out.push("");
    out.push(`**What's wrong:** ${f.why.join(" ")}`);
    out.push("");
    out.push("```tsx");
    out.push(f.evidence.code);
    out.push("```");
    out.push("");
    out.push(`**Do this:** ${f.fix}`);
    out.push("");
  });

  if (skip.length > 0) {
    out.push("---");
    out.push("");
    out.push("## Reviewed and deliberately not changing");
    out.push("");
    out.push("These were considered and declined. Leave them alone, and don't raise them again:");
    out.push("");
    skip.forEach((f) => out.push(`- ${f.title} (\`${f.evidence.where}\`)`));
    out.push("");
  }

  out.push("---");
  out.push("");
  out.push("## Ground rules");
  out.push("");
  report.groundRules.forEach((r) => out.push(`- ${r}`));

  return out.join("\n");
}
