from __future__ import annotations

import argparse
import datetime as dt
import shutil
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
LOG_DIR = PROJECT_ROOT / "UserData" / "LogData"
LOG_FILE = LOG_DIR / "version_snapshot_latest.txt"

ROOT_EXCLUDES = {".git", "V1", "Experimental", "__pycache__", "New folder"}
COMMON_FILE_SUFFIX_EXCLUDES = {".pyc", ".pyo"}
EXPERIMENTAL_EXCLUDE = Path("DevelopingData") / "SamplingData"


def stamp() -> str:
    return dt.datetime.now().strftime("%Y%m%d_%H%M%S")


def log(line: str) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as handle:
        handle.write(f"[{dt.datetime.now().isoformat(timespec='seconds')}] {line}\n")


def backup_path(name: str) -> Path:
    return PROJECT_ROOT / f"{name}_Backup_{stamp()}"


def move_to_backup(name: str) -> Path | None:
    target = PROJECT_ROOT / name
    if not target.exists():
        log(f"INFO: no_existing_{name.lower()}_to_backup")
        return None
    backup = backup_path(name)
    while backup.exists():
        backup = backup_path(name)
    shutil.move(str(target), str(backup))
    log(f"INFO: backed_up_{name.lower()} | {backup}")
    return backup


def _robocopy(source: Path, dest: Path, extra_xd: list[str]) -> tuple[int, str]:
    dest.mkdir(parents=True, exist_ok=True)
    cmd = [
        "robocopy",
        str(source),
        str(dest),
        "/MIR",
        "/R:1",
        "/W:1",
        "/NFL",
        "/NDL",
        "/NJH",
        "/NJS",
        "/NP",
    ]
    excluded_dirs = sorted(ROOT_EXCLUDES | set(extra_xd))
    if excluded_dirs:
        cmd.append("/XD")
        for folder in excluded_dirs:
            cmd.append(str(source / folder) if "\\" not in folder and "/" not in folder else folder)
    for suffix in sorted(COMMON_FILE_SUFFIX_EXCLUDES):
        cmd.extend(["/XF", f"*{suffix}"])
    completed = subprocess.run(cmd, capture_output=True, text=True, shell=False)
    output = (completed.stdout or "") + (completed.stderr or "")
    return completed.returncode, output.strip()


def copy_root_snapshot(dest_name: str, experimental: bool = False) -> tuple[Path, int, str]:
    source = PROJECT_ROOT
    dest = PROJECT_ROOT / dest_name
    if dest.exists():
        raise RuntimeError(f"Destination already exists: {dest}")
    extra_excludes: list[str] = [str(EXPERIMENTAL_EXCLUDE)] if experimental else []
    code, output = _robocopy(source, dest, extra_excludes)
    return dest, code, output


def summarize_tree(path: Path) -> dict[str, bool]:
    return {
        "exists": path.exists(),
        "has_git": (path / ".git").exists(),
        "has_v1": (path / "V1").exists(),
        "has_experimental": (path / "Experimental").exists(),
        "has_samplingdata": (path / "DevelopingData" / "SamplingData").exists(),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Create V1 and Experimental version snapshots.")
    parser.add_argument("--log-only", action="store_true", help="Only write log header and exit.")
    args = parser.parse_args()

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    LOG_FILE.write_text("", encoding="utf-8")
    log(f"INFO: project_root={PROJECT_ROOT}")
    log(f"INFO: source_tree={summarize_tree(PROJECT_ROOT)}")

    if args.log_only:
        return 0

    backups = {}
    for name in ("V1", "Experimental"):
        backups[name] = move_to_backup(name)

    v1_dest = PROJECT_ROOT / "V1"
    exp_dest = PROJECT_ROOT / "Experimental"

    if v1_dest.exists():
        shutil.rmtree(v1_dest)
    if exp_dest.exists():
        shutil.rmtree(exp_dest)

    v1_dest, v1_code, v1_output = copy_root_snapshot("V1", experimental=False)
    log(f"INFO: v1_robocopy_exit={v1_code}")
    if v1_output:
        log(f"INFO: v1_robocopy_output={v1_output[:2000]}")

    exp_dest, exp_code, exp_output = copy_root_snapshot("Experimental", experimental=True)
    log(f"INFO: experimental_robocopy_exit={exp_code}")
    if exp_output:
        log(f"INFO: experimental_robocopy_output={exp_output[:2000]}")

    v1_summary = summarize_tree(v1_dest)
    exp_summary = summarize_tree(exp_dest)
    log(f"INFO: v1_summary={v1_summary}")
    log(f"INFO: experimental_summary={exp_summary}")
    log(f"INFO: backups={backups}")

    v1_ok = v1_dest.exists() and not (v1_dest / ".git").exists() and not (v1_dest / "V1").exists() and not (v1_dest / "Experimental").exists()
    exp_ok = exp_dest.exists() and not (exp_dest / ".git").exists() and not (exp_dest / "V1").exists() and not (exp_dest / "Experimental").exists() and not (exp_dest / "DevelopingData" / "SamplingData").exists()
    if not v1_ok or not exp_ok:
        log("ERROR: verification_failed")
        return 1

    log("PASS: version snapshots created successfully")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
