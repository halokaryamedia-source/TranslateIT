# Quality

This folder holds the compact validation reference set for TranslateIT.

## Contents

- diagnostics notes and troubleshooting references
- test guidance and manual validation references
- evidence pointers for local checks

## Rules

- Keep executable validation scripts under `DevelopingData/Tooling/Scripts/Execution`.
- Do not add runtime source here.
- Do not add user data, logs, or model files here.
- Keep this folder lean; if a note becomes long-lived source of truth, move it to `DevelopingData/Documentation`.
