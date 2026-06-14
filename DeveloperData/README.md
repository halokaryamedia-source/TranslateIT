# DeveloperData

## Purpose

`DeveloperData` stores human-facing developer references only. It must not contain executable runtime code, local models, build output, cache, logs, or user data.

## Professional layout

```text
DeveloperData/
  README.md
  Guides/
    Repository/
      README.md
      GitHubSetupGuide.md
  Research/
    VoiceLab/
      README.md
      VoiceLabResearchBrief.md
      VoiceLabResearchNotes.md
  Templates/
    Repository/
      gitignore_template.txt
```

## Folder ownership

- `Guides/` - setup, onboarding, and maintenance guides.
- `Research/` - product or technical research that is not runtime-critical.
- `Templates/` - reusable reference templates.

## Rules

- Use English folder and file names.
- Keep documents topic-scoped and stable.
- Do not add scripts or app runtime code here.
- Move obsolete research to reports or delete it; do not keep multiple competing directions.
