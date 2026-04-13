# API Documentation - Crop Disease Detection Reports

```markdown
# Crop Disease Detection API Documentation

## Base URL
```
https://your-api-domain.com/api
```

---

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <jwt_token>
```

---

## 1. Weather Data Endpoint

### GET `/weather`
Fetches weather data from Open-Meteo API for a specific location and date.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| latitude | number | Yes | Latitude coordinate (-90 to 90) |
| longitude | number | Yes | Longitude coordinate (-180 to 180) |
| date | string | No | ISO 8601 date (defaults to current date) |

**Response:**
```json
{
  "success": true,
  "data": {
    "temperature_2m_max": 28.5,
    "temperature_2m_min": 18.2,
    "precipitation_sum": 2.4,
    "relative_humidity_2m": 75,
    "wind_speed_10m_max": 12.3,
    "et0_fao_evapotranspiration": 4.2,
    "soil_moisture_0_to_1cm": 0.32,
    "soil_moisture_1_to_3cm": 0.35,
    "location": {
      "latitude": 36.8065,
      "longitude": 10.1815
    },
    "date": "2024-05-23T00:00:00.000Z"
  }
}
```

**Kotlin Example:**
```kotlin
suspend fun getWeatherData(
    latitude: Double,
    longitude: Double,
    date: String? = null
): WeatherResponse {
    val params = buildString {
        append("latitude=$latitude")
        append("&longitude=$longitude")
        date?.let { append("&date=$it") }
    }
    
    return khttp.get(
        url = "https://your-api-domain.com/api/weather?$params",
        headers = mapOf("Authorization" to "Bearer $token")
    ).let { 
        kotlinx.coroutines.serialization.json.Json.decodeFromString<WeatherResponse>(it.text) 
    }
}
```

---

## 2. Soil Data Endpoint

### GET `/soil`
Fetches soil data from SoilGrids API for a specific location.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| latitude | number | Yes | Latitude coordinate |
| longitude | number | Yes | Longitude coordinate |

**Response:**
```json
{
  "success": true,
  "data": {
    "sand": 45.2,
    "silt": 30.1,
    "clay": 24.7,
    "bulk_density": 1.35,
    "organic_carbon": 2.1,
    "phh2o": 6.5,
    "cec": 15.3
  }
}
```

**Kotlin Example:**
```kotlin
suspend fun getSoilData(latitude: Double, longitude: Double): SoilResponse {
    return khttp.get(
        url = "https://your-api-domain.com/api/soil",
        params = mapOf(
            "latitude" to latitude.toString(),
            "longitude" to longitude.toString()
        ),
        headers = mapOf("Authorization" to "Bearer $token")
    ).let {
        kotlinx.coroutines.serialization.json.Json.decodeFromString<SoilResponse>(it.text)
    }
}
```

---

## 3. Generate AI Report

### POST `/reports/generate`
Generates an AI-powered diagnostic report from scan data. The AI analyzes:
- Crop classification results
- Weather conditions (Open-Meteo)
- Soil properties (SoilGrids)

**Request Body:**
```json
{
  "sessionId": "device-001"
}
```

**Response:**
```json
{
  "success": true,
  "report": {
    "_id": "6650a1b2c3e4f5a6b7c8d9e0",
    "sessionId": "device-001",
    "scanId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "diagnosis": "Apple Scab detected with 82.3% confidence. Moderate severity affecting 15% of leaf area.",
    "treatment": "Apply fungicide containing captan or myclobutanil within 24 hours...",
    "fullReport": "=== DIAGNOSTIC REPORT ===\nScan ID: a1b2c3d4...\n...",
    "reportData": {
      "header": {
        "scanId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "crop": "Apple",
        "date": "2024-05-23T10:42:00.000Z",
        "location": [10.1815, 36.8065],
        "leavesAnalyzed": 5,
        "primaryFinding": "Apple Scab (82.3%)",
        "avgConfidence": "67.5%"
      },
      "summary": "- Leaves analyzed: 5\n- Primary finding: Apple Scab\n- Average confidence: 67.5%",
      "perLeafDetails": [
        {
          "leafIndex": 1,
          "disease": "Apple Scab",
          "confidence": 0.823,
          "severity": "high",
          "affectedArea": 15,
          "maskId": "dn47aos9f2b3c4d5"
        },
        {
          "leafIndex": 2,
          "disease": "Apple Scab",
          "confidence": 0.756,
          "severity": "medium",
          "affectedArea": 10,
          "maskId": "45kl5j8e7f6g5h4a"
        }
      ],
      "managementRecommendations": "Apply fungicide within 24 hours...",
      "nextSteps": "Re-scan in 7 days to monitor progress..."
    },
    "embeddedImages": {
      "original_image_masked": "iVBORw0KGgoAAAANSUhEUgAAAAUA...",
      "original_image_clean": "iVBORw0KGgoAAAANSUhEUgAAAAUA...",
      "leaves": {
        "dn47aos9f2b3c4d5": "iVBORw0KGgoAAAANSUhEUgAAAAUA...",
        "45kl5j8e7f6g5h4a": "iVBORw0KGgoAAAANSUhEUgAAAAUA..."
      }
    },
    "enrichedContext": {
      "weather": { ... },
      "soil": { ... },
      "location": { "latitude": 36.8065, "longitude": 10.1815 },
      "date": "2024-05-23T00:00:00.000Z"
    },
    "status": "completed",
    "createdAt": "2024-05-23T10:45:00.000Z"
  }
}
```

**Kotlin Example:**
```kotlin
data class GenerateReportRequest(val sessionId: String)

data class GenerateReportResponse(
    val success: Boolean,
    val report: Report?
)

data class Report(
    val _id: String,
    val sessionId: String,
    val scanId: String?,
    val diagnosis: String,
    val treatment: String,
    val fullReport: String,
    val reportData: ReportData,
    val embeddedImages: EmbeddedImages,
    val enrichedContext: EnrichedContext,
    val status: String,
    val createdAt: String
)

data class ReportData(
    val header: ReportHeader,
    val summary: String,
    val perLeafDetails: List<LeafDetail>,
    val managementRecommendations: String,
    val nextSteps: String
)

data class ReportHeader(
    val scanId: String,
    val crop: String,
    val date: String,
    val location: List<Double>,
    val leavesAnalyzed: Int,
    val primaryFinding: String,
    val avgConfidence: String
)

data class LeafDetail(
    val leafIndex: Int,
    val disease: String,
    val confidence: Double,
    val severity: String,
    val affectedArea: Int?,
    val maskId: String?
)

data class EmbeddedImages(
    val original_image_masked: String?,
    val original_image_clean: String?,
    val leaves: Map<String, String>?
)

data class EnrichedContext(
    val weather: WeatherData?,
    val soil: SoilData?,
    val location: Location?,
    val date: String?
)

suspend fun generateCropReport(sessionId: String): GenerateReportResponse {
    return khttp.post(
        url = "https://your-api-domain.com/api/reports/generate",
        headers = mapOf(
            "Authorization" to "Bearer $token",
            "Content-Type" to "application/json"
        ),
        json = mapOf("sessionId" to sessionId)
    ).let {
        kotlinx.coroutines.serialization.json.Json.decodeFromString(it.text)
    }
}
```

---

## 4. Get Reports

### GET `/reports`
Retrieves reports for the authenticated user.

**Query Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| sessionId | string | No | Filter by session ID |
| farmerId | string | No | Filter by farmer (admin only) |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10, max: 100) |

**Response:**
```json
{
  "success": true,
  "reports": [ ... ],
  "count": 15,
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "pages": 2
  }
}
```

**Kotlin Example:**
```kotlin
data class GetReportsResponse(
    val success: Boolean,
    val reports: List<Report>?,
    val count: Int?,
    val pagination: Pagination?
)

data class Pagination(
    val page: Int,
    val limit: Int,
    val total: Int,
    val pages: Int
)

suspend fun getReports(
    sessionId: String? = null,
    page: Int = 1,
    limit: Int = 10
): GetReportsResponse {
    val params = mutableMapOf<String, String>()
    sessionId?.let { params["sessionId"] = it }
    params["page"] = page.toString()
    params["limit"] = limit.toString()
    
    return khttp.get(
        url = "https://your-api-domain.com/api/reports",
        params = params,
        headers = mapOf("Authorization" to "Bearer $token")
    ).let {
        kotlinx.coroutines.serialization.json.Json.decodeFromString(it.text)
    }
}
```

---

## 5. Create Report (Manual)

### POST `/reports`
Creates a report manually (typically used by admin).

**Request Body:**
```json
{
  "sessionId": "device-001",
  "scanId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "diagnosis": "Manual diagnosis text",
  "treatment": "Treatment recommendations",
  "fullReport": "Full detailed report...",
  "enrichedContext": {
    "weather": { ... },
    "soil": { ... },
    "location": { "latitude": 36.8065, "longitude": 10.1815 },
    "date": "2024-05-23T00:00:00.000Z"
  }
}
```

**Kotlin Example:**
```kotlin
data class CreateReportRequest(
    val sessionId: String,
    val scanId: String? = null,
    val diagnosis: String,
    val treatment: String,
    val fullReport: String? = null,
    val enrichedContext: EnrichedContext? = null
)

data class CreateReportResponse(
    val success: Boolean,
    val data: Report?
)

suspend fun createReport(request: CreateReportRequest): CreateReportResponse {
    return khttp.post(
        url = "https://your-api-domain.com/api/reports",
        headers = mapOf(
            "Authorization" to "Bearer $token",
            "Content-Type" to "application/json"
        ),
        json = kotlinx.coroutines.serialization.json.Json.encodeToJsonElement(
            kotlinx.coroutines.serialization.serializer(),
            request
        )
    ).let {
        kotlinx.coroutines.serialization.json.Json.decodeFromString(it.text)
    }
}
```

---

## Error Responses

All endpoints may return these error responses:

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "message": "sessionId is required"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Data Models Summary

### WeatherData
| Field | Type | Description |
|-------|------|-------------|
| temperature_2m_max | Double? | Max temperature (°C) |
| temperature_2m_min | Double? | Min temperature (°C) |
| precipitation_sum | Double? | Precipitation (mm) |
| relative_humidity_2m | Double? | Humidity (%) |
| wind_speed_10m_max | Double? | Max wind speed (km/h) |
| et0_fao_evapotranspiration | Double? | Evapotranspiration (mm/day) |
| soil_moisture_0_to_1cm | Double? | Soil moisture 0-1cm |
| soil_moisture_1_to_3cm | Double? | Soil moisture 1-3cm |

### SoilData
| Field | Type | Description |
|-------|------|-------------|
| sand | Double? | Sand content (%) |
| silt | Double? | Silt content (%) |
| clay | Double? | Clay content (%) |
| bulk_density | Double? | Bulk density (g/cm³) |
| organic_carbon | Double? | Organic carbon (%) |
| phh2o | Double? | pH level |
| cec | Double? | Cation exchange capacity (cmol/kg) |
```

---

Would you like me to save this as a `.md` file, or do you need any modifications to the documentation?