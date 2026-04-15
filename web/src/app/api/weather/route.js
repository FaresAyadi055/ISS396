import { NextResponse } from 'next/server';

const OPEN_METEO_API_URL = 'https://api.open-meteo.com/v1/forecast';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');
    const date = searchParams.get('date');

    if (!latitude || !longitude) {
      return NextResponse.json(
        { success: false, message: 'latitude and longitude are required' },
        { status: 400 }
      );
    }

    const parsedDate = date ? new Date(date) : new Date();
    const startDate = parsedDate.toISOString().split('T')[0];
    const endDate = startDate;

    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max,wind_speed_10m_max,et0_fao_evapotranspiration',
      hourly: 'soil_moisture_0_to_1cm,soil_moisture_1_to_3cm',
      start_date: startDate,
      end_date: endDate,
      timezone: 'auto',
    });

    const response = await fetch(`${OPEN_METEO_API_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data = await response.json();

    const daily = data.daily || {};
    const hourly = data.hourly || {};

    const result = {
      temperature_2m_max: daily.temperature_2m_max?.[0],
      temperature_2m_min: daily.temperature_2m_min?.[0],
      precipitation_sum: daily.precipitation_sum?.[0],
      relative_humidity_2m: daily.relative_humidity_2m_max?.[0],
      wind_speed_10m_max: daily.wind_speed_10m_max?.[0],
      et0_fao_evapotranspiration: daily.et0_fao_evapotranspiration?.[0],
      soil_moisture_0_to_1cm: hourly.soil_moisture_0_to_1cm?.[12],
      soil_moisture_1_to_3cm: hourly.soil_moisture_1_to_3cm?.[12],
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
      date: parsedDate.toISOString(),
    };

    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/weather error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
