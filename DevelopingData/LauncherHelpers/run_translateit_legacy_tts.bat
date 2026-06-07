@echo off
setlocal
set TRANSLATEIT_TTS_BACKEND=legacy_sapi_wav
python -m EngineData.LauncherApp.app_main %*
endlocal
