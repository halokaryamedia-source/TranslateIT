import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const exportPath = join(root, "src", "design-system", "figma-export", "translateit.figma-export.json");
const payload = JSON.parse(readFileSync(exportPath, "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertArray(value, name) {
  assert(Array.isArray(value), `${name} must be an array.`);
  assert(value.length > 0, `${name} must not be empty.`);
}

assert(payload.schema, "Missing export schema.");
assert(payload.meta?.status === "ready-for-figma-import", "Export status must be ready-for-figma-import.");
assertArray(payload.variables, "variables");
assertArray(payload.pages, "pages");
assertArray(payload.components, "components");
assert(payload.figmaFrames?.mainPage, "Missing figmaFrames.mainPage.");
assertArray(payload.figmaFrames.mainPage.children, "figmaFrames.mainPage.children");
assertArray(payload.safeEditRules, "safeEditRules");

const requiredComponentIds = [
  "main-sidebar",
  "main-topbar",
  "main-hero",
  "feature-card-text",
  "feature-card-voice",
  "assistant-card",
  "main-composer",
  "account-card",
];

const componentIds = new Set(payload.components.map((component) => component.id));
for (const id of requiredComponentIds) {
  assert(componentIds.has(id), `Missing component: ${id}`);
}

for (const component of payload.components) {
  assert(component.name, `Component ${component.id} is missing name.`);
  assert(component.cssScope, `Component ${component.id} is missing cssScope.`);
  assertArray(component.editable, `component.${component.id}.editable`);
  assertArray(component.lockedAgainst, `component.${component.id}.lockedAgainst`);
  assert(component.resolvedTokens, `Component ${component.id} is missing resolvedTokens.`);
}

const frameIds = new Set(payload.figmaFrames.mainPage.children.map((child) => child.id));
for (const id of ["sidebar", "topbar", "hero", "feature-card-text", "feature-card-voice", "assistant-card", "composer", "account-card"]) {
  assert(frameIds.has(id), `Missing Figma frame: ${id}`);
}

console.log("Figma export payload is ready.");
