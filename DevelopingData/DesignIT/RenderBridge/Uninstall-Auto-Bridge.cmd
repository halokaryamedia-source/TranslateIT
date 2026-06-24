@echo off
setlocal
title TranslateIT Auto Render Bridge Uninstaller

powershell -NoProfile -ExecutionPolicy Bypass -Command "Unregister-ScheduledTask -TaskName 'TranslateIT Render Bridge' -Confirm:$false -ErrorAction SilentlyContinue; Write-Host '[DONE] TranslateIT Render Bridge startup task removed.' -ForegroundColor Green"

echo.
echo Note: this does not delete node_modules or project files.
pause
