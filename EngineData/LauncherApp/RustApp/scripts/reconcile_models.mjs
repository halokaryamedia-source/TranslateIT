import fs from "node:fs";
import path from "node:path";
import { exists, readJson, repoRootFromCwd, sanitizePath } from "./model_paths.mjs";

const root = repoRootFromCwd();
const manifestPath = path.join(root, "EngineData", "Backend", "LocalWorker", "WorkerRuntime", "model_manifest.json");
const scanPath = path.join(root, "UserData", "CacheData", "validation", "latest_existing_model_scan.json");

function load() {
  const manifest = readJson(manifestPath);
  const scan = exists(scanPath) ? readJson(scanPath) : { candidates: [] };
  return { manifest, scan };
}

function chooseCandidate(entry, scan) {
  const expected = sanitizePath(root, path.join(root, entry.expected_path));
  const legacy = (entry.legacy_paths ?? []).map((item) => sanitizePath(root, path.join(root, item)));
  const matches = (scan.candidates ?? []).filter((candidate) => {
    const pathValue = candidate.candidate_path;
    return pathValue === expected || legacy.includes(pathValue) || pathValue.includes(entry.model_id);
  });
  const best = matches.find((candidate) => candidate.marker_count > 0) ?? matches[0] ?? null;
  return best;
}

const { manifest, scan } = load();
const items = (manifest.models ?? []).map((entry) => {
  const candidate = chooseCandidate(entry, scan);
  const mapped = Boolean(candidate?.candidate_path);
  const legacy = candidate ? candidate.candidate_path !== sanitizePath(root, path.join(root, entry.expected_path)) : false;
  return {
    model_id: entry.model_id,
    expected_path: entry.expected_path,
    candidate_path: candidate?.candidate_path ?? null,
    mapped,
    legacy,
    marker_count: candidate?.marker_count ?? 0,
    confidence: candidate?.confidence ?? "none",
    next_action: candidate
      ? legacy
        ? `Create runtime mapping from ${candidate.candidate_path} to ${entry.expected_path}`
        : `Keep ${entry.expected_path} as the runtime path`
      : `No local candidate found for ${entry.model_id}`,
  };
});

const report = {
  schema: "translateit.model_reconcile.v1",
  created_at: new Date().toISOString(),
  items,
  blockers: items.filter((item) => !item.mapped && item.marker_count === 0).map((item) => `unmapped:${item.model_id}`),
};

console.log(JSON.stringify(report, null, 2));
