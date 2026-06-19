import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const designSystemRoot = join(root, "src", "design-system");
const outputDir = join(designSystemRoot, "figma-export");

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

function tokenValue(tokens, path) {
  const value = path.split(".").reduce((node, part) => node?.[part], tokens);
  return value?.value ?? null;
}

function flattenTokens(tokens) {
  const output = [];

  function walk(node, path = []) {
    if (!node || typeof node !== "object") return;
    if (Object.hasOwn(node, "value") && Object.hasOwn(node, "type")) {
      output.push({
        name: path.join("/"),
        path: path.join("."),
        type: node.type,
        value: node.value,
      });
      return;
    }
    for (const [key, value] of Object.entries(node)) walk(value, [...path, key]);
  }

  for (const [group, value] of Object.entries(tokens)) {
    if (group.startsWith("$") || group === "meta") continue;
    walk(value, [group]);
  }

  return output;
}

function buildFigmaVariables(tokens) {
  return flattenTokens(tokens).map((token) => ({
    name: token.name,
    type: token.type,
    value: token.value,
    figmaCollection: token.name.split("/")[0],
  }));
}

function buildFigmaComponents(tokens, registry) {
  return registry.components.map((component) => ({
    id: component.id,
    name: component.name,
    type: component.type,
    cssScope: component.scope,
    editable: component.editable,
    lockedAgainst: component.lockedAgainst,
    children: component.children ?? [],
    variants: component.variants ?? [],
    resolvedTokens: Object.fromEntries(
      Object.entries(component.tokens ?? {}).map(([key, tokenPath]) => [key, {
        token: tokenPath,
        value: tokenValue(tokens, tokenPath),
      }]),
    ),
  }));
}

function main() {
  const tokens = readJson("src/design-system/translateit.tokens.json");
  const mainPageRegistry = readJson("src/design-system/components/main-page.components.json");

  const exportPayload = {
    schema: "https://translateit.local/figma-export.schema.json",
    meta: {
      name: "TranslateIT Figma Export",
      version: "1.0.0",
      source: "TranslateIT RustApp design system",
      generatedBy: "scripts/export_figma_design_system.mjs",
      note: "Import this JSON through the TranslateIT local Figma plugin scaffold or map it with a design-token workflow.",
    },
    variables: buildFigmaVariables(tokens),
    pages: [mainPageRegistry.page],
    components: buildFigmaComponents(tokens, mainPageRegistry),
    safeEditRules: mainPageRegistry.safeEditRules,
  };

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, "translateit.figma-export.json"), `${JSON.stringify(exportPayload, null, 2)}\n`);
  writeFileSync(join(outputDir, "README.md"), `# TranslateIT Figma Export\n\nGenerated export file:\n\n\`\`\`text\nsrc/design-system/figma-export/translateit.figma-export.json\n\`\`\`\n\nUse this payload with the TranslateIT Figma plugin scaffold or a token import workflow.\n\nDo not manually edit generated export files. Edit:\n\n- \`src/design-system/translateit.tokens.json\`\n- \`src/design-system/components/main-page.components.json\`\n- \`src/mainPageLayout.css\`\n\nThen rerun:\n\n\`\`\`text\nnpm run export:figma-design\n\`\`\`\n`);

  console.log(`Figma design system export written to ${join(outputDir, "translateit.figma-export.json")}`);
}

main();
