import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const appPackage = join(ROOT, "EngineData", "LauncherApp", "RustApp");
const contractsRoot = join(ROOT, "EngineData", "Backend", "RuntimeContracts");
const gapPath = join(appPackage, "RUNTIME_GAP_ESTIMATE.json");
const contractPath = join(contractsRoot, "ATTACHMENT_RUNTIME_CONTRACT.json");
const gap = JSON.parse(readFileSync(gapPath, "utf8"));
const contract = JSON.parse(readFileSync(contractPath, "utf8"));

const payload = {
  schema: "translateit.attachment_status.v3",
  contract_path: "EngineData/Backend/RuntimeContracts/ATTACHMENT_RUNTIME_CONTRACT.json",
  contract_loaded: true,
  supported_text_extensions: contract.supported_extensions,
  max_bytes: contract.max_bytes,
  max_cleaned_characters: contract.max_cleaned_characters,
  unsupported_until_parser_exists: contract.unsupported_until_backend_parser_exists,
  remaining_percent: gap?.remaining?.text_attachment_percent ?? 15,
  ready_for_pdf_docx_claim: contract.success_claim_allowed_for_pdf_docx === true,
  user_message: contract.user_message,
  note: "This reports the current attachment boundary only. It does not parse PDF, DOCX, or binary files."
};

console.log(JSON.stringify(payload, null, 2));
process.exit(0);
