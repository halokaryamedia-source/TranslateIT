# SavedProject

This folder stores user-facing saved TranslateIT project data.

Runtime rules:
- `Chat/` is reserved for saved chat sessions.
- `DataWork/` is reserved for final user-visible work outputs.
- Intermediate logs and validation evidence must stay under `UserData/LogData`.
- Cache/runtime temporary data must stay under `UserData/CacheData`.

This folder replaces the older `SavedData` route for active Rust/Tauri runtime path discovery.
