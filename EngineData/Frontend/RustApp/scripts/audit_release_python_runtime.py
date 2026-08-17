#!/usr/bin/env python3
"""Measure the actual installed bytes owned by a Python site-packages tree."""

from __future__ import annotations

import argparse
import json
from importlib import metadata
from pathlib import Path


def normalize_name(value: str) -> str:
    return value.strip().lower().replace("_", "-")


def file_bytes(path: Path) -> int:
    try:
        return path.stat().st_size if path.is_file() else 0
    except OSError:
        return 0


def collect(site_packages: Path) -> dict[str, object]:
    site_packages = site_packages.resolve()
    if not site_packages.is_dir():
        raise SystemExit(f"site-packages directory missing: {site_packages}")

    all_files = {path.resolve() for path in site_packages.rglob("*") if path.is_file()}
    total_bytes = sum(file_bytes(path) for path in all_files)

    claimed_files: set[Path] = set()
    rows: list[dict[str, object]] = []
    for distribution in metadata.distributions(path=[str(site_packages)]):
        name = distribution.metadata.get("Name") or distribution.name or "unknown"
        version = distribution.version or "unknown"
        owned: set[Path] = set()
        for item in distribution.files or ():
            try:
                candidate = Path(distribution.locate_file(item)).resolve()
                candidate.relative_to(site_packages)
            except (OSError, ValueError):
                continue
            if candidate.is_file():
                owned.add(candidate)
        claimed_files.update(owned)
        rows.append(
            {
                "name": name,
                "normalized_name": normalize_name(name),
                "version": version,
                "bytes": sum(file_bytes(path) for path in owned),
                "files": len(owned),
            }
        )

    rows.sort(key=lambda item: (-int(item["bytes"]), str(item["normalized_name"])))
    claimed_bytes = sum(file_bytes(path) for path in claimed_files)
    unclaimed = all_files - claimed_files
    return {
        "site_packages": str(site_packages),
        "total_bytes": total_bytes,
        "total_files": len(all_files),
        "distribution_count": len(rows),
        "attributed_unique_bytes": claimed_bytes,
        "unattributed_bytes": sum(file_bytes(path) for path in unclaimed),
        "unattributed_files": len(unclaimed),
        "distributions": rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site-packages", required=True)
    parser.add_argument("--label", default="profile")
    parser.add_argument("--json-out", required=True)
    parser.add_argument("--top", type=int, default=30)
    args = parser.parse_args()

    report = collect(Path(args.site_packages))
    output = Path(args.json_out)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")

    print(
        f"[{args.label}] total={report['total_bytes']} bytes "
        f"distributions={report['distribution_count']} files={report['total_files']}"
    )
    for item in report["distributions"][: max(0, args.top)]:
        print(f"[{args.label}] {item['bytes']:>12}  {item['name']}=={item['version']}")
    print(
        f"[{args.label}] unattributed={report['unattributed_bytes']} bytes "
        f"files={report['unattributed_files']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
