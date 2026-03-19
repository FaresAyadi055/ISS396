/**
 * app/api/scan/route.js  —  Next.js App Router
 *
 * Bridges the React Native client and the FastAPI vision backend.
 * All endpoints require a valid `token` httpOnly cookie (set by auth/login).
 * Scans are always stored under the authenticated user's ID.
 *
 *   POST   /api/scan   Forward image to FastAPI → persist in MongoDB
 *   GET    /api/scan   Return the user's stored scan results
 *   DELETE /api/scan   Clear results (FastAPI store + optionally MongoDB session)
 */

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  createSession,
  appendScanResult,
  getAllSessions,
  clearSession,
} from "@/services/scan.service";

const FASTAPI_URL  = process.env.FASTAPI_URL  ?? "http://localhost:8000";
const JWT_SECRET   = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';

// ---------------------------------------------------------------------------
// Auth helper — decode the httpOnly `token` cookie set by auth/login
// ---------------------------------------------------------------------------

/**
 * Verify the JWT from the request cookie and return the decoded payload.
 * Throws a Response-ready NextResponse on any auth failure.
 */
function requireAuth(request) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    throw NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401 }
    );
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload; // { id, email, iat, exp, ... } — shape set by loginUser
  } catch (err) {
    throw NextResponse.json(
      { error: "Session expired or invalid. Please log in again." },
      { status: 401 }
    );
  }
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

function errorResponse(message, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

async function callFastAPIScan(formData) {
  const res = await fetch(`${FASTAPI_URL}/scan`, {
    method: "POST",
    body:   formData,
    // Do NOT set Content-Type — Node sets the multipart boundary automatically
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`FastAPI /scan error ${res.status}: ${detail}`);
  }

  return res.json();
}

async function callFastAPIDelete() {
  try {
    await fetch(`${FASTAPI_URL}/results`, { method: "DELETE" });
  } catch (err) {
    console.warn("[scan/route] FastAPI DELETE /results failed:", err.message);
  }
}

// ---------------------------------------------------------------------------
// POST /api/scan
//
// multipart/form-data fields:
//   file       — JPEG or PNG image (required)
//   sessionId  — existing MongoDB _id to append to (optional;
//                omit to create a new session automatically)
// ---------------------------------------------------------------------------
export async function POST(request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  let user;
  try {
    user = requireAuth(request);
  } catch (authResponse) {
    return authResponse;
  }

  const userId = user.id; // ObjectId string from JWT payload

  // ── Parse form ────────────────────────────────────────────────────────────
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Request must be multipart/form-data.", 400);
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return errorResponse("Missing 'file' field in form data.", 400);
  }

  const sessionId = formData.get("sessionId") ?? null;

  // ── Forward to FastAPI ────────────────────────────────────────────────────
  const forwardForm = new FormData();
  forwardForm.append("file", file, file.name ?? "upload.jpg");

  let scanEntry;
  try {
    scanEntry = await callFastAPIScan(forwardForm);
  } catch (err) {
    console.error("[scan/route] FastAPI error:", err.message);
    return errorResponse(err.message, 502);
  }

  // scanEntry = { scan_id, detections_count, image: [{mask, classification_results}] }

  // ── Persist to MongoDB ────────────────────────────────────────────────────
  let updatedDoc;
  try {
    if (sessionId) {
      // Append to existing session — ownership is enforced inside the service
      updatedDoc = await appendScanResult(sessionId, userId, scanEntry);
    } else {
      // Create a new session for this user and immediately append
      const newSession = await createSession(userId);
      updatedDoc = await appendScanResult(String(newSession._id), userId, scanEntry);
    }
  } catch (err) {
    console.error("[scan/route] MongoDB error:", err.message);
    return errorResponse(`Database error: ${err.message}`, 500);
  }

  return NextResponse.json(
    {
      message:          "Scan complete.",
      sessionMongoId:   String(updatedDoc._id),
      userId,
      scan_id:          scanEntry.scan_id,
      detections_count: scanEntry.detections_count,
      // Return FastAPI's result directly so the client renders without a GET
      image:            scanEntry.image,
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// GET /api/scan
//
// Query params:
//   sessionId  — filter to a specific MongoDB _id  (optional)
//   limit      — max sessions to return, cap 200    (default 50)
//   skip       — pagination offset                  (default 0)
//
// Always scoped to the authenticated user — other users' sessions are invisible.
// ---------------------------------------------------------------------------
export async function GET(request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  let user;
  try {
    user = requireAuth(request);
  } catch (authResponse) {
    return authResponse;
  }

  const userId = user.id;

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") ?? undefined;
  const limit     = Math.min(parseInt(searchParams.get("limit") ?? "50",  10), 200);
  const skip      = parseInt(searchParams.get("skip")  ?? "0",  10);

  try {
    const sessions = await getAllSessions(userId, { sessionId, limit, skip });

    // Flatten to match the FastAPI scan_store shape for client consistency
    const scans = sessions.flatMap((doc) => doc.scans ?? []);

    return NextResponse.json(
      {
        scans,
        meta: {
          total:    scans.length,
          sessions: sessions.length,
          userId,
          limit,
          skip,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[scan/route] GET error:", err.message);
    return errorResponse(err.message, 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/scan
//
// JSON body (optional):
//   { sessionId: "<mongo _id>" }  — also clear the MongoDB session
//   {}                            — reset FastAPI store only
//
// Always calls FastAPI DELETE /results to keep both stores in sync.
// MongoDB clear is scoped to the authenticated user.
// ---------------------------------------------------------------------------
export async function DELETE(request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  let user;
  try {
    user = requireAuth(request);
  } catch (authResponse) {
    return authResponse;
  }

  const userId = user.id;

  let body = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional
  }

  const { sessionId } = body;

  // Always reset the FastAPI in-memory store
  await callFastAPIDelete();

  // Optionally clear the MongoDB session (user-scoped)
  if (sessionId) {
    try {
      await clearSession(sessionId, userId);
    } catch (err) {
      console.error("[scan/route] MongoDB clearSession error:", err.message);
      return errorResponse(`Database error: ${err.message}`, 500);
    }
  }

  return NextResponse.json(
    {
      message: sessionId
        ? `Session ${sessionId} cleared in MongoDB and FastAPI store reset.`
        : "FastAPI store reset. No MongoDB session id provided.",
      clearedSessionId: sessionId ?? null,
      userId,
    },
    { status: 200 }
  );
}