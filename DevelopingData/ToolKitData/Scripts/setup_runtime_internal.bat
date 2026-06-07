@echo off
setlocal EnableExtensions
cd /d "%~dp0..\..\.."

echo TranslateIT runtime setup
echo =========================

set "RUNTIME_DIR=DevelopingData\ToolKitData\rt"
set "PYTHON_EXE=%RUNTIME_DIR%\Scripts\python.exe"
set "REQ_FILE=DevelopingData\ToolKitData\requirements-prototype.txt"
set "PIP_DISABLE_PIP_VERSION_CHECK=1"

if not exist "UserData\LogData" mkdir "UserData\LogData"

if not exist "DevelopingData\ToolKitData" (
  echo FAIL: DevelopingData\ToolKitData is missing.
  exit /b 1
)

if not exist "%REQ_FILE%" (
  echo WARN: requirements file missing. Creating %REQ_FILE%.
  > "%REQ_FILE%" echo PySide6
  >> "%REQ_FILE%" echo sounddevice
  >> "%REQ_FILE%" echo faster-whisper
  >> "%REQ_FILE%" echo ctranslate2
  >> "%REQ_FILE%" echo torch
  >> "%REQ_FILE%" echo transformers
  >> "%REQ_FILE%" echo sentencepiece
  >> "%REQ_FILE%" echo sacremoses
  >> "%REQ_FILE%" echo numpy
) else (
  echo PASS: Found %REQ_FILE%.
)

if not exist "%PYTHON_EXE%" (
  echo WARN: Runtime environment not found. Creating %RUNTIME_DIR%.
  py -3 -m venv "%RUNTIME_DIR%"
  if errorlevel 1 (
    echo FAIL: Could not create Python virtual environment. Install Python 3 and retry.
    exit /b 1
  )
) else (
  echo PASS: Runtime Python found at %PYTHON_EXE%.
)

echo PASS: Checking required imports.
"%PYTHON_EXE%" -c "import PySide6, sounddevice, numpy, torch, faster_whisper, ctranslate2, transformers, sentencepiece, sacremoses"
if errorlevel 1 (
  echo WARN: One or more imports are missing. Installing prototype dependencies from %REQ_FILE%.
  "%PYTHON_EXE%" -m pip install --disable-pip-version-check -r "%REQ_FILE%"
  if errorlevel 1 (
    echo FAIL: Dependency installation failed. Check the pip output above.
    exit /b 1
  )
) else (
  echo PASS: Required prototype dependencies are already importable.
)

if exist "DevelopingData\ToolKitData\download_models.py" (
  echo WARN: Optional model downloader is available:
  echo       "%PYTHON_EXE%" "DevelopingData\ToolKitData\download_models.py"
  echo       Run it manually only if you intend to fetch or refresh local model assets.
) else (
  echo WARN: No optional model download script was found.
)

echo PASS: Runtime setup completed.
exit /b 0
