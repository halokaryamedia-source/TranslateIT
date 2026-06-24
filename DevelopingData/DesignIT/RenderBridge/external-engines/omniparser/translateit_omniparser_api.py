import base64
import io
import re
from typing import Any, Dict, List, Optional

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image

from util.utils import check_ocr_box, get_caption_model_processor, get_som_labeled_img, get_yolo_model

app = FastAPI(title="TranslateIT OmniParser Adapter", version="0.1.0")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
yolo_model = None
caption_model_processor = None

class ParseRequest(BaseModel):
    image_base64: str
    url: Optional[str] = ""
    title: Optional[str] = ""
    box_threshold: float = 0.05
    iou_threshold: float = 0.10
    use_paddleocr: bool = True
    imgsz: int = 640


def load_models():
    global yolo_model, caption_model_processor
    if yolo_model is None:
        yolo_model = get_yolo_model(model_path="weights/icon_detect/model.pt")
    if caption_model_processor is None:
        caption_model_processor = get_caption_model_processor(model_name="florence2", model_name_or_path="weights/icon_caption_florence")


def decode_image(data: str) -> Image.Image:
    raw = data.split(",", 1)[-1]
    try:
        return Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image_base64: {exc}")


def ratio_box_to_rect(box: Any, width: int, height: int) -> Dict[str, int]:
    if isinstance(box, dict):
        x = box.get("x", box.get("left", 0))
        y = box.get("y", box.get("top", 0))
        w = box.get("w", box.get("width", 0))
        h = box.get("h", box.get("height", 0))
        return {"x": round(float(x)), "y": round(float(y)), "w": round(float(w)), "h": round(float(h))}
    if not isinstance(box, (list, tuple)) or len(box) < 4:
        return {"x": 0, "y": 0, "w": 1, "h": 1}
    x1, y1, x2, y2 = [float(v) for v in box[:4]]
    if max(x1, y1, x2, y2) <= 1.5:
        x1, x2 = x1 * width, x2 * width
        y1, y2 = y1 * height, y2 * height
    return {"x": round(min(x1, x2)), "y": round(min(y1, y2)), "w": round(abs(x2 - x1)), "h": round(abs(y2 - y1))}


def role_from_text(text: str) -> str:
    t = (text or "").lower()
    if "button" in t or "click" in t or "submit" in t:
        return "button"
    if "icon" in t:
        return "image"
    if "text" in t or len(t) > 12:
        return "text"
    return "container"


def normalize(parsed_content: Any, label_coordinates: Any, width: int, height: int) -> List[Dict[str, Any]]:
    regions = []
    coords = label_coordinates if isinstance(label_coordinates, dict) else {}
    items = parsed_content if isinstance(parsed_content, list) else []
    for idx, item in enumerate(items):
        text = str(item)
        box = coords.get(idx) or coords.get(str(idx)) or {}
        if isinstance(item, dict):
            text = item.get("content") or item.get("text") or item.get("caption") or str(item)
            box = item.get("bbox") or item.get("box") or item.get("rect") or box
        regions.append({
            "id": f"omni-{idx}",
            "role": role_from_text(text),
            "text": re.sub(r"\s+", " ", text).strip(),
            "confidence": 0.75,
            "rect": ratio_box_to_rect(box, width, height),
            "source": "omniparser-v2"
        })
    return [r for r in regions if r["rect"]["w"] > 1 and r["rect"]["h"] > 1]


@app.get("/health")
def health():
    return {"ok": True, "adapter": "translateit-omniparser-api", "device": str(DEVICE), "modelsLoaded": yolo_model is not None and caption_model_processor is not None}


@app.post("/parse")
def parse(req: ParseRequest):
    load_models()
    image = decode_image(req.image_base64)
    width, height = image.size
    try:
        ocr_result, _ = check_ocr_box(image, display_img=False, output_bb_format="xyxy", goal_filtering=None, easyocr_args={"paragraph": False, "text_threshold": 0.9}, use_paddleocr=req.use_paddleocr)
        text, ocr_bbox = ocr_result
        _, label_coordinates, parsed_content = get_som_labeled_img(image, yolo_model, BOX_TRESHOLD=req.box_threshold, output_coord_in_ratio=True, ocr_bbox=ocr_bbox, caption_model_processor=caption_model_processor, ocr_text=text, iou_threshold=req.iou_threshold, imgsz=req.imgsz)
        regions = normalize(parsed_content, label_coordinates, width, height)
        return {"engine": "omniparser-v2", "title": req.title, "url": req.url, "regions": regions, "diagnostics": {"regions": len(regions), "width": width, "height": height, "device": str(DEVICE)}}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OmniParser parse failed: {exc}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=7860)
