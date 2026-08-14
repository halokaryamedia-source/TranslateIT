from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path.cwd()
paths = sorted(
    [p for p in (ROOT / '.github').glob('temp-a6-*') if p.is_file()]
    + [p for p in (ROOT / '.github/workflows').glob('temp-a6-*') if p.is_file()]
)
repurposed_final_proof = ROOT / '.github/workflows/temp-a4-provider-compat.yml'
if repurposed_final_proof.is_file():
    paths.append(repurposed_final_proof)

relative = sorted({p.relative_to(ROOT).as_posix() for p in paths})
if not relative:
    raise RuntimeError('no temporary A6 tooling found')
for path in relative:
    if not (path.startswith('.github/temp-a6-') or path.startswith('.github/workflows/temp-a6-') or path == '.github/workflows/temp-a4-provider-compat.yml'):
        raise RuntimeError(f'unexpected cleanup path: {path}')

subprocess.run(['git', 'rm', '--', *relative], cwd=ROOT, check=True)
staged = sorted(subprocess.check_output(['git', 'diff', '--cached', '--name-only'], cwd=ROOT, text=True).splitlines())
if staged != relative:
    raise RuntimeError(f'unexpected staged cleanup set: {staged!r}')

subprocess.run(['git', 'config', 'user.name', 'TranslateIT Source Proof'], cwd=ROOT, check=True)
subprocess.run(['git', 'config', 'user.email', 'actions@users.noreply.github.com'], cwd=ROOT, check=True)
subprocess.run(['git', 'commit', '-m', 'Remove temporary VoiceLab A6 tooling'], cwd=ROOT, check=True)
subprocess.run(['git', 'push', 'origin', 'HEAD:New'], cwd=ROOT, check=True)
print('A6_TEMPORARY_TOOLING_CLEANUP=PASS')
print('REMOVED=' + ','.join(relative))
