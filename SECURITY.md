# Security Policy

## Scope

Security-sensitive TranslateIT surfaces include:

- local microphone and Meeting Sound capture;
- generated/recorded voice data and My Voice assets;
- local helper/process execution and IPC;
- filesystem paths, UserData and installer/runtime extraction;
- model/runtime asset acquisition and provenance;
- Windows audio-provider installation;
- GitHub Actions, release artifacts and supply-chain inputs.

## Reporting

Do not publish secrets, private user data, exploit details or personal voice/conversation content in a public issue, pull request, comment or log. Report sensitive findings privately to the repository owner using an available private channel/security-reporting mechanism.

When discussing a sensitive finding in normal repository work, identify only the affected location/type and the remediation boundary; do not repeat protected values.

## Repository rules

- Never commit credentials, authorization headers, private keys or `.env` secrets.
- Personal voice recordings, My Voice datasets/actors and private meeting content are user-owned data, not repository fixtures.
- Diagnostics must remain minimal/redacted by default.
- Verification workflows use least privilege, immutable Action pins and read-only checkout credentials.
- Untrusted event-derived text/paths/names must not be interpolated into privileged shell behavior without validation.
- Do not introduce `pull_request_target` execution for untrusted code without an explicit security design.
- Local failure must never silently route protected speech/text/voice data to cloud services.
- Installer/runtime extraction must validate controlled inputs and must not silently execute arbitrary repository/user content.

## Proof boundary

Static review can establish security intent and source contracts. Real Windows permissions, device behavior, installer prompts and runtime isolation require matching environment proof when those are the claims.
