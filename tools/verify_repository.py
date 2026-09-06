from __future__ import annotations

import py_compile
import re
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_PATHS = (
    "README.md",
    "AGENTS.md",
    "GITHUB_RULES.md",
    "CONTEXT.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    ".editorconfig",
    ".gitattributes",
    ".gitignore",
    ".github/CODEOWNERS",
    ".github/PULL_REQUEST_TEMPLATE.md",
    ".github/workflows/repository-verify.yml",
    ".github/workflows/code-health.yml",
    ".github/workflows/milmmt-repo-contract.yml",
    ".github/workflows/workerruntime-lock.yml",
    ".github/workflows/release-payload-verify.yml",
    ".github/workflows/stable-release-verify.yml",
    "docs/foundation/01-product-overview.md",
    "docs/foundation/02-product-requirements.md",
    "docs/foundation/03-acceptance-scenarios.md",
    "docs/knowledge/README.md",
    "docs/knowledge/flow.md",
    "docs/knowledge/next-action.md",
    "docs/knowledge/current-validation.md",
    "docs/knowledge/source-ownership.md",
    "docs/knowledge/decision-log.md",
    "docs/knowledge/decisions/README.md",
    "docs/knowledge/decisions/history-legacy.md",
    "docs/knowledge/operations/README.md",
    "docs/knowledge/skills/activation-matrix.md",
    "docs/knowledge/skills/skill-map.md",
    ".agents/skills/development-brief/SKILL.md",
    ".agents/skills/desktop-runtime-development/SKILL.md",
    ".agents/skills/desktop-ui-design-development/SKILL.md",
    ".agents/skills/local-ai-runtime-development/SKILL.md",
    ".agents/skills/windows-audio-runtime-development/SKILL.md",
    ".agents/skills/release-packaging-development/SKILL.md",
)

ACTIVE_GOVERNANCE = (
    "README.md",
    "AGENTS.md",
    "GITHUB_RULES.md",
    "CONTEXT.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "docs/foundation/01-product-overview.md",
    "docs/foundation/02-product-requirements.md",
    "docs/foundation/03-acceptance-scenarios.md",
    "docs/knowledge/README.md",
    "docs/knowledge/flow.md",
    "docs/knowledge/next-action.md",
    "docs/knowledge/current-validation.md",
    "docs/knowledge/source-ownership.md",
    "docs/knowledge/decision-log.md",
    "docs/knowledge/decisions/README.md",
    "docs/knowledge/operations/README.md",
    "docs/knowledge/skills/activation-matrix.md",
    "docs/knowledge/skills/skill-map.md",
)

CANONICAL_SKILLS = {
    "development-brief",
    "desktop-runtime-development",
    "desktop-ui-design-development",
    "local-ai-runtime-development",
    "windows-audio-runtime-development",
    "release-packaging-development",
}

LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
ACTION_RE = re.compile(r"(?m)^\s*uses:\s+([^@\s]+)@([^\s#]+)(?:\s+#\s*(.+))?$")
SHA40_RE = re.compile(r"^[0-9a-f]{40}$")


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def text(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def check_required_paths(errors: list[str]) -> None:
    for rel in REQUIRED_PATHS:
        if not (ROOT / rel).is_file():
            fail(errors, f"missing required path: {rel}")
    if (ROOT / "DevelopingData").exists():
        fail(errors, "DevelopingData must not remain in the active working tree; use Git history for recovery")


def check_skill_inventory(errors: list[str]) -> None:
    root = ROOT / ".agents" / "skills"
    if not root.is_dir():
        fail(errors, "missing .agents/skills")
        return
    actual = {p.name for p in root.iterdir() if p.is_dir() and (p / "SKILL.md").is_file()}
    if actual != CANONICAL_SKILLS:
        fail(errors, f"canonical skill inventory mismatch: expected={sorted(CANONICAL_SKILLS)} actual={sorted(actual)}")


def check_size_budgets(errors: list[str]) -> None:
    budgets = {
        "AGENTS.md": 14_000,
        "GITHUB_RULES.md": 26_000,
        "CONTEXT.md": 9_000,
        "docs/knowledge/next-action.md": 3_000,
        "docs/knowledge/current-validation.md": 7_000,
        "docs/knowledge/source-ownership.md": 9_000,
    }
    for rel, maximum in budgets.items():
        path = ROOT / rel
        if path.is_file() and path.stat().st_size > maximum:
            fail(errors, f"{rel} exceeds compactness budget: {path.stat().st_size} > {maximum}")


def check_branch_authority(errors: list[str]) -> None:
    for rel in ("README.md", "AGENTS.md", "GITHUB_RULES.md", "CONTEXT.md", "CONTRIBUTING.md"):
        if not (ROOT / rel).is_file():
            continue
        value = text(rel)
        if "Local" not in value or "main" not in value:
            fail(errors, f"{rel} must state Local/main authority")
        for stale in (
            "Developing remains the GitHub default branch",
            "GitHub default/recovery branch: Developing",
            "retain Developing as a PR base",
        ):
            if stale in value:
                fail(errors, f"{rel} contains stale branch authority: {stale}")
    rules = text("GITHUB_RULES.md") if (ROOT / "GITHUB_RULES.md").is_file() else ""
    for marker in (
        "EXHAUST REMOTE_GITHUB PARTITION",
        "Execution context / proof ceiling",
        "GitHub-first execution partition",
        "TOOL + TRANSFER GATE",
        "Failure / retry matrix",
        "Interrupted delivery",
        "TARGET_WINDOWS",
    ):
        if marker not in rules:
            fail(errors, f"GITHUB_RULES.md missing modern operating marker: {marker}")


def check_agents(errors: list[str]) -> None:
    value = text("AGENTS.md")
    for marker in (
        "Execution Context Gate",
        "Bounded Maintenance",
        "Standard Development",
        "Complex / Ambiguous Development",
        "Forbidden Proxy / Non-Goal",
        "current-validation.md",
        "TARGET_WINDOWS",
    ):
        if marker not in value:
            fail(errors, f"AGENTS.md missing routing marker: {marker}")


def check_next_action(errors: list[str]) -> None:
    value = text("docs/knowledge/next-action.md")
    for heading in ("## Current Status", "## Active Boundary", "## Next Step"):
        if value.count(heading) != 1:
            fail(errors, f"next-action.md must contain exactly one {heading}")
    for marker in ("V1-Advance", "Developing` remains", "Start built-in voices integration"):
        if marker in value:
            fail(errors, f"next-action.md contains stale continuation marker: {marker}")


def check_current_validation(errors: list[str]) -> None:
    value = text("docs/knowledge/current-validation.md")
    for marker in ("## Current Source Proof", "## Verification surfaces", "## Proof Boundaries", "## Target Windows"):
        if marker not in value:
            fail(errors, f"current-validation.md missing section: {marker}")
    if "one SHA does not prove another SHA" not in value:
        fail(errors, "current-validation.md must preserve exact-SHA evidence discipline")


def check_foundation(errors: list[str]) -> None:
    overview = text("docs/foundation/01-product-overview.md")
    requirements = text("docs/foundation/02-product-requirements.md")
    acceptance = text("docs/foundation/03-acceptance-scenarios.md")
    for marker in ("Built-in Male/Female", "last 3 committed own-voice", "incoming remains context-free", "Svelte 5"):
        if marker not in overview:
            fail(errors, f"product overview missing current marker: {marker}")
    for stale in (
        "PR-045 — No automatic conversation context initially",
        "-> trained English Voice Actor TTS",
        "including the trained Voice Actor TTS stage",
        "trained Voice Actor before Meeting",
    ):
        if stale in requirements:
            fail(errors, f"product requirements retain superseded contract: {stale}")
    for marker in (
        "PR-045 — Context asymmetry",
        "selected Meeting voice (Built-in or approved My Voice)",
        "PR-119 — Selected Meeting voice",
        "CC-BY-4.0",
    ):
        if marker not in requirements:
            fail(errors, f"product requirements missing current contract: {marker}")
    if "does **not** store run outcomes" not in acceptance:
        fail(errors, "acceptance scenarios must be outcome-free policy")
    if "a selected built-in or approved My Voice" not in acceptance:
        fail(errors, "acceptance scenarios must allow built-in day-one Meeting readiness")
    for stale in ("green on CUDA", "A1–A5 and A6 green", "without approved My Voice"):
        if stale in acceptance:
            fail(errors, f"acceptance scenarios contain stale outcome/contract: {stale}")


def check_skill_freshness(errors: list[str]) -> None:
    files = {
        "desktop-runtime": text(".agents/skills/desktop-runtime-development/SKILL.md"),
        "desktop-ui": text(".agents/skills/desktop-ui-design-development/SKILL.md"),
        "local-ai": text(".agents/skills/local-ai-runtime-development/SKILL.md"),
        "windows-audio": text(".agents/skills/windows-audio-runtime-development/SKILL.md"),
    }
    stale_markers = {
        "desktop-runtime": ("Until migration actually starts", "current vanilla TypeScript source remains"),
        "desktop-ui": ("Until the Svelte migration is actually implemented",),
        "local-ai": ("`Realtime` and `Quality` are the canonical modes", "mode, tone"),
        "windows-audio": ("Push-to-Talk capture mechanics", "Session Listening and Push-to-Talk"),
    }
    for owner, markers in stale_markers.items():
        for marker in markers:
            if marker in files[owner]:
                fail(errors, f"{owner} skill retains stale semantic contract: {marker}")


def normalize_link_target(source: Path, raw: str) -> Path | None:
    target = raw.strip().strip("<>")
    if not target:
        return None
    lower = target.lower()
    if target.startswith("#") or "://" in target or lower.startswith(("mailto:", "tel:", "data:", "skills:", "sandbox:")):
        return None
    target = unquote(target.split("#", 1)[0].split("?", 1)[0]).strip()
    if not target:
        return None
    return ROOT / target.lstrip("/") if target.startswith("/") else source.parent / target


def check_governance_links(errors: list[str]) -> None:
    for rel in ACTIVE_GOVERNANCE:
        path = ROOT / rel
        if not path.is_file():
            continue
        for raw in LINK_RE.findall(path.read_text(encoding="utf-8")):
            target = normalize_link_target(path, raw)
            if target is not None and not target.resolve().exists():
                fail(errors, f"broken relative governance link in {rel}: {raw}")


def check_workflow_supply_chain(errors: list[str]) -> None:
    root = ROOT / ".github" / "workflows"
    if not root.is_dir():
        fail(errors, "missing .github/workflows")
        return
    temp = sorted(p.name for p in root.glob("temp-*"))
    if temp:
        fail(errors, f"temporary workflows are forbidden: {temp}")
    for path in sorted(root.glob("*.yml")):
        value = path.read_text(encoding="utf-8")
        for action, revision, note in ACTION_RE.findall(value):
            if action.startswith("./"):
                continue
            if not SHA40_RE.fullmatch(revision):
                fail(errors, f"{path.name} uses mutable action ref: {action}@{revision}")
            if not note.strip().startswith("v"):
                fail(errors, f"{path.name} action pin missing version comment: {action}@{revision}")
        if "actions/checkout@" in value and "persist-credentials: false" not in value:
            fail(errors, f"{path.name} checkout must disable persisted credentials")
        if "timeout-minutes:" not in value:
            fail(errors, f"{path.name} must have bounded job timeout")
        for forbidden in ("contents: write", "pull-requests: write", "git push", "pull_request_target"):
            if forbidden in value:
                fail(errors, f"{path.name} contains forbidden verification behavior: {forbidden}")


def check_workflow_routing(errors: list[str]) -> None:
    repository = text(".github/workflows/repository-verify.yml")
    stable = text(".github/workflows/stable-release-verify.yml")
    if "- Developing" in repository:
        fail(errors, "Repository Verify must not target nonexistent Developing branch")
    for marker in ("- Local", "- main", "python tools/verify_repository.py"):
        if marker not in repository:
            fail(errors, f"Repository Verify missing marker: {marker}")
    for marker in (
        "name: Stable Release Gate",
        "branches:\n      - main",
        "github.head_ref",
        '"Local"',
        "python tools/verify_repository.py",
        "npm run build:frontend",
        "cargo check --locked",
    ):
        if marker not in stable:
            fail(errors, f"Stable Release Gate missing marker: {marker}")


def check_decision_boundary(errors: list[str]) -> None:
    current = text("docs/knowledge/decisions/README.md")
    legacy = text("docs/knowledge/decision-log.md")
    for marker in ("Local working authority", "main stable/default authority", "D-035", "CC-BY-4.0"):
        if marker not in current:
            fail(errors, f"current decision register missing marker: {marker}")
    if "historical evidence" not in legacy:
        fail(errors, "decision-log compatibility pointer must mark legacy content historical")


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
    check_skill_inventory(errors)
    check_size_budgets(errors)
    check_branch_authority(errors)
    check_agents(errors)
    check_next_action(errors)
    check_current_validation(errors)
    check_foundation(errors)
    check_skill_freshness(errors)
    check_governance_links(errors)
    check_workflow_supply_chain(errors)
    check_workflow_routing(errors)
    check_decision_boundary(errors)
    check_python_syntax(errors)
    if errors:
        print("REPOSITORY VERIFY FAILED")
        for error in errors:
            print(f"- {error}")
        return 1
    print("REPOSITORY VERIFY PASSED")
    print("- working authority: Local")
    print("- stable/default authority: main")
    print("- execution contexts: REMOTE_GITHUB | LOCAL_CODE | TARGET_WINDOWS")
    print(f"- canonical skills: {', '.join(sorted(CANONICAL_SKILLS))}")
    print("- continuation/proof ownership: separated")
    print("- historical DevelopingData: absent from active tree")
    print("- workflow supply chain: immutable/read-only/bounded")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
