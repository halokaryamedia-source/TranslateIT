@echo off
setlocal EnableExtensions
cd /d "%~dp0..\..\.."

set "PYTHON_EXE=DevelopingData\ToolKitData\rt\Scripts\python.exe"
set "LOG_DIR=UserData\LogData"
set "LOG_FILE=%LOG_DIR%\launcher_latest.log"
set "CRASH_LOG=%LOG_DIR%\launcher_crash_latest.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

if not exist "%PYTHON_EXE%" (
  echo Runtime not found. Please choose Setup / Repair Runtime first.
  echo Runtime not found. Please choose Setup / Repair Runtime first.> "%LOG_FILE%"
  exit /b 1
)

echo TranslateIT launcher starting...
echo Launch mode: desktop UI
echo Log file: %LOG_FILE%
echo [%date% %time%] Launch mode: desktop UI> "%LOG_FILE%"

"%PYTHON_EXE%" -m EngineData.LauncherApp.cuda_validation >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  echo WARN: CUDA Core is not ready. Real ASR performance target is not met.
  echo      Continue with Diagnostic/Mock only or enable CPU Degraded Mode inside the app.
  echo WARN: CUDA Core is not ready. Real ASR performance target is not met.>> "%LOG_FILE%"
)

"%PYTHON_EXE%" -m EngineData.LauncherApp.app_main 2> "%CRASH_LOG%"
set "APP_EXIT=%ERRORLEVEL%"
if not "%APP_EXIT%"=="0" (
  echo FAIL: TranslateIT exited with code %APP_EXIT%.
  echo See log: %LOG_FILE%
  echo Crash details if any: %CRASH_LOG%
) else (
  echo PASS: TranslateIT closed normally.
)
exit /b %APP_EXIT%
