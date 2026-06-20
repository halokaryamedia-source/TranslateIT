@echo off
setlocal
title TranslateIT Session Render Bridge Installer

cd /d "%~dp0"

echo ============================================================
echo TranslateIT Session Render Bridge Installer
echo ============================================================
echo.

powershell -NoProfile -File "%~dp0Install-Session-Bridge.ps1"

if errorlevel 1 (
  echo.
  echo [ERROR] Session Bridge installation failed.
  pause
  exit /b 1
)

echo.
echo [DONE] Session Bridge installed.
echo The Figma plugin can now start the bridge on demand.
echo The bridge will auto-close after it is idle.
pause
