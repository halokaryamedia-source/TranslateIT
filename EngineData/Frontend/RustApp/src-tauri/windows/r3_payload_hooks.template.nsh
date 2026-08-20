; TranslateIT R3 external offline payload hook template.
; This file is source authority. build_r3_external_payload.py renders the trusted
; payload SHA-256 and absolute build-time helper path into an ignored generated hook.

!define TRANSLATEIT_R3_PAYLOAD_SCHEMA "@@PAYLOAD_SCHEMA@@"
!define TRANSLATEIT_R3_PAYLOAD_FILENAME "@@PAYLOAD_FILENAME@@"
!define TRANSLATEIT_R3_PAYLOAD_SHA256 "@@PAYLOAD_SHA256@@"

!macro NSIS_HOOK_PREINSTALL
  DetailPrint "TranslateIT: validating colocated offline payload..."
  InitPluginsDir
  File /oname=$PLUGINSDIR\translateit-r3-payload-installer.ps1 "@@INSTALLER_HELPER_SOURCE@@"

  IfFileExists "$EXEDIR\${TRANSLATEIT_R3_PAYLOAD_FILENAME}" translateit_r3_payload_present translateit_r3_payload_missing

  translateit_r3_payload_missing:
    MessageBox MB_ICONSTOP|MB_OK "TranslateIT-Payload.7z is missing. Keep TranslateIT-Setup.exe and TranslateIT-Payload.7z in the same folder, then run Setup again."
    Abort

  translateit_r3_payload_present:
    ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\translateit-r3-payload-installer.ps1" -Mode Verify -PayloadPath "$EXEDIR\${TRANSLATEIT_R3_PAYLOAD_FILENAME}" -ExpectedSha256 "${TRANSLATEIT_R3_PAYLOAD_SHA256}"' $0
    ${If} $0 != 0
      MessageBox MB_ICONSTOP|MB_OK "TranslateIT offline payload validation failed (code $0). Setup will stop instead of installing incomplete or modified runtime assets."
      Abort
    ${EndIf}
!macroend

!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "TranslateIT: installing verified offline runtime payload..."
  ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\translateit-r3-payload-installer.ps1" -Mode Extract -PayloadPath "$EXEDIR\${TRANSLATEIT_R3_PAYLOAD_FILENAME}" -ExpectedSha256 "${TRANSLATEIT_R3_PAYLOAD_SHA256}" -InstallRoot "$INSTDIR"' $0
  ${If} $0 != 0
    MessageBox MB_ICONSTOP|MB_OK "TranslateIT offline payload installation failed (code $0). Re-run Setup with the original colocated payload; do not install Python or models manually."
    Abort
  ${EndIf}
!macroend
