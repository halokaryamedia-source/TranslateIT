@echo off
setlocal EnableExtensions
set "EXPERIMENTAL_ROOT=%~dp0..\.."
for %%I in ("%EXPERIMENTAL_ROOT%") do set "EXPERIMENTAL_ROOT=%%~fI"
pushd "%EXPERIMENTAL_ROOT%"

set "RUNTIME_LOG_DIR=%EXPERIMENTAL_ROOT%\UserData\LogData"
if not exist "%RUNTIME_LOG_DIR%" mkdir "%RUNTIME_LOG_DIR%"
set "LAUNCH_LOG=%RUNTIME_LOG_DIR%\launcher_latest.log"

if not defined TRANSLATEIT_TTS_BACKEND set "TRANSLATEIT_TTS_BACKEND=sapi_direct_async"
set "TRANSLATEIT_LAUNCH_MODE=debug"
set "TRANSLATEIT_PROJECT_ROOT=%EXPERIMENTAL_ROOT%"

set "PYTHON_EXE=%EXPERIMENTAL_ROOT%\DevelopingData\ToolKitData\rt\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
  echo FAIL: Python runtime not found: %PYTHON_EXE%
  echo [%date% %time%] ERROR: python_missing ^| %PYTHON_EXE%>>"%LAUNCH_LOG%"
  pause
  popd
  exit /b 1
)

echo [%date% %time%] INFO: launch_self_test ^| "%PYTHON_EXE%" -m EngineData.LauncherApp.launcher_bootstrap --self-test>>"%LAUNCH_LOG%"
"%PYTHON_EXE%" -m EngineData.LauncherApp.launcher_bootstrap --self-test
set "SELF_TEST_EXIT=%ERRORLEVEL%"
if not "%SELF_TEST_EXIT%"=="0" (
  echo.
  echo TranslateIT debug self-test failed with exit code %SELF_TEST_EXIT%.
  echo See %LAUNCH_LOG% for details.
  pause
  popd
  exit /b %SELF_TEST_EXIT%
)

echo [%date% %time%] INFO: launch_command ^| "%PYTHON_EXE%" -m EngineData.LauncherApp.launcher_bootstrap>>"%LAUNCH_LOG%"
"%PYTHON_EXE%" -m EngineData.LauncherApp.launcher_bootstrap
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo TranslateIT debug launcher failed with exit code %EXIT_CODE%.
  echo See %LAUNCH_LOG% for details.
)
pause
popd
exit /b %EXIT_CODE%
