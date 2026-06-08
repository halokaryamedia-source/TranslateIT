# TranslateIT CUDA Setup Guide

## Why CUDA Is Required

TranslateIT Core App targets real-time Indonesian ASR with Faster-Whisper. The target production path requires NVIDIA CUDA acceleration. CPU mode is allowed only as explicit `CPU DEGRADED MODE` for emergency testing and does not represent target Core App performance.

## Official References

- NVIDIA CUDA Windows installation guide: https://docs.nvidia.com/cuda/cuda-installation-guide-microsoft-windows/
- NVIDIA CUDA Toolkit downloads: https://developer.nvidia.com/cuda-downloads
- PyTorch local install selector: https://pytorch.org/get-started/locally/

## Required Pieces

- NVIDIA Driver: exposes the GPU to Windows and provides `nvidia-smi`.
- CUDA-capable NVIDIA GPU: verify in Device Manager or with `nvidia-smi`.
- CUDA Toolkit: useful for development tools such as `nvcc`; not always required for PyTorch wheel runtime.
- PyTorch CUDA wheel/runtime: required for `torch.cuda.is_available()` to be true.
- CTranslate2/Faster-Whisper CUDA capability: required for GPU ASR execution.

System CUDA Toolkit alone is not enough. PyTorch must be installed as a CUDA-enabled build, not a CPU-only build.

## Check NVIDIA Driver

Open Command Prompt and run:

```bat
nvidia-smi
```

If this command is missing, install or update the NVIDIA driver first.

## Setup Order

1. Install or update the NVIDIA driver.
2. Double-click `TranslateIT.bat`.
3. Choose `4. Setup / Validate CUDA Core`.
4. If PyTorch CPU-only is detected, type `YES` to reinstall CUDA-enabled PyTorch wheels into the project runtime.
5. Confirm `CUDA_CORE_PASS`.
6. Run `TranslateIT.bat --validate` or choose `3. Validate Runtime` from the maintenance menu.
7. Double-click `TranslateIT.bat` to open the Operator Console directly.

## TranslateIT.bat CUDA Option

The `Setup / Validate CUDA Core` menu option:

- Detects `nvidia-smi`.
- Shows GPU and driver details.
- Detects `nvcc` when available.
- Checks current PyTorch version and CUDA build.
- Runs CUDA tensor execution validation.
- Offers to reinstall `torch`, `torchvision`, and `torchaudio` from an official PyTorch CUDA wheel index.
- Uses `https://download.pytorch.org/whl/cu126` by default.
- Supports override with `TRANSLATEIT_TORCH_CUDA_INDEX_URL`.
- Writes full setup output to `UserData/LogData/cuda_setup_latest.txt`.

It does not silently install drivers.
It does not silently reinstall PyTorch; type `YES` only when ready.

## CPU Degraded Mode

CPU degraded mode is slower and not the target performance mode. It must be explicitly enabled in the UI. In degraded mode:

- ASR device is `cpu`.
- Compute type is `int8`.
- `float16` is not used on CPU.
- Benchmarks are labeled as CPU degraded.

## Troubleshooting

- `nvidia-smi` not found: install or update NVIDIA driver.
- `torch.cuda.is_available()` false: install a CUDA-enabled PyTorch wheel.
- `torch.version.cuda` is `None`: current PyTorch is CPU-only.
- CUDA tensor execution fails: driver, wheel, or GPU runtime mismatch.
- PyTorch CPU-only: choose `4. Setup / Validate CUDA Core`, type `YES`, and wait for the CUDA wheel install to finish.
- pip install failed: check `UserData/LogData/cuda_setup_latest.txt`, then rerun option 4.
- CUDA out of memory: close GPU-heavy apps or use smaller backup model.
- `float16` unsupported on CPU: enable CPU degraded mode, which uses `int8`.
- Wrong torch wheel installed: choose `4. Setup / Validate CUDA Core` from `TranslateIT.bat`.
- Driver too old: update NVIDIA driver.
- Multiple Python environments: ensure commands use `DevelopingData\ToolKitData\rt\Scripts\python.exe`.
- Runtime validation passes Python but fails CUDA Core: fix CUDA before real ASR testing.
