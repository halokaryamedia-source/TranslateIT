param(
  [string]$Port = '7860'
)

$ErrorActionPreference = 'Stop'

function Step($Text) {
  Write-Host "`n==> $Text" -ForegroundColor Cyan
}

function ToWslPath($WindowsPath) {
  $resolved = [System.IO.Path]::GetFullPath($WindowsPath)
  $result = wsl.exe wslpath -a "$resolved"
  return ($result | Select-Object -First 1).Trim()
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TranslateItRoot = Resolve-Path (Join-Path $ScriptDir '..')
$RepoRoot = Resolve-Path (Join-Path $TranslateItRoot '..\..\..')
$DesignItDataRoot = Join-Path $RepoRoot 'UserData\CacheData\DesignIT'
$DesignItDataWsl = ToWslPath $DesignItDataRoot

$bash = @"
set -e
DESIGNIT_DATA='$DesignItDataWsl'
OMNI_DIR="`$DESIGNIT_DATA/_external/OmniParser"
PORT='$Port'

mkdir -p "`$DESIGNIT_DATA/_external" "`$DESIGNIT_DATA/_runtime" "`$DESIGNIT_DATA/_reports"

if [ ! -d "`$OMNI_DIR/.git" ]; then
  if [ -d "`$HOME/OmniParser/.git" ]; then
    cp -a "`$HOME/OmniParser" "`$OMNI_DIR"
  else
    git clone https://github.com/microsoft/OmniParser.git "`$OMNI_DIR"
  fi
fi

cd "`$OMNI_DIR"

if [ ! -f "`$HOME/miniforge3/etc/profile.d/conda.sh" ]; then
  echo "Miniforge is not installed at `$HOME/miniforge3. Run setup once before starting OmniParser."
  exit 1
fi

source "`$HOME/miniforge3/etc/profile.d/conda.sh"
conda activate omni

python -m pip install -U fastapi uvicorn pydantic pillow >/dev/null

cat > designit_parse_server.py <<'PY'
import base64
import io
from typing import Optional, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import uvicorn

from util.utils import check_ocr_box, get_yolo_model, get_caption_model_processor, get_som_labeled_img

print('[DesignIT] Loading OmniParser full models...')
yolo_model = get_yolo_model(model_path='weights/icon_detect/model.pt')
caption_model_processor = get_caption_model_processor(model_name='florence2', model_name_or_path='weights/icon_caption_florence')
print('[DesignIT] Models loaded.')

app = FastAPI(title='DesignIT OmniParser Parse Server')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])

class ParseRequest(BaseModel):
    image_base64: Optional[str] = ''
    title: Optional[str] = ''
    url: Optional[str] = ''
    healthcheck: Optional[bool] = False
    box_threshold: Optional[float] = 0.05
    iou_threshold: Optional[float] = 0.1
    use_paddleocr: Optional[bool] = True
    imgsz: Optional[int] = 640

def clean_b64(value: str) -> str:
    value = value or ''
    if value.lower().startswith('data:') and ',' in value:
        return value.split(',', 1)[1]
    return value

def rect_from_coord(coord: Any, width: int, height: int):
    if isinstance(coord, dict):
        if 'bbox' in coord:
            return rect_from_coord(coord['bbox'], width, height)
        if all(k in coord for k in ['x', 'y', 'w', 'h']):
            x, y, w, h = coord['x'], coord['y'], coord['w'], coord['h']
        elif all(k in coord for k in ['left', 'top', 'right', 'bottom']):
            x, y = coord['left'], coord['top']
            w, h = coord['right'] - coord['left'], coord['bottom'] - coord['top']
        else:
            return None
    elif isinstance(coord, (list, tuple)) and len(coord) >= 4:
        x, y, a, b = coord[:4]
        if max(abs(float(x)), abs(float(y)), abs(float(a)), abs(float(b))) <= 1.5:
            x, y, a, b = float(x) * width, float(y) * height, float(a) * width, float(b) * height
        if float(a) > float(x) and float(b) > float(y):
            w, h = float(a) - float(x), float(b) - float(y)
        else:
            w, h = float(a), float(b)
    else:
        return None
    return {'x': int(round(max(0, float(x)))), 'y': int(round(max(0, float(y)))), 'w': int(round(max(1, float(w)))), 'h': int(round(max(1, float(h))))}

def role_from_text(text: str):
    t = str(text or '').lower()
    if 'button' in t or 'click' in t:
        return 'button'
    if 'text' in t or 'ocr' in t:
        return 'text'
    if 'icon' in t or 'image' in t or 'picture' in t:
        return 'image'
    if 'input' in t or 'field' in t:
        return 'input'
    return 'container'

def normalize_regions(label_coordinates, parsed_content_list, width, height):
    regions = []
    content = parsed_content_list if isinstance(parsed_content_list, list) else []
    if isinstance(label_coordinates, dict):
        iterable = list(label_coordinates.items())
        for i, (key, coord) in enumerate(iterable):
            rect = rect_from_coord(coord, width, height)
            if not rect:
                continue
            text = str(content[i] if i < len(content) else key)
            regions.append({'id': f'omni-{i}', 'role': role_from_text(text), 'text': text[:240], 'confidence': 0.8, 'rect': rect, 'source': 'omniparser-full'})
    elif isinstance(label_coordinates, list):
        for i, coord in enumerate(label_coordinates):
            rect = rect_from_coord(coord, width, height)
            if not rect:
                continue
            text = str(content[i] if i < len(content) else f'region {i}')
            regions.append({'id': f'omni-{i}', 'role': role_from_text(text), 'text': text[:240], 'confidence': 0.8, 'rect': rect, 'source': 'omniparser-full'})
    return regions

@app.get('/health')
def health():
    return {'ok': True, 'engine': 'omniparser-full', 'endpoint': '/parse'}

@app.post('/parse')
def parse(req: ParseRequest):
    if req.healthcheck and not req.image_base64:
        return {'ok': True, 'engine': 'omniparser-full', 'endpoint': '/parse'}
    try:
        image = Image.open(io.BytesIO(base64.b64decode(clean_b64(req.image_base64)))).convert('RGB')
        width, height = image.size
        box_overlay_ratio = width / 3200
        draw_bbox_config = {'text_scale': 0.8 * box_overlay_ratio, 'text_thickness': max(int(2 * box_overlay_ratio), 1), 'text_padding': max(int(3 * box_overlay_ratio), 1), 'thickness': max(int(3 * box_overlay_ratio), 1)}
        ocr_bbox_rslt, _ = check_ocr_box(image, display_img=False, output_bb_format='xyxy', goal_filtering=None, easyocr_args={'paragraph': False, 'text_threshold': 0.9}, use_paddleocr=bool(req.use_paddleocr))
        ocr_text, ocr_bbox = ocr_bbox_rslt
        labeled_img_b64, label_coordinates, parsed_content_list = get_som_labeled_img(image, yolo_model, BOX_TRESHOLD=float(req.box_threshold), output_coord_in_ratio=True, ocr_bbox=ocr_bbox, draw_bbox_config=draw_bbox_config, caption_model_processor=caption_model_processor, ocr_text=ocr_text, iou_threshold=float(req.iou_threshold), imgsz=int(req.imgsz))
        regions = normalize_regions(label_coordinates, parsed_content_list, width, height)
        return {'ok': True, 'engine': 'omniparser-full', 'source': 'designit-parse-server', 'title': req.title, 'url': req.url, 'image': {'width': width, 'height': height}, 'regions': regions, 'raw': {'label_coordinates': label_coordinates, 'parsed_content_list': parsed_content_list}, 'labeled_image_base64': labeled_img_b64, 'diagnostics': {'regions': len(regions), 'rawItems': len(parsed_content_list) if isinstance(parsed_content_list, list) else 0}}
    except Exception as e:
        return {'ok': False, 'engine': 'omniparser-full', 'error': str(e)}

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=7860)
PY

python - <<'PY'
from pathlib import Path
p = Path('designit_parse_server.py')
p.write_text(p.read_text(errors='ignore').replace('\r\n', '\n').replace('\r', '\n'))
print('Server file:', p.resolve())
PY

export CUDA_HOME="`$CONDA_PREFIX"
export PATH="`$CUDA_HOME/bin:`$PATH"
export LD_LIBRARY_PATH="`$CUDA_HOME/lib:`$CUDA_HOME/lib64:`$CONDA_PREFIX/lib:`$LD_LIBRARY_PATH"

fuser -k "`$PORT/tcp" || true
python -c "from pathlib import Path; p=Path('designit_parse_server.py'); exec(compile(p.read_text(errors='ignore').replace(chr(13), ''), str(p), 'exec'))"
"@

wsl.exe bash -lc $bash
