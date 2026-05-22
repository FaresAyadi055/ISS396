import { readFile } from 'fs/promises';
import { GoogleGenAI} from '@google/genai';
import { createReport } from './report.service.js';
import { getSessionBySessionId, markSessionHasReport } from './scan.service.js';
import { parseAIReport, formatSectionsForDisplay } from './reportParser.service.js';
import { embedImagesInText, getEmbeddedImageCount } from './imageEmbed.service.js';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY environment variable is not set');
}

const ai = new GoogleGenAI({
  apiKey: GOOGLE_API_KEY,
});

async function loadPrompt() {
  try {
    const content = await readFile('./src/assets/SYSTEM_PROMPT.md', 'utf-8');
    return content;
  } catch (err) {
    console.error('Error reading system prompt file:', err);
    return `You are an agricultural expert specializing in crop disease detection and treatment.
Analyze the provided crop scan data, weather conditions, and soil information to provide:
1. A detailed diagnosis of any detected diseases
2. Recommended treatment plans
3. Preventive measures

Provide your response in a structured format with clear sections.`;
  }
}

async function fetchWeatherData(latitude, longitude, date) {
  const parsedDate = date ? new Date(date) : new Date();
  const startDate = parsedDate.toISOString().split('T')[0];

  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max,wind_speed_10m_max,et0_fao_evapotranspiration',
    hourly: 'soil_moisture_0_to_1cm,soil_moisture_1_to_3cm',
    start_date: startDate,
    end_date: startDate,
    timezone: 'auto',
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error(`Open-Meteo API error: ${response.status}`);
    
    const data = await response.json();
    const daily = data.daily || {};
    const hourly = data.hourly || {};

    return {
      temperature_2m_max: daily.temperature_2m_max?.[0],
      temperature_2m_min: daily.temperature_2m_min?.[0],
      precipitation_sum: daily.precipitation_sum?.[0],
      relative_humidity_2m: daily.relative_humidity_2m_max?.[0],
      wind_speed_10m_max: daily.wind_speed_10m_max?.[0],
      et0_fao_evapotranspiration: daily.et0_fao_evapotranspiration?.[0],
      soil_moisture_0_to_1cm: hourly.soil_moisture_0_to_1cm?.[12],
      soil_moisture_1_to_3cm: hourly.soil_moisture_1_to_3cm?.[12],
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}

async function fetchSoilData(latitude, longitude) {
  const properties = ['clay', 'sand', 'silt', 'phh2o', 'soc', 'nitrogen'];
  const propsStr = properties.join('&property=');
  const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${longitude}&lat=${latitude}&property=${propsStr}&depth=0-5cm&value=mean`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;

    const data = await response.json();
    const layers = data.properties?.layers ?? [];
    const results = {};

    for (const layer of layers) {
      const name = layer.name;
      const meanVal = layer.depths?.[0]?.values?.mean ?? null;
      if (meanVal === null) continue;

      if (name === 'clay') results.clay = meanVal / 10;
      if (name === 'sand') results.sand = meanVal / 10;
      if (name === 'silt') results.silt = meanVal / 10;
      if (name === 'phh2o') results.phh2o = meanVal / 10;
      if (name === 'soc') results.organic_carbon = meanVal / 10;
      if (name === 'nitrogen') results.nitrogen = meanVal / 100;
    }

    return Object.keys(results).length > 0 ? results : null;
  } catch (err) {
    console.warn('SoilGrids unavailable:', err.message);
    return { sand: null, silt: null, clay: null, bulk_density: null, organic_carbon: null, phh2o: null, cec: null, error: 'SoilGrids temporarily unavailable' };
  }
}

function formatScanDataForPrompt(scanDoc) {
  let scanText = '';
  const allDetections = scanDoc.scans?.flatMap((scan, scanIndex) => 
    (scan.detections || []).map((det, detIndex) => ({ ...det, scanIndex, detIndex }))
  ) || [];

  allDetections.forEach((det, i) => {
    const topClassifications = (det.classification_results?.classifications || [])
      .filter(c => c.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const maskId = det.maskId || `leaf-${i}-${Date.now()}`;

    scanText += `
=== Leaf ${i + 1} ===
maskId: ${maskId}
location: [${det.location.join(', ')}]
date: ${det.date}
classifications:
${topClassifications.map(c => `  - ${c.label}: ${(c.score * 100).toFixed(2)}%`).join('\n')}
`;
  });
  
  return scanText || 'No scan data available';
}

export async function generateCropReport(sessionId, userId) {
  const SYSTEM_PROMPT = await loadPrompt();
  
  const scanDoc = await getSessionBySessionId(sessionId, userId);
  if (!scanDoc) {
    throw new Error(`Scan session not found: ${sessionId}`);
  }

  const detections = scanDoc.scans?.flatMap(s => s.detections || []) || [];
  if (detections.length === 0) {
    throw new Error('No detections found in scan session');
  }

  const firstDetection = detections[0];
  const [longitude, latitude] = firstDetection.location;
  const date = firstDetection.date;

  const [weatherData, soilData] = await Promise.all([
    fetchWeatherData(latitude, longitude, date),
    fetchSoilData(latitude, longitude),
  ]);

  const enrichedContext = {
    weather: weatherData,
    soil: soilData,
    location: { latitude, longitude },
    date: new Date(date),
  };

  const scanDataText = formatScanDataForPrompt(scanDoc);

  const prompt = `${SYSTEM_PROMPT}

## Current Environment Data
Weather Conditions:
- Temperature: ${weatherData?.temperature_2m_min ?? 'N/A'}°C to ${weatherData?.temperature_2m_max ?? 'N/A'}°C
- Precipitation: ${weatherData?.precipitation_sum ?? 'N/A'} mm
- Humidity: ${weatherData?.relative_humidity_2m ?? 'N/A'}%
- Wind Speed: ${weatherData?.wind_speed_10m_max ?? 'N/A'} km/h
- Evapotranspiration: ${weatherData?.et0_fao_evapotranspiration ?? 'N/A'} mm/day
- Soil Moisture (0-1cm): ${weatherData?.soil_moisture_0_to_1cm ?? 'N/A'}
- Soil Moisture (1-3cm): ${weatherData?.soil_moisture_1_to_3cm ?? 'N/A'}

Soil Properties:
- Sand: ${soilData?.sand ?? 'N/A'}%
- Silt: ${soilData?.silt ?? 'N/A'}%
- Clay: ${soilData?.clay ?? 'N/A'}%
- Bulk Density: ${soilData?.bulk_density ?? 'N/A'} g/cm³
- Organic Carbon: ${soilData?.organic_carbon ?? 'N/A'}%
- pH: ${soilData?.phh2o ?? 'N/A'}
- Cation Exchange Capacity: ${soilData?.cec ?? 'N/A'} cmol/kg

## Crop Scan Data
${scanDataText}

Please analyze this data and provide a structured diagnostic report following the template. Use these image references when needed:
- original_image_masked (for the full masked image)
- original_image_clean (for the original image)
- leaf={maskId} (for individual leaf masks, e.g., leaf=dn47aos)

Format your response with clear sections: DIAGNOSTIC REPORT, SCAN ID, CROP, DATE & TIME, SUMMARY, PER-LEAF DETAILS, MANAGEMENT RECOMMENDATIONS, and NEXT STEPS FOR USER.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 4096,
    },
  });

  const aiResponse = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const embeddedReportText = embedImagesInText(aiResponse, scanDoc);
  const embeddedImageCount = getEmbeddedImageCount(embeddedReportText);

  const parsedReport = parseAIReport(embeddedReportText, scanDoc);
  const formattedSections = formatSectionsForDisplay(parsedReport);

  const diagnosisMatch = embeddedReportText.match(/\*\*Diagnosis\*\*:?\s*([\s\S]*?)(?=\*\*|$)/i);
  const treatmentMatch = embeddedReportText.match(/\*\*Treatment(?:s| Plan)?\*\*:?\s*([\s\S]*?)(?=\*\*|$)/i);

  const diagnosis = diagnosisMatch?.[1]?.trim() || formattedSections.summary || 'Analysis completed';
  const treatment = treatmentMatch?.[1]?.trim() || formattedSections.management || 'See full report';

  const embeddedImages = {
    original_image_masked: null,
    original_image_clean: null,
    leaves: {},
  };
  const firstScan = scanDoc.scans?.[0];
  if (firstScan?.original_image_masked_base64) {
    embeddedImages.original_image_masked = firstScan.original_image_masked_base64;
  }
  if (firstScan?.original_image_clean_base64) {
    embeddedImages.original_image_clean = firstScan.original_image_clean_base64;
  }

  const report = await createReport({
    farmerId: userId,
    sessionId,
    scanId: scanDoc.scans?.[0]?.scan_id,
    diagnosis,
    treatment,
    fullReport: embeddedReportText,
    enrichedContext,
    reportData: formattedSections,
    embeddedImages,
  });

  await markSessionHasReport(sessionId, userId, report._id);

  return {
    ...report.toObject(),
    reportData: formattedSections,
    embeddedImages,
    embeddedImageCount,
  };
}

export async function getReportBySessionId(sessionId) {
  const { getReportsBySession } = await import('./report.service.js');
  const result = await getReportsBySession(sessionId);
  return result.reports;
}
