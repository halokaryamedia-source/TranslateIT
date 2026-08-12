from pathlib import Path

path = Path('.tmp/prelocal_c2_latency_patch.py')
text = path.read_text(encoding='utf-8')

old_call = """replace_once(\n    MEETING,\n    '''                    utterance.utterance_id,\\n                    audio_path.clone(),\\n                );''',\n    '''                    utterance.utterance_id,\\n                    audio_path.clone(),\\n                    timing,\\n                );''',\n)"""
new_call = """replace_once(\n    MEETING,\n    '''                let _ = process_authoritative_finalized_outbound_wav(\\n                    generation,\\n                    &utterance.session_id,\\n                    utterance.sequence,\\n                    utterance.utterance_id,\\n                    audio_path.clone(),\\n                );''',\n    '''                let _ = process_authoritative_finalized_outbound_wav(\\n                    generation,\\n                    &utterance.session_id,\\n                    utterance.sequence,\\n                    utterance.utterance_id,\\n                    audio_path.clone(),\\n                    timing,\\n                );''',\n)"""
if text.count(old_call) != 1:
    raise SystemExit(f'expected one ambiguous helper block, found {text.count(old_call)}')
text = text.replace(old_call, new_call, 1)

old_borrow = """    '''        for target in data.iter_mut() {\\n            if let Some(value) = self.samples.get(self.index) {\\n                if !self.first_playback_signalled {\\n                    self.signal_first_playback(callback_info);\\n                }\\n                *target = convert(*value);\\n                self.index += 1;''',"""
new_borrow = """    '''        for target in data.iter_mut() {\\n            if let Some(value) = self.samples.get(self.index).copied() {\\n                if !self.first_playback_signalled {\\n                    self.signal_first_playback(callback_info);\\n                }\\n                *target = convert(value);\\n                self.index += 1;''',"""
if text.count(old_borrow) != 1:
    raise SystemExit(f'expected one playback borrow helper block, found {text.count(old_borrow)}')
text = text.replace(old_borrow, new_borrow, 1)

path.write_text(text, encoding='utf-8', newline='\n')
print('C2 helper ambiguity and playback borrow fixed')
