// src/app/api/scans/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";
import { analyzeLeafImages } from "@/services/ai.service";
import { appendScanEntry, getAllSessions } from "@/services/scan.service";
import { getUserFromRequest } from "@/lib/auth";

const CROP_TYPE_VALID_VALUES = [
  "Apple",
  "Blueberry",
  "Cherry",
  "Corn",
  "Grape",
  "Orange",
  "Peach",
  "Pepper bell",
  "Potato",
  "Raspberry",
  "Soybean",
  "Squash",
  "Strawberry",
  "Tomato"
];

const CROP_TYPE_TO_LABEL_PREFIX = {
  "Apple": "Apple",
  "Blueberry": "Blueberry",
  "Cherry": "Cherry_(including_sour)",
  "Corn": "Corn_(maize)",
  "Grape": "Grape",
  "Orange": "Orange",
  "Peach": "Peach",
  "Pepper bell": "Pepper,_bell",
  "Potato": "Potato",
  "Raspberry": "Raspberry",
  "Soybean": "Soybean",
  "Squash": "Squash",
  "Strawberry": "Strawberry",
  "Tomato": "Tomato"
};

function cropTypeMatchesLabel(cropType, label) {
  const normalizedCrop = cropType.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  const normalizedLabel = label.toLowerCase();
  
  const cropWords = normalizedCrop.split(/\s+/).filter(w => w.length > 0);
  
  if (cropWords.every(word => normalizedLabel.includes(word))) return true;
  
  const prefix = CROP_TYPE_TO_LABEL_PREFIX[cropType];
  if (prefix && label.toLowerCase().startsWith(prefix.toLowerCase() + "___")) return true;
  
  return false;
}

const SCORE_THRESHOLD = 0.4;

function filterDetectionsByCropType(detections, cropType) {
  const correctDetections = [];
  let hasBestMatch = false;

  for (const det of detections) {
    const classifications = det.classification_results.classifications;
    if (!classifications || classifications.length === 0) continue;
    
    const bestClassification = classifications.reduce((max, c) => c.score > max.score ? c : max, classifications[0]);
    const score = bestClassification.score;
    const label = bestClassification.label;
    
    if (score < SCORE_THRESHOLD) continue;
    
    console.log("[DEBUG] bestClassification:", label, "score:", score);
    if (cropType && !cropTypeMatchesLabel(cropType, label)) continue;
    
    correctDetections.push(det);
    hasBestMatch = true;
  }

  return { filteredDetections: correctDetections, hasBestMatch };
}

function filterDetectionsByScore(detections) {
  const correctDetections = [];
  let hasBestMatch = false;

  for (const det of detections) {
    const classifications = det.classification_results.classifications;
    if (!classifications || classifications.length === 0) continue;
    
    const bestClassification = classifications.reduce((max, c) => c.score > max.score ? c : max, classifications[0]);
    const score = bestClassification.score;
    
    if (score >= SCORE_THRESHOLD) {
      correctDetections.push(det);
      hasBestMatch = true;
    }
  }

  return { filteredDetections: correctDetections, hasBestMatch };
}

export async function POST(req) {
  try {
    // 1. Authenticate
    let user;
    try {
      user = await getUserFromRequest(req);
    } catch (authError) {
      return NextResponse.json(
        { success: false, message: authError.message },
        { status: 401 }
      );
    }
    const userId = user.id;

    // 2. Parse body - support both JSON and FormData
    const contentType = req.headers.get("content-type") || "";
    let isJson = contentType.includes("application/json");
    let body, formData;

    if (isJson) {
      try {
        body = await req.json();
      } catch {
        return NextResponse.json(
          { success: false, message: "Invalid JSON body" },
          { status: 400 }
        );
      }
    } else {
      formData = await req.formData();
      body = Object.fromEntries(formData);
    }

    console.log("[DEBUG] body keys:", Object.keys(body));
    const sessionId = body.sessionId;
    console.log("[DEBUG] sessionId:", sessionId);
    if (!sessionId) {
      console.log("[DEBUG] MISSING sessionId");
      return NextResponse.json(
        { success: false, message: "sessionId is required", debug: Object.keys(body) },
        { status: 400 }
      );
    }

    const cropTypeRaw = body.crop_type || body.cropType;
    console.log("[DEBUG] cropTypeRaw:", cropTypeRaw);
    const cropType = CROP_TYPE_VALID_VALUES.includes(cropTypeRaw) ? cropTypeRaw : null;
    console.log("[DEBUG] cropType (after validation):", cropType);
    if (cropTypeRaw && !cropType) {
      console.warn(`[DEBUG] Invalid crop_type received: ${cropTypeRaw}`);
    }

    let location;
    let locationRaw = body.location;
    console.log("[DEBUG] locationRaw:", locationRaw);
    if (!locationRaw) {
      return NextResponse.json(
        { success: false, message: "location is required ([lng, lat])" },
        { status: 400 }
      );
    }

    try {
      location = isJson ? locationRaw : JSON.parse(locationRaw);
      console.log("[DEBUG] parsed location:", location);
      if (!Array.isArray(location) || location.length !== 2 || location.some(n => typeof n !== "number")) {
        throw new Error();
      }
    } catch {
      console.log("[DEBUG] location parse failed, raw:", locationRaw);
      return NextResponse.json(
        { success: false, message: "location must be a JSON array of two numbers [lng, lat]" },
        { status: 400 }
      );
    }

    const date = body.date || new Date().toISOString();
    const scan_id = body.scan_id || crypto.randomUUID();

    // Get the two original images - handle both JSON (base64) and FormData (File)
    let originalMaskedBuffer, originalCleanBuffer, maskBuffers;

    if (isJson) {
      const originalImageMasked = body.original_image_masked;
      const originalImageClean = body.original_image_clean;
      const masks = body.masks;

      if (!originalImageMasked || !originalImageClean) {
        console.log("[DEBUG] missing original images, has masked:", !!originalImageMasked, "has clean:", !!originalImageClean);
        return NextResponse.json(
          { success: false, message: "Both original_image_masked and original_image_clean are required" },
          { status: 400 }
        );
      }

      if (!masks || !masks.length) {
        console.log("[DEBUG] masks missing or empty, masks:", masks);
        return NextResponse.json(
          { success: false, message: "At least one mask image is required" },
          { status: 400 }
        );
      }

      console.log("[DEBUG] masks count:", masks.length);

      originalMaskedBuffer = Buffer.from(originalImageMasked, "base64");
      originalCleanBuffer = Buffer.from(originalImageClean, "base64");
      maskBuffers = masks.map(m => Buffer.from(m, "base64"));
    } else {
      const originalMaskedFile = formData.get("original_image_masked");
      const originalCleanFile = formData.get("original_image_clean");
      const maskFiles = formData.getAll("masks");

      console.log("[DEBUG FormData] originalMaskedFile:", !!originalMaskedFile, "originalCleanFile:", !!originalCleanFile, "maskFiles count:", maskFiles.length);

      if (!originalMaskedFile || !originalCleanFile) {
        return NextResponse.json(
          { success: false, message: "Both original_image_masked and original_image_clean are required" },
          { status: 400 }
        );
      }

      if (!maskFiles.length) {
        console.log("[DEBUG FormData] no mask files found");
        return NextResponse.json(
          { success: false, message: "At least one mask image is required" },
          { status: 400 }
        );
      }

      console.log("[DEBUG FormData] mask files count:", maskFiles.length);

      originalMaskedBuffer = Buffer.from(await originalMaskedFile.arrayBuffer());
      originalCleanBuffer = Buffer.from(await originalCleanFile.arrayBuffer());
      maskBuffers = await Promise.all(
        maskFiles.map(async (file) => Buffer.from(await file.arrayBuffer()))
      );
    }

    // Run inference on all masks
    console.log("[DEBUG] number of masks:", maskBuffers.length);
    const analysisResults = await analyzeLeafImages(maskBuffers);
    console.log("[DEBUG] analysis results count:", analysisResults.length);

    // Build initial detections (each mask gets its own detection)
    let detections = maskBuffers.map((maskBuf, i) => ({
      mask: maskBuf.toString("base64"),
      maskId: analysisResults[i].maskId,
      location,
      date,
      classification_results: {
        classifications: analysisResults[i].classifications,
      },
    }));

    console.log("[DEBUG] detections count before filter:", detections.length);
    if (cropType) {
      console.log("[DEBUG] filtering by cropType:", cropType);
      const { filteredDetections, hasBestMatch } = filterDetectionsByCropType(detections, cropType);
      console.log("[DEBUG] filtered detections count:", filteredDetections.length, "hasBestMatch:", hasBestMatch);
      if (!hasBestMatch) {
        return NextResponse.json(
          { success: false, message: "No correct crop type detected", cropType, debug: detections.length },
          { status: 400 }
        );
      }
      detections = filteredDetections;
    } else {
      const { filteredDetections, hasBestMatch } = filterDetectionsByScore(detections);
      console.log("[DEBUG] filtered by score threshold, count:", filteredDetections.length);
      if (!hasBestMatch) {
        return NextResponse.json(
          { success: false, message: "No detections above score threshold", debug: detections.length },
          { status: 400 }
        );
      }
      detections = filteredDetections;
    }

    // Don't save if no detections remain after filtering
    if (!detections.length) {
      return NextResponse.json(
        { success: false, message: "No valid detections after filtering" },
        { status: 400 }
      );
    }

    const scanEntry = {
      scan_id,
      cropType,
      original_image_masked: originalMaskedBuffer.toString("base64"),
      original_image_clean: originalCleanBuffer.toString("base64"),
      detections,
    };

    // Persist
    const updatedDoc = await appendScanEntry(userId, sessionId, scanEntry);

    return NextResponse.json(
      { success: true, data: updatedDoc.toJSON() },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/scans error:", error);
    console.error("Stack:", error.stack);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    let user;
    try {
      user = await getUserFromRequest(req);
    } catch (authError) {
      return NextResponse.json(
        { success: false, message: authError.message },
        { status: 401 }
      );
    }
    const userId = user.id;

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const skip = parseInt(searchParams.get("skip") || "0", 10);

    const sessions = await getAllSessions(userId, { sessionId, limit, skip });

    return NextResponse.json(
      { success: true, count: sessions.length, data: sessions },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/scans error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}