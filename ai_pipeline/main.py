# main.py  —  Video + Plant-Disease Scan Backend
#
# WebSocket endpoint:  ws://host:8000/ws/video
#   Receives base64-encoded JPEG strings, runs YOLO segmentation, echoes
#   the processed frame back as base64.
#
# REST endpoints:
#   POST   /scan      Upload an image; YOLO crops each object onto a black
#                     canvas, MobileNet-V2 classifies each crop.  Results are
#                     appended to the in-memory scan store.
#   GET    /results   Return all accumulated scan results.
#   DELETE /results   Clear the scan store (cancel / reset).
#
# Install:
#   pip install fastapi uvicorn websockets ultralytics torch torchvision \
#               opencv-python numpy python-multipart python-dotenv pillow transformers
#
# Run:
#   uvicorn main:app --host 0.0.0.0 --port 8000 --reload

from __future__ import annotations

import asyncio
import base64
import logging
import os
import uuid
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np
import torch
import torchvision.transforms as T
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
from transformers import AutoConfig, AutoModelForImageClassification
from ultralytics import YOLO

# ---------------------------------------------------------------------------
# Environment & logging
# ---------------------------------------------------------------------------

load_dotenv()  # reads .env from the project root
BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:3000/api")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Device
# ---------------------------------------------------------------------------

device = "cuda" if torch.cuda.is_available() else "cpu"
log.info("Using device: %s", device)

# ---------------------------------------------------------------------------
# YOLO segmentation model
# ---------------------------------------------------------------------------

YOLO_MODEL_PATH = "models/yolo26n.pt"
CONFIDENCE_THRESHOLD = 0.39

yolo_model = YOLO(YOLO_MODEL_PATH)
if device == "cuda":
    yolo_model.to("cuda")
log.info("YOLO model loaded from %s", YOLO_MODEL_PATH)

# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# MobileNet-V2 plant-disease classifier -- local inference
#
# Loaded from state-dict .pt + models/config.json (copy from the cloned repo).
# Label order is read from model.config.id2label, sorted by integer key.
# ---------------------------------------------------------------------------

HF_MODEL_ID  = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
MOBILENET_PT = os.getenv("MOBILENET_PT", "models/mobilenet_v2_1.0_224.pt")

# Normalisation matching the HuggingFace preprocessor_config (mean/std = 0.5)
_classify_transform = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
])


def _load_classifier():
    """Load model from local .pt state-dict + models/config.json."""
    config_dir = os.path.dirname(MOBILENET_PT)
    config_path = os.path.join(config_dir, "config.json")

    if not os.path.isfile(config_path):
        raise FileNotFoundError(
            f"config.json not found at {config_path}. "
            "Copy it from your cloned HuggingFace repo into the models/ folder."
        )
    if not os.path.isfile(MOBILENET_PT):
        raise FileNotFoundError(
            f"Weights not found at {MOBILENET_PT}. "
            "Set MOBILENET_PT in .env or place the file at the default path."
        )

    config = AutoConfig.from_pretrained(config_dir)
    model  = AutoModelForImageClassification.from_config(config)

    state_dict = torch.load(MOBILENET_PT, map_location=device, weights_only=True)
    missing, unexpected = model.load_state_dict(state_dict, strict=True)
    if missing:
        raise RuntimeError(
            f"State dict missing {len(missing)} keys: {missing[:5]}. "
            "Ensure .pt was saved from this exact HuggingFace model class."
        )
    if unexpected:
        log.warning("Unexpected state-dict keys (ignored): %s", unexpected[:5])

    model.eval().to(device)

    # Sort by integer key -- JSON may serialise keys as strings out of order
    id2label = model.config.id2label
    labels   = [v for _, v in sorted(id2label.items(), key=lambda kv: int(kv[0]))]

    log.info("=== LABEL MAP ===")
    for i, lbl in enumerate(labels):
        log.info("  [%02d] %s", i, lbl)
    log.info("=== END LABEL MAP (%d classes) ===", len(labels))

    return model, labels


classifier_model, PLANT_DISEASE_CLASSES = _load_classifier()
NUM_CLASSES = len(PLANT_DISEASE_CLASSES)

assert NUM_CLASSES == 38, (
    f"Expected 38 classes, got {NUM_CLASSES}. Check config.json id2label."
)
log.info("Classifier ready -- [0]=%s | [-1]=%s",
         PLANT_DISEASE_CLASSES[0], PLANT_DISEASE_CLASSES[-1])

# Thread executor  (keeps async event loop free during CPU/GPU work)
# ---------------------------------------------------------------------------

_executor = ThreadPoolExecutor(max_workers=os.cpu_count() or 4)

# ---------------------------------------------------------------------------
# In-memory scan store
# ---------------------------------------------------------------------------
# Schema:
#   scan_store = {
#       "scans": [
#           {
#               "scan_id": "<uuid>",
#               "image": [
#                   {
#                       "mask": "<base64-PNG>",        # object on black canvas
#                       "classification_results": {
#                           "label":      "Tomato___healthy",
#                           "confidence": 0.97,
#                           "top5": [{"label": ..., "confidence": ...}, ...]
#                       }
#                   },
#                   ...
#               ]
#           },
#           ...
#       ]
#   }

scan_store: dict[str, list] = {"scans": []}

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Plant-Disease Vision API",
    version="3.0.0",
    description=(
        "WebSocket live feed + REST scan endpoints. "
        f"Paired backend: {BACKEND_URL}"
    ),
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _classify_crop(crop_bgr: np.ndarray) -> dict:
    """Run the local MobileNet-V2 on a single BGR crop.

    Returns all 38 classes zipped with their softmax scores, sorted descending.
    classifications[0] is always the top prediction.
    """
    crop_rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)
    pil_img  = Image.fromarray(crop_rgb)
    tensor   = _classify_transform(pil_img).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = classifier_model(pixel_values=tensor).logits  # (1, 38)
        probs  = torch.softmax(logits, dim=-1)[0]              # (38,)

    paired = sorted(
        zip(PLANT_DISEASE_CLASSES, probs.tolist()),
        key=lambda x: x[1],
        reverse=True,
    )
    return {
        "classifications": [
            {"label": label, "score": round(score, 6)}
            for label, score in paired
        ]
    }


def _ndarray_to_b64png(img_bgr: np.ndarray) -> str:
    """Encode a BGR numpy array as a base64 PNG string (MongoDB-friendly)."""
    success, buf = cv2.imencode(".png", img_bgr)
    if not success:
        raise RuntimeError("cv2.imencode PNG failed")
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def _run_scan(image_bytes: bytes) -> list[dict]:
    """
    Full scan pipeline (blocking — runs inside thread executor):

    1. Decode image bytes to BGR numpy array.
    2. Resize to 640 × 640 for YOLO.
    3. Run YOLO segmentation; filter by CONFIDENCE_THRESHOLD.
    4. For each confident detection:
         a. Apply binary mask on a black canvas (isolates the object).
         b. Crop to the bounding box.
         c. Classify the crop with MobileNet-V2.
         d. Store mask-crop as base64-PNG + classification dict.
    Returns a list of detection dicts ready for the scan store.
    """
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image — not a valid JPEG / PNG.")

    img_resized = cv2.resize(img, (640, 640))

    results = yolo_model(img_resized)
    yolo_result = results[0]

    if yolo_result.boxes is None or len(yolo_result.boxes) == 0:
        log.info("_run_scan: no detections found")
        return []

    scores = yolo_result.boxes.conf.cpu().numpy()
    high_conf_mask = scores >= CONFIDENCE_THRESHOLD

    if not any(high_conf_mask):
        log.info("_run_scan: no detections above threshold %.2f", CONFIDENCE_THRESHOLD)
        return []

    if yolo_result.masks is None:
        log.warning("_run_scan: YOLO returned boxes but no masks — model must be a segmentation variant")
        return []

    all_masks = yolo_result.masks.data.cpu().numpy()   # (N, H, W)
    boxes_xyxy = yolo_result.boxes.xyxy.cpu().numpy()  # (N, 4)

    detections: list[dict] = []

    for idx in range(len(scores)):
        if not high_conf_mask[idx]:
            continue

        binary_mask = all_masks[idx]  # (H, W) float 0/1

        # Resize mask to match the working image if YOLO shrunk it
        if binary_mask.shape != img_resized.shape[:2]:
            binary_mask = cv2.resize(
                binary_mask,
                (img_resized.shape[1], img_resized.shape[0]),
                interpolation=cv2.INTER_NEAREST,
            )

        binary_mask_bool = binary_mask > 0.5

        # Place object pixels on a black canvas
        black_canvas = np.zeros_like(img_resized, dtype=np.uint8)
        black_canvas[binary_mask_bool] = img_resized[binary_mask_bool]

        # Tight crop to bounding box
        x1, y1, x2, y2 = boxes_xyxy[idx].astype(int)
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(img_resized.shape[1], x2), min(img_resized.shape[0], y2)
        crop = black_canvas[y1:y2, x1:x2]

        if crop.size == 0:
            log.warning("_run_scan: empty crop for detection %d — skipping", idx)
            continue

        mask_b64 = _ndarray_to_b64png(crop)
        classification = _classify_crop(crop)

        best = classification["classifications"][0]  # already sorted descending

        detections.append({
            "mask": mask_b64,
            "classification_results": classification,
        })
        log.info(
            "_run_scan: detection %d → %s (%.1f%%)",
            idx,
            best["label"],
            best["score"] * 100,
        )

    return detections


# ===========================================================================
# REST Endpoint 1 — POST /scan
# ===========================================================================

@app.post(
    "/scan",
    summary="Scan an image for plant diseases",
    response_description="Scan ID and per-object classification results",
)
async def scan_image(file: UploadFile = File(...)) -> JSONResponse:
    """
    Upload a JPEG or PNG.

    - YOLO segments every object above the confidence threshold.
    - Each object is isolated on a black canvas (mask applied).
    - The crop is run through the fine-tuned MobileNet-V2; the full softmax
      distribution (38 floats) is stored as ``classification_results.scores``.
      Label resolution is done client-side via argmax.
    - Results are **appended** to the in-memory store and returned immediately.

    The `mask` field is a **base64-encoded PNG**, ready to be stored in MongoDB.

    Results accumulate across repeated calls; use `DELETE /results` to reset.
    """
    allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported media type '{file.content_type}'. "
                "Please upload a JPEG or PNG image."
            ),
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file received.")

    loop = asyncio.get_event_loop()
    try:
        detections: list[dict] = await loop.run_in_executor(
            _executor, _run_scan, image_bytes
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    scan_entry = {
        "scan_id": str(uuid.uuid4()),
        "image": detections,
    }
    scan_store["scans"].append(scan_entry)
    log.info(
        "POST /scan  →  scan_id=%s  detections=%d",
        scan_entry["scan_id"],
        len(detections),
    )

    return JSONResponse(
        status_code=200,
        content={
            "scan_id": scan_entry["scan_id"],
            "detections_count": len(detections),
            "image": detections,
        },
    )


# ===========================================================================
# REST Endpoint 2 — GET /results
# ===========================================================================

@app.get(
    "/results",
    summary="Retrieve all accumulated scan results",
    response_description="Full scan store in {scans: [...]} format",
)
async def get_results() -> JSONResponse:
    """
    Returns every scan collected since the last `DELETE /results`.

    Response schema::

        {
          "scans": [
            {
              "scan_id": "3fa85f64-...",
              "image": [
                {
                  "mask": "<base64-PNG>",
                  "classification_results": {
                    "label":      "Tomato___Early_blight",
                    "confidence": 0.94,
                    "top5": [
                      {"label": "Tomato___Early_blight", "confidence": 0.94},
                      ...
                    ]
                  }
                },
                ...
              ]
            },
            ...
          ]
        }
    """
    total_scans = len(scan_store["scans"])
    total_objects = sum(len(s["image"]) for s in scan_store["scans"])
    log.info("GET /results  →  %d scan(s), %d object(s) total", total_scans, total_objects)
    return JSONResponse(status_code=200, content=scan_store)


# ===========================================================================
# REST Endpoint 3 — DELETE /results
# ===========================================================================

@app.delete(
    "/results",
    summary="Clear all stored scan results",
    response_description="Confirmation and count of removed scans",
)
async def cancel_results() -> JSONResponse:
    """
    Wipes the in-memory scan store entirely.

    Subsequent calls to `GET /results` will return `{"scans": []}` until
    new images are scanned via `POST /scan`.
    """
    cleared = len(scan_store["scans"])
    scan_store["scans"].clear()
    log.info("DELETE /results  →  cleared %d scan(s)", cleared)
    return JSONResponse(
        status_code=200,
        content={
            "message": f"Scan store cleared. {cleared} scan(s) removed.",
            "cleared_count": cleared,
        },
    )


# ===========================================================================
# WebSocket live-feed endpoint  —  ws://host:8000/ws/video
# ===========================================================================

def process_frame(frame_bytes: bytes) -> bytes | None:
    """CPU/GPU-bound frame processing — must not be async."""
    try:
        arr = np.frombuffer(frame_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            log.warning("process_frame: imdecode returned None — invalid JPEG")
            return None

        img_resized = cv2.resize(img, (640, 640))
        results = yolo_model(img_resized)

        if len(results[0].boxes) > 0:
            scores = results[0].boxes.conf.cpu().numpy()
            high_conf_indices = scores >= CONFIDENCE_THRESHOLD

            if any(high_conf_indices) and results[0].masks is not None:
                masks = results[0].masks.data.cpu().numpy()
                filtered_masks = masks[high_conf_indices]

                overlay = np.zeros_like(img_resized, dtype=np.uint8)
                for mask in filtered_masks:
                    color = np.random.randint(0, 255, (3,), dtype=np.uint8)
                    for c in range(3):
                        overlay[:, :, c][mask == 1] = color[c]

                blended = cv2.addWeighted(img_resized, 0.5, overlay, 0.5, 0)
                _, buf = cv2.imencode(".jpg", blended)
                return buf.tobytes()

        _, buf = cv2.imencode(".jpg", img_resized)
        return buf.tobytes()

    except Exception as exc:
        log.exception("Error in process_frame: %s", exc)
        return None


@app.websocket("/ws/video")
async def video_feed(websocket: WebSocket) -> None:
    await websocket.accept()
    client = websocket.client
    log.info("Client connected: %s:%s", client.host, client.port)

    try:
        loop = asyncio.get_event_loop()
        while True:
            b64_in: str = await websocket.receive_text()

            # Drop frame if the thread pool is already saturated
            if _executor._work_queue.qsize() > 0:
                continue

            try:
                frame_bytes: bytes = base64.b64decode(b64_in)
            except Exception as exc:
                log.warning("base64 decode failed: %s — skipping frame", exc)
                continue

            processed_bytes: bytes | None = await loop.run_in_executor(
                _executor, process_frame, frame_bytes
            )
            if processed_bytes is None:
                continue

            b64_out: str = base64.b64encode(processed_bytes).decode("utf-8")
            await websocket.send_text(b64_out)

    except WebSocketDisconnect:
        log.info("Client disconnected: %s:%s", client.host, client.port)
    except Exception as exc:
        log.exception("Unhandled error for %s:%s — %s", client.host, client.port, exc)


# ===========================================================================
# Classes endpoint — single source of truth for label ordering
# ===========================================================================

@app.get("/classes")
async def get_classes() -> dict:
    """Return the ordered label list loaded from models/config.json at startup."""
    return {
        "classes": PLANT_DISEASE_CLASSES,
        "count":   NUM_CLASSES,
        "source":  HF_MODEL_ID,
    }