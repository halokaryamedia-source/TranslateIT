@echo off
setlocal EnableExtensions
cd /d "%~dp0..\..\.."

echo TranslateIT runtime validation
echo =============================

set "PYTHON_EXE=DevelopingData\ToolKitData\rt\Scripts\python.exe"
set "LOG_DIR=UserData\LogData"
set "REPORT=%LOG_DIR%\runtime_validation_latest.txt"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

if not exist "%PYTHON_EXE%" (
  echo FAIL: Runtime Python missing at %PYTHON_EXE%.
  echo FAIL: Runtime Python missing at %PYTHON_EXE%.> "%REPORT%"
  echo Runtime not found. Please choose Setup / Repair Runtime first.
  exit /b 1
)

"%PYTHON_EXE%" -m EngineData.LauncherApp.runtime_validation
set "VALIDATION_EXIT=%ERRORLEVEL%"

echo.
echo Checking launcher validate-only mode...
"%PYTHON_EXE%" -m EngineData.LauncherApp.app_main --validate-only
if errorlevel 1 (
  echo FAIL: Launcher validate-only mode failed.>> "%REPORT%"
  set "VALIDATION_EXIT=1"
) else (
  echo PASS: Launcher validate-only mode succeeded.>> "%REPORT%"
)

echo.
echo Validation report: %REPORT%
if "%VALIDATION_EXIT%"=="0" (
  echo PASS: Runtime validation completed.
) else (
  echo FAIL: Runtime validation found blocking issues.
)
exit /b %VALIDATION_EXIT%
