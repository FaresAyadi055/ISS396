// web/src/app/api/enrichment/soil/route.js
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { fetchSoilData } from '@/services/enrichment.service'

/**
 * GET /api/enrichment/soil?lat=36.8065&lon=10.1815
 *
 * Takes lat, lon from query params (extracted from scan document).
 * Returns soil properties for that location.
 * Note: soil data doesn't change with date, so no date needed.
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
  const lat = parseFloat(searchParams.get('lat'))
  const lon = parseFloat(searchParams.get('lon'))

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { success: false, message: 'lat and lon must be valid numbers' },
      { status: 400 }
    )
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      { success: false, message: 'lat must be -90 to 90, lon must be -180 to 180' },
      { status: 400 }
    )
  }

  // 3. Fetch soil data
  try {
    const soil = await fetchSoilData(lat, lon)
    return NextResponse.json({ success: true, data: soil }, { status: 200 })
  } catch (error) {
    console.error('GET /api/enrichment/soil error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}