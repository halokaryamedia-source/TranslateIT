"""TranslateIT OmniParser V2 HTTP bridge.

Default mode is detection-only for stability:
- PaddleOCR import is disabled automatically.
- Florence icon caption/local semantics is disabled by default.

This is enough for TranslateIT's first Figma gate because it needs useful visual
regions before editable reconstruction is allowed.
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
    use_local_semantics: bool
    box_threshold: float
    iou_threshold: float
    imgsz: int


def _bool_env(name: str, default: str = "0") -> bool:
    return os.environ.get(name, default).lower() in {"1", "true", "yes", "on"}


def _default_repo_path() -> Path:
    return Path(r"D:\Tools\OmniParser") if os.name == "nt" else Path.cwd() / "OmniParser"


def read_config() -> BridgeConfig:
    repo = Path(os.environ.get("OMNIPARSER_REPO", str(_default_repo_path()))).expanduser().resolve()
    weights = Path(os.environ.get("OMNIPARSER_WEIGHTS", str(repo / "weights"))).expanduser().resolve()
    return BridgeConfig(
        repo=repo,
        weights=weights,
        host=os.environ.get("OMNIPARSER_HOST", "127.0.0.1"),
        port=int(os.environ.get("OMNIPARSER_PORT", "7860")),
        use_paddleocr=_bool_env("OMNIPARSER_USE_PADDLEOCR", "0"),
        use_local_semantics=_bool_env("OMNIPARSER_USE_LOCAL_SEMANTICS", "0"),
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


def _replace_function_call(source: str, marker: str, replacement: str) -> str:
    start = source.find(marker)
    if start == -1:
        return source
    i = source.find("(", start)
    if i == -1:
        return source
    depth = 0
    for j in range(i, len(source)):
        if source[j] == "(":
            depth += 1
        elif source[j] == ")":
            depth -= 1
            if depth == 0:
                return source[:start] + replacement + source[j + 1:]
    return source


def _patch_omniparser_runtime() -> None:
    """Patch known external OmniParser/PaddleOCR incompatibility safely.

    New PaddleOCR versions reject legacy OmniParser arguments like show_log,
    max_batch_size, det_db_score_mode. Since TranslateIT runs OCR through EasyOCR
    for now, we disable the eager PaddleOCR object creation before importing util.utils.
    """
    utils_path = CONFIG.repo / "util" / "utils.py"
    if not utils_path.exists():
        return
    text = utils_path.read_text(encoding="utf-8")
    patched = _replace_function_call(text, "paddle_ocr = PaddleOCR", "paddle_ocr = None  # PATCHED_TRANSLATEIT_DISABLE_PADDLEOCR")
    if patched != text:
        utils_path.write_text(patched, encoding="utf-8")


def _load_omniparser_modules() -> Tuple[Any, Any, Any, Any, Any]:
    if not CONFIG.repo.exists():
        raise RuntimeError(f"OMNIPARSER_REPO does not exist: {CONFIG.repo}")
    _patch_omniparser_runtime()
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
    except Exception as exc:
        raise RuntimeError(f"Could not import OmniParser dependencies: {exc}") from exc
    return Image, check_ocr_box, get_caption_model_processor, get_som_labeled_img, get_yolo_model


def _get_models() -> Dict[str, Any]:
    if _MODEL_STATE:
        return _MODEL_STATE

    Image, check_ocr_box, get_caption_model_processor, get_som_labeled_img, get_yolo_model = _load_omniparser_modules()
    icon_model = CONFIG.weights / "icon_detect" / "model.pt"
    caption_folder = CONFIG.weights / "icon_caption_florence"
    if not icon_model.exists():
        raise RuntimeError(f"OmniParser icon detect model is missing: {icon_model}")

    caption_processor = None
    if CONFIG.use_local_semantics:
        if not caption_folder.exists():
            raise RuntimeError(f"OmniParser Florence caption folder is missing: {caption_folder}")
        caption_processor = get_caption_model_processor(model_name="florence2", model_name_or_path=str(caption_folder))

    _MODEL_STATE.update({
        "Image": Image,
        "check_ocr_box": check_ocr_box,
        "get_som_labeled_img": get_som_labeled_img,
        "yolo_model": get_yolo_model(model_path=str(icon_model)),
        "caption_model_processor": caption_processor,
    })
    return _MODEL_STATE


def _decode_image(image_base64: str) -> Any:
    Image = _get_models()["Image"]
    if not image_base64:
        raise ValueError("image_base64 is required")
    image_base64 = re.sub(r"^data:image/[^;]+;base64,", "", image_base64.strip())
    return Image.open(io.BytesIO(base64.b64decode(image_base64))).convert("RGB")


def _bbox_to_rect(bbox: Iterable[float], width: int, height: int) -> Dict[str, int]:
    values = list(bbox)
    if len(values) != 4:
        return {"x": 0, "y": 0, "w": 0, "h": 0}
    x1, y1, x2, y2 = values
    if max(abs(x1), abs(y1), abs(x2), abs(y2)) <= 1.5:
        x1, x2 = x1 * width, x2 * width
        y1, y2 = y1 * height, y2 * height
    return {"x": max(0, int(round(min(x1, x2)))), "y": max(0, int(round(min(y1, y2)))), "w": max(0, int(round(abs(x2 - x1)))), "h": max(0, int(round(abs(y2 - y1))))}


def _role_for(item: Dict[str, Any]) -> str:
    raw_type = str(item.get("type") or item.get("role") or "").lower()
    content = str(item.get("content") or item.get("text") or "").lower()
    if raw_type == "text":
        return "text"
    if "nav" in content or "menu" in content:
        return "navigation"
    if bool(item.get("interactivity")) or raw_type == "icon":
        return "button"
    if raw_type in {"image", "media", "picture", "photo"}:
        return "image"
    if raw_type in {"container", "section", "group"}:
        return "container"
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
    ratio = width / 3200
    draw_bbox_config = {
        "text_scale": 0.8 * ratio,
        "text_thickness": max(int(2 * ratio), 1),
        "text_padding": max(int(3 * ratio), 1),
        "thickness": max(int(3 * ratio), 1),
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
        use_local_semantics=CONFIG.use_local_semantics,
        iou_threshold=CONFIG.iou_threshold,
        imgsz=CONFIG.imgsz,
    )

    regions: List[Dict[str, Any]] = []
    for index, item in enumerate(parsed_content_list or []):
        rect = _bbox_to_rect(item.get("bbox") or label_coordinates.get(str(index)) or [0, 0, 0, 0], width, height)
        if rect["w"] <= 2 or rect["h"] <= 2:
            continue
        regions.append({
            "id": f"omniparser-{index}",
            "role": _role_for(item),
            "text": str(item.get("content") or "").strip(),
            "confidence": _confidence_for(item),
            "rect": rect,
            "source": item.get("source") or "omniparser-v2",
            "rawType": item.get("type"),
            "interactive": bool(item.get("interactivity")),
        })

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
            "usePaddleOCR": CONFIG.use_paddleocr,
            "useLocalSemantics": CONFIG.use_local_semantics,
        },
    }


class OmniParserBridgeHandler(BaseHTTPRequestHandler):
    server_version = "TranslateITOmniParserBridge/1.1"

    def do_OPTIONS(self) -> None:
        _json_response(self, 200, {"ok": True})

    def do_GET(self) -> None:
        if self.path in {"/health", "/"}:
            _json_response(self, 200, {"ok": True, "engine": "omniparser-v2-bridge", "repo": str(CONFIG.repo), "weights": str(CONFIG.weights), "parseEndpoint": "/parse", "usePaddleOCR": CONFIG.use_paddleocr, "useLocalSemantics": CONFIG.use_local_semantics})
            return
        _json_response(self, 404, {"ok": False, "error": "Route not found. Use /health or /parse."})

    def do_POST(self) -> None:
        if self.path != "/parse":
            _json_response(self, 404, {"ok": False, "error": "Route not found. Use /parse."})
            return
        try:
            length = int(self.headers.get("content-length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
            _json_response(self, 200, parse_image(_decode_image(str(payload.get("image_base64") or "")), payload))
        except Exception as exc:
            _json_response(self, 500, {"ok": False, "engine": "omniparser-v2-bridge", "error": str(exc), "trace": traceback.format_exc().splitlines()[-12:]})

    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


def main() -> None:
    print(f"TranslateIT OmniParser Bridge running on http://{CONFIG.host}:{CONFIG.port}")
    print(f"OMNIPARSER_REPO={CONFIG.repo}")
    print(f"OMNIPARSER_WEIGHTS={CONFIG.weights}")
    print(f"OMNIPARSER_USE_PADDLEOCR={CONFIG.use_paddleocr}")
    print(f"OMNIPARSER_USE_LOCAL_SEMANTICS={CONFIG.use_local_semantics}")
    ThreadingHTTPServer((CONFIG.host, CONFIG.port), OmniParserBridgeHandler).serve_forever()


if __name__ == "__main__":
    main()
