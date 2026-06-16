import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const gapPath = join(ROOT, "EngineData", "LauncherApp", "RustApp", "RUNTIME_GAP_ESTIMATE.json");
const gap = JSON.parse(readFileSync(gapPath, "utf8"));

const payload = {
  schema: "translateit.attachment_status.v1",
  supported_text_extensions: [".txt", ".md", ".json", ".csv"],
  max_bytes: 65536,
  max_cleaned_characters: 2000,
  unsupported_until_parser_exists: [".pdf", ".docx", "binary"],
  remaining_percent: gap?.remaining?.text_attachment_percent ?? 15,
  ready_for_pdf_docx_claim: false,
  note: "This reports the current attachment boundary only. It does not parse PDF, DOCX, or binary files."
};

console.log(JSON.stringify(payload, null, 2));
process.exit(0);
