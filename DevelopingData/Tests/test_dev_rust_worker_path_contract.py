from __future__ import annotations

import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CAPTURE_LIFECYCLE = PROJECT_ROOT / "EngineData" / "LauncherApp" / "RustApp" / "src-tauri" / "src" / "engine" / "capture_lifecycle.rs"
MANIFEST_LOGIC = PROJECT_ROOT / "EngineData" / "LauncherApp" / "RustApp" / "src-tauri" / "src" / "engine" / "adapters" / "local_worker_manifest_logic.rs"
WORKER_RUNTIME = PROJECT_ROOT / "EngineData" / "Backend" / "LocalWorker" / "WorkerRuntime" / "realtime_local_worker.py"


class DevRustWorkerPathContractTests(unittest.TestCase):
    def test_rust_capture_uses_backend_worker_runtime_path(self) -> None:
        source = CAPTURE_LIFECYCLE.read_text(encoding="utf-8")
        self.assertIn('.join("Backend")', source)
        self.assertIn('.join("LocalWorker")', source)
        self.assertIn('.join("WorkerRuntime")', source)
        self.assertIn('.join("realtime_local_worker.py")', source)
        self.assertNotIn('.join("Workers")', source)

    def test_manifest_logic_and_worker_file_use_same_runtime_location(self) -> None:
        source = MANIFEST_LOGIC.read_text(encoding="utf-8")
        self.assertIn('.join("Backend")', source)
        self.assertIn('.join("LocalWorker")', source)
        self.assertIn('.join("WorkerRuntime")', source)
        self.assertTrue(WORKER_RUNTIME.exists(), "Expected backend realtime worker file to exist")


if __name__ == "__main__":
    unittest.main()
