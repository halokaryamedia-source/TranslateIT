# LogData

Operational diagnostics produced by the running TranslateIT product belong here.

Allowed examples include bounded runtime errors, capability/readiness diagnostics, crash information, and other technical evidence needed to understand actual product operation.

Rules:

- keep logs minimal and redacted;
- do not log conversation bodies, full translated text, raw audio, secrets, or personal data by default;
- developer/source-validation reports, contract matrices, CI output, and local build logs do **not** belong here; use ignored `.tmp/` development paths instead;
- logs are diagnostic data, never product/source authority.
