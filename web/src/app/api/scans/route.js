// src/app/api/scans/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";
import { analyzeLeafImages } from "@/services/ai.service";
import { appendScanEntry, getAllSessions } from "@/services/scan.service";
import { getUserFromRequest } from "@/lib/auth";

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

    // 2. Parse FormData
    const formData = await req.formData();

    const sessionId = formData.get("sessionId");
    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "sessionId is required" },
        { status: 400 }
      );
    }

    const locationRaw = formData.get("location");
    if (!locationRaw) {
      return NextResponse.json(
        { success: false, message: "location is required ([lng, lat])" },
        { status: 400 }
      );
    }

    let location;
    try {
      location = JSON.parse(locationRaw);
      if (!Array.isArray(location) || location.length !== 2 || location.some(n => typeof n !== "number")) {
        throw new Error();
      }
    } catch {
      return NextResponse.json(
        { success: false, message: "location must be a JSON array of two numbers [lng, lat]" },
        { status: 400 }
      );
    }

    const date = formData.get("date") || new Date().toISOString();
    const scan_id = formData.get("scan_id") || crypto.randomUUID();

    // Get the two original images
    const originalMaskedFile = formData.get("original_image_masked");
    const originalCleanFile = formData.get("original_image_clean");
    const maskFiles = formData.getAll("masks");

    if (!originalMaskedFile || !originalCleanFile) {
      return NextResponse.json(
        { success: false, message: "Both original_image_masked and original_image_clean are required" },
        { status: 400 }
      );
    }

    if (!maskFiles.length) {
      return NextResponse.json(
        { success: false, message: "At least one mask image is required" },
        { status: 400 }
      );
    }

    // Convert to buffers
    const originalMaskedBuffer = Buffer.from(await originalMaskedFile.arrayBuffer());
    const originalCleanBuffer = Buffer.from(await originalCleanFile.arrayBuffer());
    const maskBuffers = await Promise.all(
      maskFiles.map(async (file) => Buffer.from(await file.arrayBuffer()))
    );

    // Run inference on all masks
    const classificationArrays = await analyzeLeafImages(maskBuffers);

    // Build detections (each mask gets its own detection)
    const detections = maskBuffers.map((maskBuf, i) => ({
      mask: maskBuf.toString("base64"),
      location,
      date,
      classification_results: {
        classifications: classificationArrays[i],
      },
    }));

    const scanEntry = {
      scan_id,
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