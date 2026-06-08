@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
set "HELPER_DIR=%SCRIPT_DIR%"
set "EXPERIMENTAL_ROOT=%~1"
if not defined EXPERIMENTAL_ROOT set "EXPERIMENTAL_ROOT=%HELPER_DIR%..\.."
for %%I in ("%EXPERIMENTAL_ROOT%") do set "EXPERIMENTAL_ROOT=%%~fI"
for %%I in ("%HELPER_DIR%..\..") do set "DERIVED_ROOT=%%~fI"
if not exist "%EXPERIMENTAL_ROOT%\EngineData" set "EXPERIMENTAL_ROOT=%DERIVED_ROOT%"

set "RUNTIME_LOG_DIR=%EXPERIMENTAL_ROOT%\UserData\CacheData\RuntimeLogs"
if not exist "%RUNTIME_LOG_DIR%" mkdir "%RUNTIME_LOG_DIR%"
set "LAUNCH_LOG=%RUNTIME_LOG_DIR%\launcher_debug.log"

call :log INFO "launcher_started" "root=%EXPERIMENTAL_ROOT%"

if not defined TRANSLATEIT_TTS_BACKEND set "TRANSLATEIT_TTS_BACKEND=sapi_direct_async"
call :log INFO "backend_selected" "TRANSLATEIT_TTS_BACKEND=%TRANSLATEIT_TTS_BACKEND%"

if not exist "%EXPERIMENTAL_ROOT%\EngineData" (
  call :log ERROR "missing_engine_data" "%EXPERIMENTAL_ROOT%\EngineData"
  echo FAIL: EngineData folder is missing: %EXPERIMENTAL_ROOT%\EngineData
  exit /b 10
)
if not exist "%EXPERIMENTAL_ROOT%\EngineData\LauncherApp\app_main.py" (
  call :log ERROR "missing_app_entrypoint" "%EXPERIMENTAL_ROOT%\EngineData\LauncherApp\app_main.py"
  echo FAIL: app entrypoint missing: %EXPERIMENTAL_ROOT%\EngineData\LauncherApp\app_main.py
  exit /b 11
)

pushd "%EXPERIMENTAL_ROOT%"
if errorlevel 1 (
  call :log ERROR "pushd_failed" "%EXPERIMENTAL_ROOT%"
  echo FAIL: Could not switch to experimental root: %EXPERIMENTAL_ROOT%
  exit /b 12
)

set "PYTHONW_EXE=%EXPERIMENTAL_ROOT%\DevelopingData\ToolKitData\rt\Scripts\pythonw.exe"
set "PYTHON_EXE=%EXPERIMENTAL_ROOT%\DevelopingData\ToolKitData\rt\Scripts\python.exe"
if defined TRANSLATEIT_LAUNCH_DEBUG (
  if exist "%PYTHON_EXE%" (
    set "PYTHON_CMD=%PYTHON_EXE%"
  ) else if exist "%PYTHONW_EXE%" (
    set "PYTHON_CMD=%PYTHONW_EXE%"
  ) else (
    call :log ERROR "missing_python_runtime" "%PYTHONW_EXE% | %PYTHON_EXE%"
    echo FAIL: Python runtime not found.
    popd
    exit /b 13
  )
) else if exist "%PYTHONW_EXE%" (
  set "PYTHON_CMD=%PYTHONW_EXE%"
) else if exist "%PYTHON_EXE%" (
  set "PYTHON_CMD=%PYTHON_EXE%"
) else (
  call :log ERROR "missing_python_runtime" "%PYTHONW_EXE% | %PYTHON_EXE%"
  echo FAIL: Python runtime not found.
  popd
  exit /b 13
)

set "TRANSLATEIT_LAUNCH_MODE=gui"
set "TRANSLATEIT_PROJECT_ROOT=%EXPERIMENTAL_ROOT%"
set "PYTHONPATH=%EXPERIMENTAL_ROOT%;%PYTHONPATH%"

set "LAUNCH_COMMAND=%PYTHON_CMD% -m EngineData.LauncherApp.app_main"
call :log INFO "launch_command" "%LAUNCH_COMMAND%"
"%PYTHON_CMD%" -m EngineData.LauncherApp.app_main
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  call :log ERROR "app_launch_failed" "exit_code=%EXIT_CODE%"
  echo FAIL: TranslateIT closed with error code %EXIT_CODE%.
  popd
  exit /b %EXIT_CODE%
)

call :log INFO "app_launch_succeeded" "exit_code=0"
popd
exit /b 0

:log
set "LEVEL=%~1"
set "EVENT=%~2"
set "DETAILS=%~3"
>>"%LAUNCH_LOG%" echo [%date% %time%] %LEVEL%: %EVENT% ^| %DETAILS%
exit /b 0
