import { NextResponse } from 'next/server';

const SOIL_PROPERTIES = ['clay', 'sand', 'silt', 'phh2o', 'soc', 'nitrogen'];

async function fetchSoilFromREST(lon, lat) {
  const properties = SOIL_PROPERTIES.join('&property=');
  const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}&property=${properties}&depth=0-5cm&value=mean`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;

    const data = await response.json();
    const layers = data.properties?.layers ?? [];
    const result = {};

    for (const layer of layers) {
      const name = layer.name;
      const meanVal = layer.depths?.[0]?.values?.mean ?? null;
      if (meanVal === null) continue;

      if (name === 'clay') result.clay = meanVal / 10;
      if (name === 'sand') result.sand = meanVal / 10;
      if (name === 'silt') result.silt = meanVal / 10;
      if (name === 'phh2o') result.phh2o = meanVal / 10;
      if (name === 'soc') result.organic_carbon = meanVal / 10;
      if (name === 'nitrogen') result.nitrogen = meanVal / 100;
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch { return null; }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');

    if (!latitude || !longitude) {
      return NextResponse.json(
        { success: false, message: 'latitude and longitude are required' },
        { status: 400 }
      );
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const result = await fetchSoilFromREST(lon, lat);

    if (result) {
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    return NextResponse.json(
      { 
        success: true, 
        data: {
          sand: null,
          silt: null,
          clay: null,
          phh2o: null,
          organic_carbon: null,
          nitrogen: null,
          error: 'SoilGrids API returned no data for this location'
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('SoilGrids error:', error);
    return NextResponse.json(
      { 
        success: true, 
        data: {
          sand: null,
          silt: null,
          clay: null,
          phh2o: null,
          organic_carbon: null,
          nitrogen: null,
          error: 'SoilGrids temporarily unavailable'
        }
      },
      { status: 200 }
    );
  }
}