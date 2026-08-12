from pathlib import Path

path = Path('.tmp/prelocal_c2_latency_patch.py')
text = path.read_text(encoding='utf-8')
old = """replace_once(\n    MEETING,\n    '''                    utterance.utterance_id,\\n                    audio_path.clone(),\\n                );''',\n    '''                    utterance.utterance_id,\\n                    audio_path.clone(),\\n                    timing,\\n                );''',\n)"""
new = """replace_once(\n    MEETING,\n    '''                let _ = process_authoritative_finalized_outbound_wav(\\n                    generation,\\n                    &utterance.session_id,\\n                    utterance.sequence,\\n                    utterance.utterance_id,\\n                    audio_path.clone(),\\n                );''',\n    '''                let _ = process_authoritative_finalized_outbound_wav(\\n                    generation,\\n                    &utterance.session_id,\\n                    utterance.sequence,\\n                    utterance.utterance_id,\\n                    audio_path.clone(),\\n                    timing,\\n                );''',\n)"""
if text.count(old) != 1:
    raise SystemExit(f'expected one ambiguous helper block, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8', newline='\n')
print('C2 helper ambiguity fixed')
