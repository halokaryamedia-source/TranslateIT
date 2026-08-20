#!/usr/bin/env python3
"""Static governance contract for TranslateIT.

This gate protects repository routing, ownership separation, active-continuation
shape, GitHub discipline, and skill inventory. It does not prove frontend/Rust/
Python runtime behavior, Windows devices/audio, model quality, installer success,
or clean-machine acceptance.
"""

from __future__ import annotations

import py_compile
import re
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]

CANONICAL_SKILLS = {
    "development-brief",
    "desktop-runtime-development",
    "desktop-ui-design-development",
    "local-ai-runtime-development",
    "release-packaging-development",
    "windows-audio-runtime-development",
}

REQUIRED_PATHS = [
    "AGENTS.md",
    "GITHUB_RULES.md",
    "CONTEXT.md",
    "README.md",
    "docs/knowledge/flow.md",
    "docs/knowledge/next-action.md",
    "docs/knowledge/source-ownership.md",
    "docs/knowledge/decision-log.md",
    "docs/knowledge/skills/activation-matrix.md",
    "docs/knowledge/skills/skill-map.md",
    ".agents/skills/development-brief/SKILL.md",
    ".github/workflows/repository-verify.yml",
    "tools/verify_repository.py",
]

RETIRED_ACTIVE_PATHS = [
    "docs/knowledge/minimal-nav.md",
    "docs/knowledge/flows/development-flow.md",
    "EngineData/Backend/LocalWorker/WorkerRuntime/migrated_python_helper_map.json",
]

ACTIVE_GOVERNANCE_FILES = [
    "AGENTS.md",
    "GITHUB_RULES.md",
    "CONTEXT.md",
    "README.md",
    "docs/knowledge/flow.md",
    "docs/knowledge/next-action.md",
    "docs/knowledge/source-ownership.md",
    ".agents/skills/development-brief/SKILL.md",
    "docs/knowledge/skills/activation-matrix.md",
    "docs/knowledge/skills/skill-map.md",
]

SIZE_LIMITS = {
    "AGENTS.md": 12_000,
    "GITHUB_RULES.md": 20_000,
    "CONTEXT.md": 12_000,
    "README.md": 8_000,
    "docs/knowledge/next-action.md": 7_000,
    "docs/knowledge/source-ownership.md": 12_000,
    # decision-log.md is durable historical reasoning, not compact active state.
    "docs/knowledge/decision-log.md": 40_000,
    ".agents/skills/development-brief/SKILL.md": 8_000,
}

LINK_RE = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def check_required_paths(errors: list[str]) -> None:
    for rel in REQUIRED_PATHS:
        if not (ROOT / rel).is_file():
            fail(errors, f"missing required governance owner: {rel}")


def check_retired_paths(errors: list[str]) -> None:
    for rel in RETIRED_ACTIVE_PATHS:
        if (ROOT / rel).exists():
            fail(errors, f"retired duplicate/migration owner must stay absent: {rel}")


def check_skill_inventory(errors: list[str]) -> None:
    skill_root = ROOT / ".agents" / "skills"
    if not skill_root.is_dir():
        fail(errors, "missing canonical .agents/skills root")
        return

    actual = {
        path.name
        for path in skill_root.iterdir()
        if path.is_dir() and not path.name.startswith(".")
    }
    if actual != CANONICAL_SKILLS:
        fail(
            errors,
            "canonical TranslateIT skill set drift: "
            f"expected {sorted(CANONICAL_SKILLS)}, got {sorted(actual)}",
        )

    for skill in sorted(CANONICAL_SKILLS):
        if not (skill_root / skill / "SKILL.md").is_file():
            fail(errors, f"missing SKILL.md for canonical skill: {skill}")

    for path in ROOT.glob("**/.agents/skills"):
        if path.resolve() != skill_root.resolve():
            fail(errors, f"unexpected nested repository skill root: {path.relative_to(ROOT)}")


def check_size_budgets(errors: list[str]) -> None:
    for rel, limit in SIZE_LIMITS.items():
        path = ROOT / rel
        if path.is_file():
            size = len(path.read_text(encoding="utf-8"))
            if size >= limit:
                fail(errors, f"{rel} is too large for its owned responsibility: {size} >= {limit}")


def check_github_rules(errors: list[str]) -> None:
    path = ROOT / "GITHUB_RULES.md"
    if not path.is_file():
        return
    text = read("GITHUB_RULES.md")

    for marker in (
        "PIN",
        "READ MINIMUM",
        "DIAGNOSE",
        "TOOL FIT",
        "WRITE ONCE",
        "VERIFY MINIMUM",
        "STOP",
        "# Conditional GitHub Surfaces",
        "## API failures, pagination, rate limits, and ambiguous mutations",
        "## Special files, Git LFS, binaries, submodules, and generated artifacts",
        "## Pull requests, branch protection, rulesets, reviews, and merge queues",
        "## GitHub Actions and hosted proof",
        "## Sensitive data, releases, and deployment environments",
        "Same-cause retry budget",
        "Do not create temporary/one-use workflows",
        "Static source/CI evidence proves only what it exercises",
    ):
        if marker not in text:
            fail(errors, f"GITHUB_RULES.md missing required contract marker: {marker}")

    for code in ("401", "403", "404", "409", "422", "429", "5xx"):
        if code not in text:
            fail(errors, f"GITHUB_RULES.md missing API failure class: {code}")

    if "`Local` is the current development authority" not in text:
        fail(errors, "GITHUB_RULES.md must pin Local as current development authority")
    if "`Developing` remains the GitHub default branch" not in text:
        fail(errors, "GITHUB_RULES.md must preserve Developing as GitHub default branch")
    if "retained historical/recovery evidence" not in text:
        fail(errors, "GITHUB_RULES.md must classify Developing as historical/recovery evidence")


def check_agents(errors: list[str]) -> None:
    path = ROOT / "AGENTS.md"
    if not path.is_file():
        return
    text = read("AGENTS.md")
    for marker in (
        "### Observe / recover context",
        "### Plan",
        "### Non-trivial Developing",
        "### Bounded Maintenance",
        "GITHUB_RULES.md Core Rules",
        "→ STOP",
        "development-brief",
        "at most one",
        "`Local` is the current development authority",
        "`Developing` remains the GitHub default branch",
    ):
        if marker not in text:
            fail(errors, f"AGENTS.md missing routing marker: {marker}")
    if "Do **not** edit, run CI" not in text:
        fail(errors, "AGENTS.md must keep observe/recover requests read-only")


def check_active_owner_branch_language(errors: list[str]) -> None:
    for rel in ACTIVE_GOVERNANCE_FILES:
        path = ROOT / rel
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        if "V1-Advance" in text:
            fail(errors, f"active governance owner still references deleted V1-Advance branch: {rel}")
        if "`New`" in text or re.search(r"(?m)^New\s+→", text):
            fail(errors, f"active governance owner still references renamed New branch: {rel}")


def check_next_action(errors: list[str]) -> None:
    path = ROOT / "docs" / "knowledge" / "next-action.md"
    if not path.is_file():
        return
    text = path.read_text(encoding="utf-8")
    if text.count("## Next Step") != 1:
        fail(errors, "next-action.md must contain exactly one '## Next Step'")
    for heading in ("## Current Status", "## Active Boundary", "## Next Step"):
        if heading not in text:
            fail(errors, f"next-action.md missing required heading: {heading}")
    if "Local" not in text or "Developing" not in text:
        fail(errors, "next-action.md must preserve current Local/Developing branch authority")
    if "R3" not in text or "packaging" not in text.lower():
        fail(errors, "next-action.md must preserve the active R3 packaging decision boundary")


def check_ownership_shape(errors: list[str]) -> None:
    path = ROOT / "docs" / "knowledge" / "source-ownership.md"
    if not path.is_file():
        return
    text = path.read_text(encoding="utf-8")
    if "Current status" in text or "| Current status |" in text:
        fail(errors, "source-ownership.md must not carry active milestone/status fields")
    for marker in (
        "GITHUB_RULES.md",
        "AGENTS.md",
        "next-action.md",
        "decision-log.md",
        "tools/verify_repository.py",
    ):
        if marker not in text:
            fail(errors, f"source-ownership.md missing governance owner marker: {marker}")


def check_readme(errors: list[str]) -> None:
    path = ROOT / "README.md"
    if not path.is_file():
        return
    text = path.read_text(encoding="utf-8")
    for marker in (
        "branch `Local`",
        "Meeting",
        "Text",
        "VoiceLab",
        "Settings",
        "GITHUB_RULES.md",
        "R3",
        "packaging-boundary decision",
    ):
        if marker not in text:
            fail(errors, f"README.md missing current orientation marker: {marker}")
    for retired in (
        "Push to Talk remains",
        "### Secondary — Document Translation",
        "### Advanced — Audio Studio",
        "Translation modes | `Realtime` and `Quality`",
    ):
        if retired in text:
            fail(errors, f"README.md still presents retired product direction: {retired}")


def normalize_link_target(source: Path, raw: str) -> Path | None:
    target = raw.strip().strip("<>")
    if not target:
        return None
    lower = target.lower()
    if (
        target.startswith("#")
        or "://" in target
        or lower.startswith(("mailto:", "tel:", "data:", "skills:", "sandbox:"))
    ):
        return None
    target = unquote(target.split("#", 1)[0].split("?", 1)[0]).strip()
    if not target:
        return None
    if target.startswith("/"):
        return ROOT / target.lstrip("/")
    return source.parent / target


def check_governance_links(errors: list[str]) -> None:
    for rel in ACTIVE_GOVERNANCE_FILES:
        path = ROOT / rel
        if not path.is_file():
            continue
        for raw in LINK_RE.findall(path.read_text(encoding="utf-8")):
            target = normalize_link_target(path, raw)
            if target is not None and not target.resolve().exists():
                fail(errors, f"broken relative governance link in {rel}: {raw}")


def check_workflow(errors: list[str]) -> None:
    workflows = ROOT / ".github" / "workflows"
    if not workflows.is_dir():
        fail(errors, "missing .github/workflows")
        return
    temp = sorted(path.name for path in workflows.glob("temp-*"))
    if temp:
        fail(errors, f"temporary one-use workflows are not allowed: {temp}")

    path = workflows / "repository-verify.yml"
    if not path.is_file():
        return
    text = path.read_text(encoding="utf-8")
    for marker in (
        "branches:\n      - Local",
        "cancel-in-progress: true",
        "contents: read",
        '"GITHUB_RULES.md"',
        '"docs/knowledge/**"',
        '"tools/verify_repository.py"',
        "python tools/verify_repository.py",
    ):
        if marker not in text:
            fail(errors, f"repository-verify.yml missing required marker: {marker}")
    if "      - Developing" not in text:
        fail(errors, "repository-verify.yml must retain Developing as a PR base verification target")
    for forbidden in ("contents: write", "pull-requests: write", "git push", "continue-on-error"):
        if forbidden in text:
            fail(errors, f"repository-verify.yml contains forbidden verification behavior: {forbidden}")


def check_python_syntax(errors: list[str]) -> None:
    path = ROOT / "tools" / "verify_repository.py"
    if not path.is_file():
        return
    try:
        py_compile.compile(str(path), doraise=True)
    except py_compile.PyCompileError as exc:
        fail(errors, f"repository verifier syntax error: {exc.msg}")


def main() -> int:
    errors: list[str] = []
    check_required_paths(errors)
    check_retired_paths(errors)
    check_skill_inventory(errors)
    check_size_budgets(errors)
    check_github_rules(errors)
    check_agents(errors)
    check_active_owner_branch_language(errors)
    check_next_action(errors)
    check_ownership_shape(errors)
    check_readme(errors)
    check_governance_links(errors)
    check_workflow(errors)
    check_python_syntax(errors)

    if errors:
        print("REPOSITORY VERIFY FAILED")
        for error in errors:
            print(f"- {error}")
        return 1

    print("REPOSITORY VERIFY PASSED")
    print(f"- canonical skills: {', '.join(sorted(CANONICAL_SKILLS))}")
    print("- working authority: Local")
    print("- GitHub default/recovery branch: Developing")
    print("- GitHub Core Rules: present")
    print("- active continuation: compact / one Next Step")
    print("- source ownership: responsibility-only")
    print("- retired migration-map guard: active")
    print("- repository verification workflow: read-only")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
