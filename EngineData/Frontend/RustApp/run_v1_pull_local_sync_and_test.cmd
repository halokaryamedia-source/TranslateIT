@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\run_v1_pull_local_sync_and_test.ps1" -OpenReport
pause
