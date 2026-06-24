import base64
import io
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

HOST = os.environ.get('OMNIPARSER_HOST', '127.0.0.1')
PORT = int(os.environ.get('OMNIPARSER_PORT', '7860'))
OMNI_REPO = Path(os.environ.get('OMNIPARSER_REPO', r'D:\Tools\OmniParser'))
WEIGHTS = Path(os.environ.get('OMNIPARSER_WEIGHTS', str(OMNI_REPO / 'weights')))
USE_PADDLEOCR = os.environ.get('OMNIPARSER_USE_PADDLEOCR', '0') == '1'

if str(OMNI_REPO) not in sys.path:
    sys.path.insert(0, str(OMNI_REPO))

from PIL import Image
from util.utils import check_ocr_box, get_som_labeled_img, get_yolo_model

MODEL_PATH = WEIGHTS / 'icon_detect' / 'model.pt'
if not MODEL_PATH.exists():
    raise RuntimeError(f'Missing OmniParser detect model: {MODEL_PATH}')

YOLO_MODEL = get_yolo_model(str(MODEL_PATH))


def parse_image(image_base64, title=''):
    if ',' in image_base64[:80]:
        image_base64 = image_base64.split(',', 1)[1]
    image = Image.open(io.BytesIO(base64.b64decode(image_base64))).convert('RGB')
    width, height = image.size
    ocr_result, _ = check_ocr_box(
        image,
        display_img=False,
        output_bb_format='xyxy',
        easyocr_args={'paragraph': False, 'text_threshold': 0.8},
        use_paddleocr=USE_PADDLEOCR,
    )
    ocr_text, ocr_bbox = ocr_result
    _, label_coordinates, parsed_content = get_som_labeled_img(
        image,
        YOLO_MODEL,
        BOX_TRESHOLD=0.05,
        output_coord_in_ratio=True,
        ocr_bbox=ocr_bbox,
        ocr_text=ocr_text,
        caption_model_processor=None,
        use_local_semantics=False,
        iou_threshold=0.1,
        imgsz=640,
    )
    regions = []
    for index, item in enumerate(parsed_content or []):
        bbox = item.get('bbox') or []
        if len(bbox) == 4:
            x1, y1, x2, y2 = [float(v) for v in bbox]
            regions.append({
                'id': f'omni-{index}',
                'role': item.get('type') or 'region',
                'confidence': 0.9 if item.get('source') == 'box_ocr_content_ocr' else 0.7,
                'content': item.get('content') or '',
                'source': item.get('source') or 'omniparser',
                'rect': {
                    'x': round(x1 * width),
                    'y': round(y1 * height),
                    'w': round((x2 - x1) * width),
                    'h': round((y2 - y1) * height),
                },
            })
    if not regions and label_coordinates:
        for key, value in label_coordinates.items():
            x, y, w, h = [float(v) for v in value]
            regions.append({
                'id': f'omni-{key}',
                'role': 'region',
                'confidence': 0.65,
                'content': '',
                'source': 'omniparser-label-coordinate',
                'rect': {'x': round(x * width), 'y': round(y * height), 'w': round(w * width), 'h': round(h * height)},
            })
    return {
        'ok': True,
        'engine': 'omniparser-detection-only',
        'title': title,
        'image': {'width': width, 'height': height},
        'regions': regions,
        'diagnostics': {
            'regionCount': len(regions),
            'ocrCount': len(ocr_text or []),
            'useLocalSemantics': False,
            'captionModel': 'disabled',
            'flashAttnRequired': False,
        },
    }


class Handler(BaseHTTPRequestHandler):
    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._json(200, {'ok': True})

    def do_GET(self):
        if self.path in ('/', '/health'):
            self._json(200, {'ok': True, 'engine': 'omniparser-detection-only', 'parse': '/parse'})
        else:
            self._json(404, {'ok': False, 'error': 'Use POST /parse'})

    def do_POST(self):
        if self.path != '/parse':
            self._json(404, {'ok': False, 'error': 'Use POST /parse'})
            return
        try:
            length = int(self.headers.get('Content-Length') or '0')
            payload = json.loads(self.rfile.read(length).decode('utf-8') or '{}')
            if payload.get('healthcheck'):
                self._json(200, {'ok': True, 'engine': 'omniparser-detection-only', 'parse': '/parse'})
                return
            image_base64 = payload.get('image_base64') or ''
            if not image_base64:
                self._json(400, {'ok': False, 'error': 'image_base64 is required'})
                return
            self._json(200, parse_image(image_base64, payload.get('title') or ''))
        except Exception as exc:
            self._json(500, {'ok': False, 'error': str(exc)})


print(f'OmniParser detection-only endpoint running on http://{HOST}:{PORT}/parse')
print('Caption model disabled. flash_attn is not required.')
HTTPServer((HOST, PORT), Handler).serve_forever()
