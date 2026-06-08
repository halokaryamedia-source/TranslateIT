@echo off
setlocal EnableExtensions
cd /d "%~dp0..\..\.."

set "PYTHON_EXE=DevelopingData\ToolKitData\rt\Scripts\python.exe"
set "LOG_DIR=UserData\LogData"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

if not exist "%PYTHON_EXE%" (
  echo FAIL: Runtime not found. Please choose Setup / Repair Runtime first.
  exit /b 1
)

"%PYTHON_EXE%" -m EngineData.LauncherApp.microphone_cli
exit /b %ERRORLEVEL%
