# DesignIT External Assets and Local-Only Files

This repository does not store generated render payloads, local debug artifacts, backup files, or large AI/model weights.

Active branch:

TranslateIT/translateit-clean-engine

Generated local-only folder:

DevelopingData/DesignIT/Tooling/

This folder is for local generated outputs such as phase JSON, verify JSON, render payloads, summaries, previews, screenshots, and temporary debugging output.

Visual preview output folder:

DevelopingData/DesignIT/Tooling/VisualOutput/

External/vendor locations:

DevelopingData/DesignIT/_vendor/ai/GroundingDINO
DevelopingData/DesignIT/_vendor/ai/OmniParser
DevelopingData/DesignIT/_vendor/ai/PaddleOCR
DevelopingData/DesignIT/_vendor/ai/sam2
DevelopingData/DesignIT/_vendor/references/figma-html

If these are Git submodules, restore them after clone or pull with:

git submodule update --init --recursive

Large model weights are intentionally not stored in normal Git. Keep them local or download them again according to each vendor project.

Ignored model file types include:

*.pt, *.pth, *.onnx, *.ckpt, *.safetensors, *.bin, *.gguf, *.pkl, *.h5, *.pb, *.tflite

After pulling fresh repository, run dependency install as needed, for example:

Set-Location -LiteralPath "DevelopingData\DesignIT\RenderBridge"
npm.cmd install
