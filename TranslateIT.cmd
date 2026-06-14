@echo off
setlocal

set "ROOT=%~dp0"
set "APP_EXE=%ROOT%EngineData\LauncherApp\RustApp\src-tauri\target\release\translateit_rustapp.exe"
set "NSIS_DIR=%ROOT%EngineData\LauncherApp\RustApp\src-tauri\target\release\bundle\nsis"

if exist "%APP_EXE%" (
    start "" "%APP_EXE%"
    exit /b 0
)

if exist "%NSIS_DIR%" (
    for %%I in ("%NSIS_DIR%\*.exe") do (
        start "" "%%~fI"
        exit /b 0
    )
)

echo TranslateIT packaged app was not found.
echo.
echo Expected app:
echo %APP_EXE%
echo.
echo Or installer folder:
echo %NSIS_DIR%
echo.
echo Build the Tauri package first from:
echo EngineData\LauncherApp\RustApp
echo.
pause
exit /b 1
