// src/app/api/scans/[id]/route.js

import { NextResponse } from "next/server";
import { getSession } from "@/services/scan.service";
import { verifyToken } from "@/lib/auth";


export async function GET(req, { params }) {
  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const userId = await verifyToken(req);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorised" },
        { status: 401 }
      );
    }

    // ── 2. Fetch ──────────────────────────────────────────────────────────────
    const { id } = await params;
    const session = await getSession(id, userId);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Scan session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: session },
      { status: 200 }
    );
  } catch (error) {
    console.error(`GET /api/scans/${params?.id} error:`, error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}