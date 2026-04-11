// web/src/app/api/enrichment/weather/route.js
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { fetchWeatherData } from '@/services/enrichment.service'

/**
 * GET /api/enrichment/weather?lat=36.8065&lon=10.1815&date=2024-05-23T10:41:55.000Z
 *
 * Takes lat, lon, date from query params (extracted from scan document)
 * Returns historical weather for that location and date.
 */
export async function GET(req) {
  // 1. Authenticate
  try {
    await getUserFromRequest(req)
  } catch (authError) {
    return NextResponse.json(
      { success: false, message: authError.message },
      { status: 401 }
    )
  }

  // 2. Extract and validate query parameters
  const { searchParams } = new URL(req.url)
  const lat  = parseFloat(searchParams.get('lat'))
  const lon  = parseFloat(searchParams.get('lon'))
  const date = searchParams.get('date')

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { success: false, message: 'lat and lon must be valid numbers' },
      { status: 400 }
    )
  }

  if (!date) {
    return NextResponse.json(
      { success: false, message: 'date is required (ISO 8601 format)' },
      { status: 400 }
    )
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      { success: false, message: 'lat must be -90 to 90, lon must be -180 to 180' },
      { status: 400 }
    )
  }

  // 3. Fetch weather
  try {
    const weather = await fetchWeatherData(lat, lon, date)
    return NextResponse.json({ success: true, data: weather }, { status: 200 })
  } catch (error) {
    console.error('GET /api/enrichment/weather error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}