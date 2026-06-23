@echo off
setlocal
title TranslateIT - Copy to Local Version 0.1

set SCRIPT_DIR=%~dp0
set PS_SCRIPT=%SCRIPT_DIR%Copy-To-Local-Version01.ps1

if not exist "%PS_SCRIPT%" (
  echo Missing PowerShell script:
  echo %PS_SCRIPT%
  pause
  exit /b 1
)

echo Running TranslateIT one click local copy...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"

set EXITCODE=%ERRORLEVEL%
echo.
if not "%EXITCODE%"=="0" (
  echo Copy script finished with exit code %EXITCODE%.
) else (
  echo Copy script finished successfully.
)
pause
exit /b %EXITCODE%
