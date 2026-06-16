import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const marker = `${String.fromCharCode(33)}important`;

const files = [
  "src/styles.css",
  "src/referenceLayout.css",
  "src/professionalUi.css",
  "src/settingsLayout.css",
  "src/launcherGuard.css",
];

const allowed = new Map([
  ["src/styles.css", [`.is-hidden { display: none ${marker}; }`]],
]);

const findings = [];

for (const file of files) {
  const content = readFileSync(join(root, file), "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (!line.includes(marker)) return;
    const permitted = allowed.get(file)?.some((token) => line.trim() === token);
    if (!permitted) findings.push(`${file}:${index + 1}: ${line.trim()}`);
  });
}

if (findings.length > 0) {
  console.error("CSS priority override audit failed. Remove or document these declarations:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("CSS priority override audit passed. Only documented compatibility utility remains.");
