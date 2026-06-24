@echo off
setlocal
title TranslateIT Session Render Bridge Uninstaller

powershell -NoProfile -Command "Remove-Item -Path 'HKCU:\Software\Classes\translateit-render-bridge' -Recurse -Force -ErrorAction SilentlyContinue; Write-Host '[DONE] TranslateIT session bridge protocol removed.' -ForegroundColor Green"

echo.
echo Note: this does not delete node_modules or project files.
pause
