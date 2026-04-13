import { NextResponse } from 'next/server';
import { generateCropReport } from '@/services/gemini.service';
import { getUserFromRequest } from '@/lib/auth';

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
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'sessionId is required' },
        { status: 400 }
      );
    }

    const report = await generateCropReport(sessionId, user.id);

    return NextResponse.json(
      { success: true, data: report },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/reports/generate error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
