// src/app/api/analyze/route.js

import { NextResponse } from 'next/server'
import { analyzeLeafImage } from '@/services/ai.service'

/**
 * POST /api/analyze
 * Receives an image (via FormData) and returns plant disease analysis
 */
export async function POST(req) {
  try {
    const formData = await req.formData()
    const image = formData.get('image')

    if (!image) {
      return NextResponse.json(
        { success: false, message: 'No image provided' },
        { status: 400 }
      )
    }

    // Convert image blob to buffer
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Call the AI Service
    const analysis = await analyzeLeafImage(buffer)

    return NextResponse.json(
      {
        success: true,
        data: analysis,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('API Error in /api/analyze:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Error analyzing leaf image',
      },
      { status: 500 }
    )
  }
}
