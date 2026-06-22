"""TranslateIT OmniParser V2 HTTP bridge.

This script is intentionally kept outside the Node RenderBridge runtime.
It exposes a small `/parse` endpoint that converts Microsoft OmniParser output into
TranslateIT's visual region contract.

Expected request:
    POST /parse
    {"image_base64":"...", "url":"https://...", "title":"..."}

Expected response:
    {"engine":"omniparser-v2-bridge", "regions":[...]}

Environment variables:
    OMNIPARSER_REPO        Path to the cloned microsoft/OmniParser repo.
                           Default: D:\\Tools\\OmniParser on Windows, ./OmniParser elsewhere.
    OMNIPARSER_WEIGHTS     Path to the OmniParser weights folder.
                           Default: <OMNIPARSER_REPO>/weights
    OMNIPARSER_HOST        Default: 127.0.0.1
    OMNIPARSER_PORT        Default: 7860
    OMNIPARSER_USE_PADDLEOCR  Default: 1
    OMNIPARSER_BOX_THRESHOLD  Default: 0.05
    OMNIPARSER_IOU_THRESHOLD  Default: 0.10
    OMNIPARSER_IMGSZ          Default: 640

Notes:
    - This bridge does not make TranslateIT Figma-ready by itself.
    - TranslateIT still blocks Figma testing until engine-pipeline-readiness passes.
"""

from __future__ import annotations

import base64
import io
import json
import os
import re
import sys
import traceback
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple


@dataclass(frozen=True)
class BridgeConfig:
    repo: Path
    weights: Path
    host: str
    port: int
    use_paddleocr: bool
    box_threshold: float
    iou_threshold: float
    imgsz: int


def _default_repo_path() -> Path:
    if os.name == "nt":
        return Path(r"D:\Tools\OmniParser")
    return Path.cwd() / "OmniParser"


def read_config() -> BridgeConfig:
    repo = Path(os.environ.get("OMNIPARSER_REPO", str(_default_repo_path()))).expanduser().resolve()
    weights = Path(os.environ.get("OMNIPARSER_WEIGHTS", str(repo / "weights"))).expanduser().resolve()
    return BridgeConfig(
        repo=repo,
        weights=weights,
        host=os.environ.get("OMNIPARSER_HOST", "127.0.0.1"),
        port=int(os.environ.get("OMNIPARSER_PORT", "7860")),
        use_paddleocr=os.environ.get("OMNIPARSER_USE_PADDLEOCR", "1").lower() in {"1", "true", "yes", "on"},
        box_threshold=float(os.environ.get("OMNIPARSER_BOX_THRESHOLD", "0.05")),
        iou_threshold=float(os.environ.get("OMNIPARSER_IOU_THRESHOLD", "0.10")),
        imgsz=int(os.environ.get("OMNIPARSER_IMGSZ", "640")),
    )


CONFIG = read_config()
_MODEL_STATE: Dict[str, Any] = {}


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: Dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("content-type", "application/json; charset=utf-8")
    handler.send_header("access-control-allow-origin", "*")
    handler.send_header("access-control-allow-methods", "GET, POST, OPTIONS")
    handler.send_header("access-control-allow-headers", "content-type")
    handler.send_header("content-length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _load_omniparser_modules() -> Tuple[Any, Any, Any, Any]:
    if not CONFIG.repo.exists():
        raise RuntimeError(f"OMNIPARSER_REPO does not exist: {CONFIG.repo}")
    if str(CONFIG.repo) not in sys.path:
        sys.path.insert(0, str(CONFIG.repo))

    try:
        from PIL import Image  # type: ignore
        from util.utils import (  # type: ignore
            check_ocr_box,
            get_caption_model_processor,
            get_som_labeled_img,
            get_yolo_model,
        )
    except Exception as exc:  # pragma: no cover - depends on external OmniParser install
        raise RuntimeError(
            "Could not import OmniParser dependencies. Activate the OmniParser Python environment "
            "and run `pip install -r requirements.txt` inside the OmniParser repo."
        ) from exc
    return Image, check_ocr_box, get_caption_model_processor, get_som_labeled_img, get_yolo_model


def _get_models() -> Dict[str, Any]:
    if _MODEL_STATE:
        return _MODEL_STATE

    Image, check_ocr_box, get_caption_model_processor, get_som_labeled_img, get_yolo_model = _load_omniparser_modules()

    icon_model = CONFIG.weights / "icon_detect" / "model.pt"
    caption_model = CONFIG.weights / "icon_caption_florence"
    if not icon_model.exists():
        raise RuntimeError(f"OmniParser icon detect model is missing: {icon_model}")
    if not caption_model.exists():
        raise RuntimeError(f"OmniParser Florence caption folder is missing: {caption_model}")

    _MODEL_STATE.update(
        {
            "Image": Image,
            "check_ocr_box": check_ocr_box,
            "get_som_labeled_img": get_som_labeled_img,
            "yolo_model": get_yolo_model(model_path=str(icon_model)),
            "caption_model_processor": get_caption_model_processor(
                model_name="florence2", model_name_or_path=str(caption_model)
            ),
        }
    )
    return _MODEL_STATE


def _decode_image(image_base64: str) -> Any:
    models = _get_models()
    Image = models["Image"]
    if not image_base64:
        raise ValueError("image_base64 is required")
    image_base64 = re.sub(r"^data:image/[^;]+;base64,", "", image_base64.strip())
    image_bytes = base64.b64decode(image_base64)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def _bbox_to_rect(bbox: Iterable[float], width: int, height: int) -> Dict[str, int]:
    values = list(bbox)
    if len(values) != 4:
        return {"x": 0, "y": 0, "w": 0, "h": 0}

    # OmniParser returns xyxy ratios when output_coord_in_ratio=True.
    x1, y1, x2, y2 = values
    if max(abs(x1), abs(y1), abs(x2), abs(y2)) <= 1.5:
        x1, x2 = x1 * width, x2 * width
        y1, y2 = y1 * height, y2 * height

    x = int(round(min(x1, x2)))
    y = int(round(min(y1, y2)))
    w = int(round(abs(x2 - x1)))
    h = int(round(abs(y2 - y1)))
    return {"x": max(0, x), "y": max(0, y), "w": max(0, w), "h": max(0, h)}


def _role_for(item: Dict[str, Any]) -> str:
    raw_type = str(item.get("type") or item.get("role") or "").lower()
    content = str(item.get("content") or item.get("text") or "").lower()
    interactive = bool(item.get("interactivity"))

    if raw_type == "text":
        return "text"
    if "nav" in content or "menu" in content:
        return "navigation"
    if interactive:
        return "button"
    if raw_type in {"image", "media", "picture", "photo"}:
        return "image"
    if raw_type in {"container", "section", "group"}:
        return "container"
    if raw_type == "icon":
        return "button"
    return "unknown"


def _confidence_for(item: Dict[str, Any]) -> float:
    for key in ("confidence", "score", "probability"):
        if key in item:
            try:
                return float(item[key])
            except Exception:
                pass
    return 0.75 if item.get("interactivity") else 0.65


def parse_image(image: Any, request_meta: Dict[str, Any]) -> Dict[str, Any]:
    models = _get_models()
    width, height = image.size

    box_overlay_ratio = width / 3200
    draw_bbox_config = {
        "text_scale": 0.8 * box_overlay_ratio,
        "text_thickness": max(int(2 * box_overlay_ratio), 1),
        "text_padding": max(int(3 * box_overlay_ratio), 1),
        "thickness": max(int(3 * box_overlay_ratio), 1),
    }

    ocr_bbox_result, _ = models["check_ocr_box"](
        image,
        display_img=False,
        output_bb_format="xyxy",
        goal_filtering=None,
        easyocr_args={"paragraph": False, "text_threshold": 0.9},
        use_paddleocr=CONFIG.use_paddleocr,
    )
    ocr_text, ocr_bbox = ocr_bbox_result

    _, label_coordinates, parsed_content_list = models["get_som_labeled_img"](
        image,
        models["yolo_model"],
        BOX_TRESHOLD=CONFIG.box_threshold,
        output_coord_in_ratio=True,
        ocr_bbox=ocr_bbox,
        draw_bbox_config=draw_bbox_config,
        caption_model_processor=models["caption_model_processor"],
        ocr_text=ocr_text,
        iou_threshold=CONFIG.iou_threshold,
        imgsz=CONFIG.imgsz,
    )

    regions: List[Dict[str, Any]] = []
    for index, item in enumerate(parsed_content_list or []):
        bbox = item.get("bbox") or label_coordinates.get(str(index))
        rect = _bbox_to_rect(bbox or [0, 0, 0, 0], width, height)
        if rect["w"] <= 2 or rect["h"] <= 2:
            continue
        regions.append(
            {
                "id": f"omniparser-{index}",
                "role": _role_for(item),
                "text": str(item.get("content") or "").strip(),
                "confidence": _confidence_for(item),
                "rect": rect,
                "source": item.get("source") or "omniparser-v2",
                "rawType": item.get("type"),
                "interactive": bool(item.get("interactivity")),
            }
        )

    return {
        "engine": "omniparser-v2-bridge",
        "version": "translateit-omniparser-bridge-v1",
        "url": request_meta.get("url", ""),
        "title": request_meta.get("title", ""),
        "image": {"width": width, "height": height},
        "regions": regions,
        "diagnostics": {
            "regions": len(regions),
            "textRegions": len([r for r in regions if r["role"] == "text"]),
            "buttons": len([r for r in regions if r["role"] == "button"]),
            "images": len([r for r in regions if r["role"] == "image"]),
            "containers": len([r for r in regions if r["role"] == "container"]),
        },
    }


class OmniParserBridgeHandler(BaseHTTPRequestHandler):
    server_version = "TranslateITOmniParserBridge/1.0"

    def do_OPTIONS(self) -> None:  # noqa: N802
        _json_response(self, 200, {"ok": True})

    def do_GET(self) -> None:  # noqa: N802
        if self.path in {"/health", "/"}:
            payload = {
                "ok": True,
                "engine": "omniparser-v2-bridge",
                "repo": str(CONFIG.repo),
                "weights": str(CONFIG.weights),
                "parseEndpoint": "/parse",
            }
            _json_response(self, 200, payload)
            return
        _json_response(self, 404, {"ok": False, "error": "Route not found. Use /health or /parse."})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/parse":
            _json_response(self, 404, {"ok": False, "error": "Route not found. Use /parse."})
            return

        try:
            length = int(self.headers.get("content-length", "0"))
            body = self.rfile.read(length).decode("utf-8")
            payload = json.loads(body or "{}")
            image = _decode_image(str(payload.get("image_base64") or ""))
            result = parse_image(image, payload)
            _json_response(self, 200, result)
        except Exception as exc:  # pragma: no cover - runtime diagnostics
            _json_response(
                self,
                500,
                {
                    "ok": False,
                    "engine": "omniparser-v2-bridge",
                    "error": str(exc),
                    "trace": traceback.format_exc().splitlines()[-8:],
                },
            )

    def log_message(self, format: str, *args: Any) -> None:
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), format % args))


def main() -> None:
    print(f"TranslateIT OmniParser Bridge running on http://{CONFIG.host}:{CONFIG.port}")
    print(f"OMNIPARSER_REPO={CONFIG.repo}")
    print(f"OMNIPARSER_WEIGHTS={CONFIG.weights}")
    server = ThreadingHTTPServer((CONFIG.host, CONFIG.port), OmniParserBridgeHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
