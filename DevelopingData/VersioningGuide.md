# TranslateIT Versioning Guide

## Root workspace

The current project root is the active working source. It holds the live engine, launcher, logs, and documentation used during development.

## V1

`V1` is the stable safe-point snapshot.

- It is meant as the fallback version if future development breaks the active workspace.
- It should mirror the current project state as closely as possible.
- It keeps the full reference data, including `DevelopingData/SamplingData` when present in the source.

## Experimental

`Experimental` is the active development snapshot.

- Future development work should happen here.
- It should match the current project structure except for `DevelopingData/SamplingData`, which is excluded.
- It should not contain `.git`, nested `V1`, or nested `Experimental`.

## Backup rule

Before refreshing `V1` or `Experimental`, the existing folder is renamed with a timestamped backup name.

## Recovery rule

If the active development snapshot breaks, compare against `V1` or restore from the latest timestamped backup.

## Logging

Snapshot creation writes a verification log to:

- `UserData/LogData/version_snapshot_latest.txt`
