@echo off
setlocal
set TRANSLATEIT_TTS_BACKEND=sapi_direct_async
python -m EngineData.LauncherApp.app_main %*
endlocal
