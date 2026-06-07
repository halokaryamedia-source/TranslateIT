# VoiceLab Research Notes

## Scope
Catatan awal untuk memahami basis VoiceLab sebelum melanjutkan desain suara Translate memakai voice sendiri.

## What I Found
- Folder `EngineData/VoiceLabEngine` ada, tetapi dari pemeriksaan recursive awal tidak ada file source yang terisi di sana.
- Jalur VoiceLab yang aktif sekarang bersifat settings-first: `Settings -> VoiceLab`.
- Build/publish Voice Actor dikunci oleh method lock dan tidak lagi lewat CLI direct path.
- Legacy backup/export/import workflow VoiceLab dinyatakan disabled pada runtime aktif.

## Official Policy / Method Lock
- Official build path memakai skrip bundled Piper:
  - `EngineData/RuntimeApp/AppSource/translateit/scripts/train-piper-voice.ps1`
- Entry point method resmi:
  - `AppBootstrap.build_voice_actor_method(...)`
- Disabled paths:
  - direct CLI build
  - direct CLI publish
  - speaker-pack CLI build
  - backup export/import workflow
- Rule penting:
  - VoiceLab/Voice Actor baru harus memperluas satu jalur resmi ini, bukan membuat engine paralel.

## Existing Voice Asset: `marcel`
- Profile ID: `marcel`
- Display name: `Marcel`
- Language: `en`
- Created at: `2026-04-28T12:00:41.640075`
- Reference count in manifest: `8`
- Guided prompt count: `40`
- Enrollment mode: `guided_wizard`
- Wizard completed at: `2026-04-28T04:57:48.853571+00:00`
- Training stage: `draft_ready`
- Ready for training: `false`
- Speaker pack ready: `true`
- Voice actor ready: `true`
- Voice actor build status: `draft_ready`
- Voice actor artifact path:
  - `D:\Work\AI Stuff\TranslateIT-ISSUED\DevelopingPack\UserData\SavedData\profiles\default\voices\marcel\model.onnx`
- Speaker pack path:
  - `D:\Work\AI Stuff\TranslateIT-ISSUED\DevelopingPack\UserData\SavedData\profiles\default\voices\marcel\speaker_pack.json`
- Fallback voice profile:
  - `piper:en-us-lessac-medium`
- Fallback render profile:
  - `premium`
- Design target:
  - `general_neutral_en_v1`
- Dataset filter policy:
  - `strict_balanced`

## Reference Clip Snapshot
The speaker pack manifest lists 8 reference clips, all English-language voice reference samples around 5-7 seconds each. The manifest notes:
- this speaker pack is the reference manifest for custom voice routing
- the listed clean clips should be used as speaker references or enrollment samples

## Important Quality Notes
- The build is not yet publish-grade.
- Recommended next steps in the manifest:
  - record 150 more accepted guided prompts
  - add about 1963 more seconds of accepted guided audio
  - run Smart Improve before final publish
- The manifest indicates the Lite Build is usable in session, but carries a quality warning.
- Historical logs also show `too_much_silence` on many clips, which suggests the dataset has many long-silence samples and would need cleanup/improvement before a final voice product.

## Practical Implications for Translate Voice
- The custom voice path already exists as Voice Actor + Piper fallback.
- The current asset is English-focused, so for a Translate voice we need to clarify:
  - whether we want to reuse this `marcel` voice directly
  - whether we want a new bilingual / mixed-language voice
  - whether we want to keep fallback Piper unchanged
- The runtime should stay on the official VoiceLab method lock, not a parallel build route.

## Next Things To Check
- How VoiceLab settings are represented in the current Experimental app.
- Whether the app already has a voice selection / voice profile routing hook for the Translate output.
- Whether the current voice asset can be reused safely for Translate output or needs a new enrollment workflow.

