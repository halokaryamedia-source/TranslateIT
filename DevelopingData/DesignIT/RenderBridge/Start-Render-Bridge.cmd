@echo off
setlocal
title TranslateIT Render Bridge

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not available in PATH.
  echo Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [INFO] Installing dependencies...
  npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo [INFO] Installing Chromium browser for Playwright if needed...
npx playwright install chromium

echo.
echo [INFO] Starting TranslateIT Render Bridge...
echo [INFO] Keep this window open while using the Figma plugin.
echo.

npm start
pause
