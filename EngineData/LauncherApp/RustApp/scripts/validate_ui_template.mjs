import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const primitives = read("src/app/launcher/referenceUiPrimitives.ts");
const factory = read("src/app/launcher/uiPageFactory.ts");
const professionalUi = read("src/professionalUi.css");
const template = read("../../Frontend/DesignReview/UIPageTemplate.md");
const guide = read("../../Frontend/DesignReview/UIReferenceGuide.md");

const required = [
  "REFERENCE_UI_PAGE_TEMPLATE",
  "settingsContentLeftOffsetPx",
  "mainFeatureGridGapPx",
  "settings-grid-2",
  "settings-card",
  "feature-grid",
  "settingsPage(",
  "settingsSection(",
  "settingsCard(",
  "settingsGrid(",
  "settingsField(",
  "settingsActions(",
  "selectButton(",
  "primaryButton(",
  "advancedEmpty(",
  "emptyState(",
  "outputRow(",
  "languageSelectField(",
  "radioOption(",
  "monitoringPanel(",
  "diagnosticActions(",
  "statusBadge(",
  "developerLogRows(",
  "DeveloperLogRow",
  "empty-state-card",
  "status-badge",
  "UI Page Template",
  "Settings Page Template",
  "Main/Home Page Template",
  "360px",
  "322px",
  "993px",
  "72px",
];

const source = `${primitives}\n${factory}\n${professionalUi}\n${template}\n${guide}`;
const missing = required.filter((token) => !source.includes(token));

if (missing.length > 0) {
  console.error("UI template validation failed:");
  for (const token of missing) console.error(`- Missing: ${token}`);
  process.exit(1);
}

console.log("UI template validation passed.");
