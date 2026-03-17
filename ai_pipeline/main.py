# video_backend.py  (updated for React Native / Expo Go client)
# Receives base64-encoded JPEG strings over WebSocket, passes each frame
# through YOLO segmentation model, and echoes the processed frame back as base64.
#
# Install:  pip install fastapi uvicorn websockets ultralytics torch opencv-python numpy
# Run:      uvicorn main:app --host 0.0.0.0 --port 8000 --reload

from __future__ import annotations
import asyncio
import base64
import logging
import os
from concurrent.futures import ThreadPoolExecutor
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import torch

# Initialize YOLO model (will use CUDA if available)
MODEL_PATH = r"models/yolo26n.pt"  # Update this path
CONFIDENCE_THRESHOLD = 0.39  # From your notebook

# Check CUDA availability
device = 'cuda' if torch.cuda.is_available() else 'cpu'
logging.info(f"Using device: {device}")

# Load model once at startup
model = YOLO(MODEL_PATH)
if device == 'cuda':
    model.to('cuda')

# Run blocking cv2/YOLO work in a thread so the async event loop stays free
_executor = ThreadPoolExecutor(max_workers=os.cpu_count() or 4)

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger(__name__)

app = FastAPI(title="Video Feed Processor with YOLO Segmentation", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def process_frame(frame_bytes: bytes) -> bytes | None:
    """CPU/GPU-bound processing — runs in a thread executor, must not be async."""
    try:
        # Decode JPEG to numpy array
        arr = np.frombuffer(frame_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

        if img is None:
            log.warning("process_frame: imdecode returned None — invalid JPEG")
            return None

        # Resize image to 640x640 for YOLO (as in your notebook)
        img_resized = cv2.resize(img, (640, 640))

        # Run YOLO inference
        results = model(img_resized)
        
        # Filter detections by confidence threshold
        if len(results[0].boxes) > 0:
            scores = results[0].boxes.conf.cpu().numpy()
            high_conf_indices = scores >= CONFIDENCE_THRESHOLD
            
            # Create blended image with masks for high confidence detections
            if any(high_conf_indices) and results[0].masks is not None:
                masks = results[0].masks.data.cpu().numpy()
                filtered_masks = masks[high_conf_indices]
                
                # Create overlay with random colors for each mask
                overlay = np.zeros_like(img_resized, dtype=np.uint8)
                
                for mask in filtered_masks:
                    # Generate random color for this mask
                    color = np.random.randint(0, 255, (3,), dtype=np.uint8)
                    
                    # Add this mask to the overlay
                    for c in range(3):
                        overlay[:, :, c][mask == 1] = color[c]
                
                # Blend the overlay with the original image
                blended_image = cv2.addWeighted(img_resized, 0.5, overlay, 0.5, 0)
                
                # Encode result back to JPEG
                _, buf = cv2.imencode('.jpg', blended_image)
                return buf.tobytes()
        
        # If no high confidence detections, return original resized image
        _, buf = cv2.imencode('.jpg', img_resized)
        return buf.tobytes()
        
    except Exception as e:
        log.exception(f"Error in process_frame: {e}")
        return None


# WebSocket endpoint  —  ws://host:8000/ws/video
# Protocol: both directions use base64-encoded JPEG *text* messages
@app.websocket("/ws/video")
async def video_feed(websocket: WebSocket) -> None:
    await websocket.accept()
    client = websocket.client
    log.info("Client connected: %s:%s", client.host, client.port)

    try:
        loop = asyncio.get_event_loop()
        while True:
            # 1. Receive base64-encoded JPEG string from the mobile client
            b64_in: str = await websocket.receive_text()

            # 2. Drop frame immediately if all workers are busy
            if _executor._work_queue.qsize() > 0:
                continue

            # 3. Decode to raw bytes
            try:
                frame_bytes: bytes = base64.b64decode(b64_in)
            except Exception as e:
                log.warning("base64 decode failed: %s — skipping frame", e)
                continue

            # 4. Process in thread so the event loop stays free
            processed_bytes: bytes | None = await loop.run_in_executor(
                _executor, process_frame, frame_bytes
            )

            if processed_bytes is None:
                continue

            # 5. Re-encode and send back as base64 text
            b64_out: str = base64.b64encode(processed_bytes).decode("utf-8")
            await websocket.send_text(b64_out)

    except WebSocketDisconnect:
        log.info("Client disconnected: %s:%s", client.host, client.port)
    except Exception as exc:
        log.exception("Unhandled error for %s:%s — %s", client.host, client.port, exc)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "device": device, "model_loaded": model is not None}


@app.on_event("shutdown")
async def shutdown_event():
    """Clean shutdown of executor"""
    _executor.shutdown(wait=True)
    log.info("Executor shutdown complete")