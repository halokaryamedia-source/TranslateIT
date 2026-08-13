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

problem_start = text.find("insert_after = '''    #[test]")
problem_end = text.find('write(HELPER, text)', problem_start)
if problem_start < 0 or problem_end < 0:
    raise SystemExit('C4 test insertion helper block missing')
replacement = '''asr_test_anchor = """    #[test]\n    fn normal_empty_asr_does_not_invalidate_functional_capability() {\n"""\nasr_test = ''' + "'''" + '''    #[test]\n    fn functional_asr_requires_real_nonempty_transcribe_output() {\n        let complete = response(\n            true,\n            r#"{\\"ok\\":true,\\"stage\\":\\"transcribe\\",\\"transcript_text\\":\\"good morning\\"}"#,\n        );\n        assert!(functional_asr_output(&complete));\n\n        let empty = response(\n            false,\n            r#"{\\"ok\\":false,\\"stage\\":\\"transcribe\\",\\"blocker\\":\\"asr:empty_transcript\\"}"#,\n        );\n        assert!(!functional_asr_output(&empty));\n    }\n\n''' + "'''" + '''\nif asr_test_anchor not in text:\n    raise RuntimeError("C4 ASR test insertion anchor missing")\ntext = text.replace(asr_test_anchor, asr_test + asr_test_anchor, 1)\n'''
text = text[:problem_start] + replacement + text[problem_end:]

path.write_text(text, encoding='utf-8')
print('C4 patch helper targeting fixed')
