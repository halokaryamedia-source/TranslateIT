import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { AUTO_TEST_REPORT_DIR } from "./auto_test_registry.mjs";

export function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function containsAllKeywords(text, keywords = []) {
  const normalized = normalizeText(text);
  return keywords.every((keyword) => normalized.includes(normalizeText(keyword)));
}

export function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "/").replace(/\r?\n/g, " ").trim();
}

export function buildReportDir(repoRoot) {
  const reportDir = resolve(repoRoot, ...AUTO_TEST_REPORT_DIR);
  mkdirSync(reportDir, { recursive: true });
  return reportDir;
}

export function writeJsonAndMarkdown({ reportDir, jsonName, markdownName, report, markdownLines }) {
  writeFileSync(resolve(reportDir, jsonName), JSON.stringify(report, null, 2));
  writeFileSync(resolve(reportDir, markdownName), markdownLines.join("\n"));
}

export function scenarioResult({ scenario, started, checks, output = {} }) {
  const failedChecks = checks.filter((check) => !check.ok);
  return {
    id: scenario.id,
    title: scenario.title,
    status: failedChecks.length ? "failed" : "passed",
    ok: failedChecks.length === 0,
    duration_ms: Date.now() - started,
    purpose: scenario.purpose,
    checks,
    failure_markers: failedChecks.map((check) => `${check.id}: ${check.detail}`),
    ...output,
  };
}

export function summarizeResults({ schema, mode, note, startedAt, results }) {
  const finishedAt = new Date();
  return {
    schema,
    generated_at: finishedAt.toISOString(),
    started_at: startedAt.toISOString(),
    duration_ms: finishedAt.getTime() - startedAt.getTime(),
    mode,
    note,
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  };
}

export function appendFailureDetails(lines, failures) {
  lines.push("", "## Failure Details", "");
  if (!failures.length) {
    lines.push("none", "");
    return lines;
  }

  for (const result of failures) {
    lines.push(`### ${result.id}`, "");
    for (const marker of result.failure_markers) lines.push(`- ${marker}`);
    lines.push("");
  }

  return lines;
}
