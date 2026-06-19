import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.cwd(), "..", "..", "..");
const manifestPath = path.join(root, "EngineData", "Backend", "LocalWorker", "WorkerRuntime", "model_manifest.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function countFiles(targetPath) {
  if (!fs.existsSync(targetPath)) return { count: 0, bytes: 0 };
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return { count: 1, bytes: stat.size };
  let count = 0;
  let bytes = 0;
  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    const child = path.join(targetPath, entry.name);
    const childStat = fs.statSync(child);
    if (entry.isFile()) {
      count += 1;
      bytes += childStat.size;
    }
  }
  return { count, bytes };
}

function resolveModelItem(entry) {
  const expectedPath = path.join(root, entry.expected_path);
  const found = fs.existsSync(expectedPath);
  const { count, bytes } = countFiles(expectedPath);
  const status = found ? "PASS" : entry.download_url ? "PARTIAL" : entry.required ? "BLOCKED" : "PARTIAL";
  return {
    model_id: entry.model_id,
    required: Boolean(entry.required),
    expected_path: entry.expected_path,
    found,
    file_count: count,
    size_bytes: bytes,
    gpu_capable: typeof entry.gpu_capable === "boolean" ? entry.gpu_capable : "unknown",
    cpu_fallback: Boolean(entry.cpu_fallback),
    download_url: entry.download_url ?? null,
    status,
    blocker: found ? null : (entry.download_url ? `missing_model:${entry.model_id}` : `download_source_missing:${entry.model_id}`),
    next_action: found
      ? "Model present"
      : entry.download_url
        ? `Download and place ${entry.model_id} in ${entry.expected_path}`
        : `Define download URL or place ${entry.model_id} in ${entry.expected_path}`,
  };
}

function writeReport(report, fileName) {
  const outDir = path.join(root, "UserData", "CacheData", "validation");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(report, null, 2));
}

export function run() {
  if (!fs.existsSync(manifestPath)) {
    const report = {
      ok: false,
      status: "BLOCKED",
      created_at: new Date().toISOString(),
      items: [],
      blockers: ["model_manifest_missing"],
      note: "Model manifest is missing. Add WorkerRuntime/model_manifest.json first.",
    };
    writeReport(report, "latest_model_inventory.json");
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 2;
    return report;
  }

  const manifest = readJson(manifestPath);
  const items = (manifest.models ?? []).map(resolveModelItem);
  const blockers = items.filter((item) => item.status === "BLOCKED" && item.required).map((item) => `missing_required_model:${item.model_id}`);
  const status = blockers.length ? "BLOCKED" : items.some((item) => item.status === "PARTIAL") ? "PARTIAL" : "PASS";
  const report = {
    ok: blockers.length === 0,
    status,
    created_at: new Date().toISOString(),
    items,
    blockers,
    note: blockers.length
      ? "One or more required models are missing or have no download URL."
      : "Required model inventory is complete.",
  };
  writeReport(report, "latest_model_inventory.json");
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = status === "PASS" ? 0 : status === "PARTIAL" ? 2 : 1;
  return report;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  run();
}
