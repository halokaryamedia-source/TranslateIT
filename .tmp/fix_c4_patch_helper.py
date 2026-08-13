from pathlib import Path

path = Path('.tmp/prelocal_c4_functional_readiness_patch.py')
text = path.read_text(encoding='utf-8')

anchor = '''def replace_section(text: str, start: str, end: str, replacement: str, label: str) -> str:\n'''
helper = '''def replace_first(text: str, old: str, new: str, label: str) -> str:\n    if old not in text:\n        raise RuntimeError(f"{label}: match not found")\n    return text.replace(old, new, 1)\n\n\n'''
if helper not in text:
    if anchor not in text:
        raise SystemExit('replace_section anchor missing')
    text = text.replace(anchor, helper + anchor, 1)

label = '    "helper status fields",\n)'
label_index = text.find(label)
if label_index < 0:
    raise SystemExit('helper status label missing')
call_index = text.rfind('text = replace_once(', 0, label_index)
if call_index < 0:
    raise SystemExit('helper status replace call missing')
text = text[:call_index] + text[call_index:].replace('text = replace_once(', 'text = replace_first(', 1)

path.write_text(text, encoding='utf-8')
print('C4 patch helper targeting fixed')
