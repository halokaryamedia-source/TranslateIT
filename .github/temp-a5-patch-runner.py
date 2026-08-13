from __future__ import annotations

import runpy
import subprocess

module = runpy.run_path(".github/temp-a5-patch.py", run_name="a5_patch")
module["patch_provider"]()
module["patch_worker"]()
module["write_tests"]()

paths = (module["PROVIDER_PATH"], module["WORKER_PATH"], module["TEST_PATH"])
for path in paths:
    compile(path.read_text(encoding="utf-8"), str(path), "exec")
subprocess.run(["git", "diff", "--check"], check=True)

changed = set(subprocess.check_output(["git", "diff", "--name-only"], text=True).splitlines())
changed.update(subprocess.check_output(["git", "ls-files", "--others", "--exclude-standard", str(module["TEST_PATH"])], text=True).splitlines())
changed.discard("")
expected = {str(path.relative_to(module["ROOT"])).replace("\\", "/") for path in paths}
if changed != expected:
    raise RuntimeError(f"unexpected changed files: {sorted(changed)!r} != {sorted(expected)!r}")

for path in paths:
    sha = subprocess.check_output(["git", "hash-object", str(path)], text=True).strip()
    relative = str(path.relative_to(module["ROOT"])).replace("\\", "/")
    print(f"A5_LOCAL_BLOB {relative} {sha}")
