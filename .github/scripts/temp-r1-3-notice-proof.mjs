import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const fixtureRoot = join(process.env.RUNNER_TEMP, "translateit-r1-3-fixture");
const backendRoot = join(fixtureRoot, "EngineData", "Backend");
const pythonRoot = join(backendRoot, "LocalWorker", "PythonRuntime");
const workerRoot = join(backendRoot, "LocalWorker", "WorkerRuntime");
const voiceRoot = join(backendRoot, "RuntimeAssets", "Voice", "GPTSoVITS", "Source");
const providerRoot = join(backendRoot, "RuntimeAssets", "AudioProvider", "VBCABLE");
for (const path of [pythonRoot, workerRoot, voiceRoot, providerRoot]) mkdirSync(path, { recursive: true });

copyFileSync(process.env.HOST_PYTHON, join(pythonRoot, "python.exe"));
writeFileSync(join(pythonRoot, "LICENSE.txt"), "Python Software Foundation License Version 2\nSynthetic fixture only.\n", "utf8");

const packages = [
  ["g2p-en", "2.1.0", "Apache-2.0", "Apache License\nVersion 2.0\nSynthetic Apache terms fixture.\n"],
  ["frozendict", "2.4.7", "LGPL-3.0-or-later", "GNU LESSER GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007\n"],
  ["soxr", "1.1.0", "LGPL-2.1-or-later", "GNU Lesser General Public License version 2.1 or later\n"],
  ["fsspec", "2026.7.0", "BSD-3-Clause", "BSD 3-Clause License\nCopyright synthetic fixture.\n"],
  ["fixture-mit", "1.0.0", "MIT", "Permission is hereby granted, free of charge, to any person obtaining a copy\n"],
  ["fixture-apache", "1.0.0", "Apache-2.0", "Apache License\nVersion 2.0\nSynthetic fixture.\n"],
];
for (const [name, version, licenseExpression, licenseText] of packages) {
  const dist = join(pythonRoot, `${name.replaceAll("-", "_")}-${version}.dist-info`);
  const licenses = join(dist, "licenses");
  mkdirSync(licenses, { recursive: true });
  writeFileSync(
    join(dist, "METADATA"),
    `Metadata-Version: 2.4\nName: ${name}\nVersion: ${version}\nLicense-Expression: ${licenseExpression}\nProject-URL: Source, https://example.invalid/${name}\n\n`,
    "utf8",
  );
  writeFileSync(join(licenses, "LICENSE.txt"), licenseText, "utf8");
}

writeFileSync(
  join(workerRoot, "model_manifest.json"),
  JSON.stringify({
    schema: "translateit.local_model_inventory.v2",
    inventory_scope: "full_product_release_assets",
    models: [
      {
        model_id: "fixture-required-model",
        required: true,
        repo_id: "example/fixture-model",
        expected_path: "EngineData/Backend/RuntimeAssets/ASR/ModelData/fixture-required-model",
        revision: "fixture-revision",
        license: "mit",
      },
    ],
  }),
  "utf8",
);
writeFileSync(join(voiceRoot, "LICENSE"), "Permission is hereby granted, free of charge, synthetic GPT-SoVITS fixture.\n", "utf8");
writeFileSync(join(voiceRoot, "FFMPEG_LICENSE.txt"), "GNU LESSER GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007\n", "utf8");
writeFileSync(join(voiceRoot, "FFMPEG_SOURCE.txt"), "source_kind=ffmpeg\nlicense_profile=LGPL-3.0-or-later\n", "utf8");
writeFileSync(join(providerRoot, "NOTICE.txt"), "VB-Audio VB-CABLE donationware synthetic fixture notice.\n", "utf8");

const generatorPath = resolve("EngineData/Frontend/RustApp/scripts/generate_third_party_notices.mjs");
const generator = await import(pathToFileURL(generatorPath).href);

const first = generator.buildThirdPartyNoticeBundle({ backendRoot });
const second = generator.buildThirdPartyNoticeBundle({ backendRoot });
if (first.content !== second.content) throw new Error("notice generator is not deterministic");
if (first.packageCount !== 6) throw new Error(`unexpected fixture package count: ${first.packageCount}`);
for (const marker of [
  "fixture-required-model",
  "CMUDICT ATTRIBUTION",
  "FFMPEG LICENSE",
  "FFMPEG SOURCE / BUILD PROVENANCE",
  "VB-CABLE NOTICE",
  "frozendict==2.4.7",
  "soxr==1.1.0",
]) {
  if (!first.content.includes(marker)) throw new Error(`missing generated notice marker: ${marker}`);
}
const written = generator.writeThirdPartyNoticeBundle({ backendRoot });
const actual = readFileSync(written.outputPath, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd() + "\n";
if (actual !== first.content) throw new Error("written notice output differs from deterministic in-memory result");
console.log(`[r1.3] deterministic synthetic bundle -> PASS; packages=${first.packageCount}; unique_materials=${first.uniquePythonMaterialCount}`);

const distance = join(pythonRoot, "distance-0.1.3.dist-info");
mkdirSync(join(distance, "licenses"), { recursive: true });
writeFileSync(join(distance, "METADATA"), "Metadata-Version: 2.4\nName: distance\nVersion: 0.1.3\nLicense-Expression: GPL-2.0-or-later\n\n", "utf8");
writeFileSync(join(distance, "licenses", "LICENSE.txt"), "GNU GENERAL PUBLIC LICENSE\n", "utf8");
let blockedDistance = false;
try {
  generator.buildThirdPartyNoticeBundle({ backendRoot });
} catch (error) {
  blockedDistance = String(error).includes("excluded_distance_distribution_present");
}
if (!blockedDistance) throw new Error("Distance reappearance was not blocked");
rmSync(distance, { recursive: true, force: true });

const missing = join(pythonRoot, "missing_notice-1.0.0.dist-info");
mkdirSync(missing, { recursive: true });
writeFileSync(join(missing, "METADATA"), "Metadata-Version: 2.4\nName: missing-notice\nVersion: 1.0.0\nLicense-Expression: MIT\n\n", "utf8");
let blockedMissing = false;
try {
  generator.buildThirdPartyNoticeBundle({ backendRoot });
} catch (error) {
  blockedMissing = String(error).includes("python_distribution_missing_license_material");
}
if (!blockedMissing) throw new Error("distribution without license material was not blocked");
rmSync(missing, { recursive: true, force: true });

console.log("[r1.3] fail-closed notice boundaries -> PASS");
