import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..", "..", "..");
const reportDir = resolve(repoRoot, ".tmp", "validation", "RuntimeTestReports");
const rendererPath = resolve(appRoot, "src", "app", "active-launcher", "launcherSettingsRenderer.ts");
const viewsPath = resolve(appRoot, "src", "app", "active-launcher", "settingsViews.ts");

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function unique(values) {
  return Array.from(new Set(values)).sort();
}

function rendererBoundIds(content) {
  const ids = [];
  for (const match of content.matchAll(/requireElement<[^>]+>\("#([A-Za-z0-9_-]+)"\)/g)) ids.push(match[1]);
  for (const match of content.matchAll(/document\.getElementById\("([A-Za-z0-9_-]+)"\)/g)) ids.push(match[1]);
  return unique(ids);
}

function viewIds(content) {
  const ids = [];
  for (const match of content.matchAll(/id=\"([A-Za-z0-9_-]+)\"/g)) ids.push(match[1]);
  for (const match of content.matchAll(/primaryButton\("[^"]+", \{ id: "([A-Za-z0-9_-]+)"/g)) ids.push(match[1]);
  for (const match of content.matchAll(/factorySelectField\("[^"]+", [^,]+, "[^"]+", "([A-Za-z0-9_-]+)"/g)) ids.push(match[1]);
  for (const match of content.matchAll(/radioOption\("([A-Za-z0-9_-]+)"/g)) ids.push(match[1]);
  return unique(ids);
}

function main() {
  mkdirSync(reportDir, { recursive: true });
  const renderer = read(rendererPath);
  const views = read(viewsPath);
  const bound = rendererBoundIds(renderer);
  const declared = viewIds(views);
  const missingInView = bound.filter((id) => !declared.includes(id));
  const ok = existsSync(rendererPath) && existsSync(viewsPath) && missingInView.length === 0;
  const report = {
    schema: "translateit.ui_binding_consistency_report.v1",
    generated_at: new Date().toISOString(),
    ok,
    renderer_path: rendererPath,
    views_path: viewsPath,
    bound_ids: bound,
    declared_ids: declared,
    missing_in_view: missingInView,
  };
  const latestJson = resolve(reportDir, "latest-ui-binding-consistency.json");
  const latestMd = resolve(reportDir, "latest-ui-binding-consistency.md");
  const md = [
    "# TranslateIT UI Binding Consistency Report",
    "",
    `OK: ${ok}`,
    "",
    "## Bound IDs",
    "",
    bound.length ? bound.map((id) => `- ${id}`).join("\n") : "none",
    "",
    "## Missing in settings views",
    "",
    missingInView.length ? missingInView.map((id) => `- ${id}`).join("\n") : "none",
  ].join("\n");
  writeFileSync(latestJson, JSON.stringify(report, null, 2));
  writeFileSync(latestMd, md);
  console.log(`UI binding consistency report written: ${latestMd}`);
  console.log(JSON.stringify({ ok, bound: bound.length, missingInView }, null, 2));
  if (!ok) process.exitCode = 1;
}

main();
