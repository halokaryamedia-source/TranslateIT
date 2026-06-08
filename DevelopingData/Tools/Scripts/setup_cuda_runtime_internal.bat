@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0..\..\.."

set "PYTHON_EXE=DevelopingData\ToolKitData\rt\Scripts\python.exe"
set "LOG_DIR=UserData\LogData"
set "CUDA_SETUP_LOG=%LOG_DIR%\cuda_setup_latest.txt"
set "TORCH_CUDA_INDEX_URL=https://download.pytorch.org/whl/cu126"
if not "%TRANSLATEIT_TORCH_CUDA_INDEX_URL%"=="" set "TORCH_CUDA_INDEX_URL=%TRANSLATEIT_TORCH_CUDA_INDEX_URL%"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
> "%CUDA_SETUP_LOG%" echo TranslateIT CUDA setup log
>> "%CUDA_SETUP_LOG%" echo Started: %date% %time%
>> "%CUDA_SETUP_LOG%" echo Project root: %CD%
>> "%CUDA_SETUP_LOG%" echo Torch CUDA wheel index: %TORCH_CUDA_INDEX_URL%
>> "%CUDA_SETUP_LOG%" echo.

echo TranslateIT CUDA runtime setup
echo =============================
echo CUDA Core requirement: NVIDIA driver + CUDA-enabled PyTorch + working CUDA tensor execution.
echo Official PyTorch CUDA wheel index selected:
echo   %TORCH_CUDA_INDEX_URL%
echo CUDA setup log:
echo   %CUDA_SETUP_LOG%
echo.

if not exist "%PYTHON_EXE%" (
  echo FAIL: Runtime Python missing at %PYTHON_EXE%.
  echo Choose Setup / Repair Runtime first.
  >> "%CUDA_SETUP_LOG%" echo FAIL: Runtime Python missing at %PYTHON_EXE%.
  exit /b 1
)

where nvidia-smi >nul 2>nul
if errorlevel 1 (
  echo FAIL: NVIDIA driver or nvidia-smi not detected.
  echo CUDA Core requirement is not satisfied because NVIDIA driver/nvidia-smi is missing.
  echo Install/update NVIDIA driver from the official NVIDIA source, then rerun this option.
  echo Reference: https://docs.nvidia.com/cuda/cuda-installation-guide-microsoft-windows/
  echo Reference: https://developer.nvidia.com/cuda-downloads
  >> "%CUDA_SETUP_LOG%" echo FAIL: NVIDIA driver or nvidia-smi not detected.
  "%PYTHON_EXE%" -m EngineData.LauncherApp.cuda_validation
  exit /b 1
)

echo PASS: nvidia-smi detected.
>> "%CUDA_SETUP_LOG%" echo PASS: nvidia-smi detected.
>> "%CUDA_SETUP_LOG%" echo COMMAND: nvidia-smi
nvidia-smi >> "%CUDA_SETUP_LOG%" 2>&1
nvidia-smi
echo.

where nvcc >nul 2>nul
if errorlevel 1 (
  echo WARN: nvcc not detected. System CUDA Toolkit may be missing.
  echo      PyTorch CUDA runtime can still work without system CUDA Toolkit unless compiling CUDA code.
  >> "%CUDA_SETUP_LOG%" echo WARN: nvcc not detected.
) else (
  echo PASS: nvcc detected.
  >> "%CUDA_SETUP_LOG%" echo COMMAND: nvcc --version
  nvcc --version >> "%CUDA_SETUP_LOG%" 2>&1
  nvcc --version
)

echo.
echo Current project PyTorch CUDA status:
>> "%CUDA_SETUP_LOG%" echo COMMAND: "%PYTHON_EXE%" -c "import torch; print('torch', torch.__version__); print('torch.version.cuda', torch.version.cuda); print('torch.cuda.is_available', torch.cuda.is_available()); print('torch.cuda.device_count', torch.cuda.device_count())"
"%PYTHON_EXE%" -c "import torch; print('torch', torch.__version__); print('torch.version.cuda', torch.version.cuda); print('torch.cuda.is_available', torch.cuda.is_available()); print('torch.cuda.device_count', torch.cuda.device_count())" >> "%CUDA_SETUP_LOG%" 2>&1
"%PYTHON_EXE%" -c "import torch; print('torch', torch.__version__); print('torch.version.cuda', torch.version.cuda); print('torch.cuda.is_available', torch.cuda.is_available()); print('torch.cuda.device_count', torch.cuda.device_count())"
echo.

>> "%CUDA_SETUP_LOG%" echo COMMAND: "%PYTHON_EXE%" -m EngineData.LauncherApp.cuda_validation
"%PYTHON_EXE%" -m EngineData.LauncherApp.cuda_validation >> "%CUDA_SETUP_LOG%" 2>&1
"%PYTHON_EXE%" -m EngineData.LauncherApp.cuda_validation
if not errorlevel 1 (
  echo PASS: CUDA_CORE_PASS already achieved.
  >> "%CUDA_SETUP_LOG%" echo PASS: CUDA_CORE_PASS already achieved.
  exit /b 0
)

echo.
echo CUDA_CORE_PASS was not achieved.
echo PyTorch CPU-only build detected or CUDA tensor execution failed.
echo CUDA-enabled PyTorch wheels must be installed into the project runtime.
echo Official PyTorch selector: https://pytorch.org/get-started/locally/
echo.
echo This script can run the following command:
echo "%PYTHON_EXE%" -m pip install --upgrade pip
echo "%PYTHON_EXE%" -m pip install --upgrade --force-reinstall torch torchvision torchaudio --index-url %TORCH_CUDA_INDEX_URL%
echo.
set /p CONFIRM=Type YES to reinstall CUDA-enabled PyTorch wheels: 
if /I not "%CONFIRM%"=="YES" (
  echo WARN: CUDA PyTorch reinstall skipped by user.
  echo Next action: rerun TranslateIT.bat option 4 and type YES when ready.
  >> "%CUDA_SETUP_LOG%" echo WARN: CUDA PyTorch reinstall skipped by user.
  exit /b 1
)

echo.
echo Upgrading pip...
>> "%CUDA_SETUP_LOG%" echo COMMAND: "%PYTHON_EXE%" -m pip install --upgrade pip
"%PYTHON_EXE%" -m pip install --upgrade pip >> "%CUDA_SETUP_LOG%" 2>&1
if errorlevel 1 (
  echo FAIL: pip upgrade failed. See %CUDA_SETUP_LOG%.
  >> "%CUDA_SETUP_LOG%" echo FAIL: pip upgrade failed.
  exit /b 1
)

echo.
echo Installing CUDA-enabled PyTorch wheels...
echo Command:
echo "%PYTHON_EXE%" -m pip install --upgrade --force-reinstall torch torchvision torchaudio --index-url %TORCH_CUDA_INDEX_URL%
>> "%CUDA_SETUP_LOG%" echo COMMAND: "%PYTHON_EXE%" -m pip install --upgrade --force-reinstall torch torchvision torchaudio --index-url %TORCH_CUDA_INDEX_URL%
"%PYTHON_EXE%" -m pip install --upgrade --force-reinstall torch torchvision torchaudio --index-url %TORCH_CUDA_INDEX_URL% >> "%CUDA_SETUP_LOG%" 2>&1
if errorlevel 1 (
  echo FAIL: CUDA-enabled PyTorch installation failed.
  echo See setup log: %CUDA_SETUP_LOG%
  >> "%CUDA_SETUP_LOG%" echo FAIL: CUDA-enabled PyTorch installation failed.
  exit /b 1
)

echo.
echo Re-running CUDA validation...
>> "%CUDA_SETUP_LOG%" echo COMMAND: "%PYTHON_EXE%" -m EngineData.LauncherApp.cuda_validation
"%PYTHON_EXE%" -m EngineData.LauncherApp.cuda_validation >> "%CUDA_SETUP_LOG%" 2>&1
"%PYTHON_EXE%" -m EngineData.LauncherApp.cuda_validation
set "CUDA_EXIT=%ERRORLEVEL%"
if "%CUDA_EXIT%"=="0" (
  echo PASS: CUDA runtime setup completed with CUDA_CORE_PASS.
  >> "%CUDA_SETUP_LOG%" echo PASS: CUDA runtime setup completed with CUDA_CORE_PASS.
) else (
  echo FAIL: CUDA runtime setup finished, but CUDA_CORE_PASS is still not achieved.
  >> "%CUDA_SETUP_LOG%" echo FAIL: CUDA runtime setup finished, but CUDA_CORE_PASS is still not achieved.
)
exit /b %CUDA_EXIT%
