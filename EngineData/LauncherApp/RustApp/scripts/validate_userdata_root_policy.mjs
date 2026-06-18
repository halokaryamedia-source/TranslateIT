import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../../..");
const path = resolve(repoRoot, "EngineData/Backend/RuntimeContracts/USERDATA_ROOT_POLICY_CONTRACT.json");
const errors = [];

if (!existsSync(path)) {
  errors.push("Missing USERDATA_ROOT_POLICY_CONTRACT.json");
} else {
  const contract = JSON.parse(readFileSync(path, "utf8"));
  if (contract.schema !== "translateit.userdata_root_policy_contract.v1") errors.push("Unexpected root policy schema.");
  if (contract.status !== "active_policy") errors.push("Unexpected root policy status.");
  if (contract.roots?.cache_data !== "UserData/CacheData/") errors.push("CacheData root mismatch.");
  if (contract.roots?.saved_project !== "UserData/SavedProject/") errors.push("SavedProject root mismatch.");
  if (contract.feature_roots?.audio_studio?.logs !== "UserData/CacheData/AudioStudio/logs/") errors.push("Audio Studio log root mismatch.");
}

if (errors.length > 0) {
  console.error("UserData root policy validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("UserData root policy validation passed.");
