// web/src/app/api/reports/generate/route.js
import { NextResponse } from 'next/server'
import connectDB from '@/lib/pool'
import { getUserFromRequest } from '@/lib/auth'
import { getAllSessions } from '@/services/scan.service'
import { generateReport } from '@/services/ai.service'
import { createReport } from '@/services/report.service'

export async function POST(req) {
  try {
    // 1. Authenticate the farmer
    let user
    try {
      user = await getUserFromRequest(req)
    } catch (authError) {
      return NextResponse.json(
        { success: false, message: authError.message },
        { status: 401 }
      )
    }

    // 2. Get sessionId from request body
    const { sessionId } = await req.json()
    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'sessionId is required' },
        { status: 400 }
      )
    }

    // 3. Fetch the scan session from MongoDB
    await connectDB()
    const sessions = await getAllSessions(user.id, { sessionId })
    if (!sessions.length) {
      return NextResponse.json(
        { success: false, message: 'Session not found' },
        { status: 404 }
      )
    }

    const session = sessions[0]

    // 4. Extract the best detections from the session
    const allDetections = []
    session.scans.forEach(batch => {
      ;(batch.image || batch.detections || []).forEach(det => {
        const best = det.classification_results?.classifications
          ?.sort((a, b) => b.score - a.score)[0]
        if (best && best.score > 0.1) {
          allDetections.push(best)
        }
      })
    })

    if (!allDetections.length) {
      return NextResponse.json(
        { success: false, message: 'No detections found in this session' },
        { status: 400 }
      )
    }

    // 5. Determine dominant plant type
    const plantType = allDetections[0].label.split('___')[0].replace(/_/g, ' ')

    // 6. Call AI to generate report
    const { diagnosis, treatment } = await generateReport({
      plantType,
      detections: allDetections
    })

    // 7. Save report to MongoDB
    const report = await createReport({
      farmerId: user.id,
      imageUrl: `session:${sessionId}`,
      diagnosis,
      treatment
    })

    return NextResponse.json({ success: true, data: report }, { status: 201 })

  } catch (error) {
    console.error('POST /api/reports/generate error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}