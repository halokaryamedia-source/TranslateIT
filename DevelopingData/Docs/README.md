# TranslateIT

This is the approved project root for the TranslateIT rebuild.

## Purpose
- Keep the existing root structure stable.
- Hold documentation, engine scaffolds, and user data in their approved folders.
- Prevent ad hoc files, new root folders, or mixed responsibilities at the top level.
- Double-click `TranslateIT.vbs` for the clean no-flash app launch in normal use. `TranslateIT.bat` remains available for maintenance and diagnostics.

## Allowed files
- `README.md`
- `TranslateIT.bat`
- Approved root folders only:
  - `DevelopingData/`
  - `EngineData/`
  - `UserData/`

## Must not be placed here
- Random scripts
- Build outputs
- Temporary media
- Unapproved folders
- Engine code files outside `EngineData/`
- User transcript data outside `UserData/`

## Naming rules
- Use English only.
- Keep official folder names unchanged.
- Use clear, descriptive file names.

## Related documentation path
- `DevelopingData/DocumentationData/SourceDocument/MASTER_PROJECT_DOCUMENTATION.md`
- Launcher logs:
  - `UserData/LogData/launcher_latest.log`
  - `UserData/LogData/app_crash_latest.log`
