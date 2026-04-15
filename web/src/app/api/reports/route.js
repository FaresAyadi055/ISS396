import { NextResponse } from 'next/server';
import { getReportsBySession, createReport, getReportsByFarmer } from '@/services/report.service';
import { getUserFromRequest } from '@/lib/auth';

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

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const farmerId = searchParams.get('farmerId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);

    let result;
    if (sessionId) {
      result = await getReportsBySession(sessionId, user.id);
    } else {
      result = await getReportsByFarmer(user.id, page, limit);
    }

    return NextResponse.json(
      { success: true, ...result },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/reports error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
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

    const body = await req.json();
    const { sessionId, scanId, diagnosis, treatment, fullReport, imageUrl, enrichedContext } = body;

    if (!sessionId || !diagnosis || !treatment) {
      return NextResponse.json(
        { success: false, message: 'sessionId, diagnosis, and treatment are required' },
        { status: 400 }
      );
    }

    const report = await createReport({
      farmerId: user.id,
      sessionId,
      scanId,
      diagnosis,
      treatment,
      fullReport,
      imageUrl,
      enrichedContext,
    });

    return NextResponse.json(
      { success: true, data: report },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/reports error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
