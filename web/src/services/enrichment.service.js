// web/src/services/enrichment.service.js

/**
 * Fetches historical weather data from Open-Meteo (free, no API key needed).
 * @param {number} lat - latitude
 * @param {number} lon - longitude
 * @param {string} date - ISO date string e.g. "2024-05-23T10:41:55.000Z"
 */
export async function fetchWeatherData(lat, lon, date) {
  // Open-Meteo needs date in YYYY-MM-DD format
  const day = new Date(date).toISOString().split('T')[0]

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    start_date: day,
    end_date: day,
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'relative_humidity_2m_max',
      'wind_speed_10m_max',
    ].join(','),
    timezone: 'auto',
  })

  const url = `https://archive-api.open-meteo.com/v1/archive?${params}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Open-Meteo error: ${response.status}`)
  }

  const data = await response.json()

  // Extract the values for our specific day (index 0, since we asked for 1 day)
  return {
    date: day,
    temperature_max_c: data.daily.temperature_2m_max?.[0] ?? null,
    temperature_min_c: data.daily.temperature_2m_min?.[0] ?? null,
    precipitation_mm:  data.daily.precipitation_sum?.[0] ?? null,
    humidity_max_pct:  data.daily.relative_humidity_2m_max?.[0] ?? null,
    wind_speed_max_kmh: data.daily.wind_speed_10m_max?.[0] ?? null,
  }
}

/**
 * Fetches soil properties from SoilGrids (free, no API key needed).
 * Falls back gracefully if the API is down (it has known downtime issues).
 * @param {number} lat - latitude
 * @param {number} lon - longitude
 */
export async function fetchSoilData(lat, lon) {
  const properties = ['clay', 'sand', 'silt', 'phh2o', 'soc', 'nitrogen']
  const params = new URLSearchParams({ lon, lat })
  properties.forEach(p => params.append('property', p))
  params.append('depth', '0-5cm')
  params.append('value', 'mean')

  const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?${params}`

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) }) // 10s timeout

    if (!response.ok) {
      throw new Error(`SoilGrids error: ${response.status}`)
    }

    const data = await response.json()

    // Parse the nested SoilGrids response structure
    const result = {}
    const layers = data.properties?.layers ?? []

    for (const layer of layers) {
      const name = layer.name           // e.g. "clay"
      const depths = layer.depths ?? []
      const top = depths[0]             // we asked for 0-5cm only
      const meanVal = top?.values?.mean ?? null

      // SoilGrids returns integers with conversion factors:
      // clay/sand/silt: divide by 10 to get %
      // phh2o: divide by 10 to get pH
      // soc (soil organic carbon): divide by 10 to get g/kg
      // nitrogen: divide by 100 to get g/kg
      if (name === 'clay')     result.clay_pct = meanVal !== null ? meanVal / 10 : null
      if (name === 'sand')     result.sand_pct = meanVal !== null ? meanVal / 10 : null
      if (name === 'silt')     result.silt_pct = meanVal !== null ? meanVal / 10 : null
      if (name === 'phh2o')    result.ph = meanVal !== null ? meanVal / 10 : null
      if (name === 'soc')      result.organic_carbon_g_per_kg = meanVal !== null ? meanVal / 10 : null
      if (name === 'nitrogen') result.nitrogen_g_per_kg = meanVal !== null ? meanVal / 100 : null
    }

    return result

  } catch (err) {
    // SoilGrids is known to go down — return null values instead of crashing
    console.warn('SoilGrids unavailable:', err.message)
    return {
      clay_pct: null,
      sand_pct: null,
      silt_pct: null,
      ph: null,
      organic_carbon_g_per_kg: null,
      nitrogen_g_per_kg: null,
      error: 'SoilGrids API temporarily unavailable'
    }
  }
}