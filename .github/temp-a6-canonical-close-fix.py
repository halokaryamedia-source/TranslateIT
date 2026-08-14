from __future__ import annotations

import subprocess
from pathlib import Path

path = Path('.github/temp-a6-canonical-close.py')
text = path.read_text(encoding='utf-8')
old = 'decisions = DECISIONS.read_text(encoding="utf-8")ndec_old = '
new = 'decisions = DECISIONS.read_text(encoding="utf-8")\ndec_old = '
if text.count(old) != 1:
    raise RuntimeError('canonical-close typo anchor mismatch')
path.write_text(text.replace(old, new, 1), encoding='utf-8', newline='\n')
subprocess.run(['python', str(path)], check=True)
