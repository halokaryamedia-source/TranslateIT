@echo off
setlocal
title TranslateIT Auto Render Bridge Installer

cd /d "%~dp0"

echo ============================================================
echo TranslateIT Auto Render Bridge Installer
echo ============================================================
echo.

where powershell >nul 2>nul
if errorlevel 1 (
  echo [ERROR] PowerShell is not available.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Auto-Bridge.ps1"

if errorlevel 1 (
  echo.
  echo [ERROR] Auto Bridge installation failed.
  pause
  exit /b 1
)

echo.
echo [DONE] Auto Bridge installed.
echo You can now open the Figma plugin and paste a website address directly.
pause
