# Crop Disease Detection App

A full-stack crop disease detection system with AI-powered diagnostic reports.

## Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Mobile App    │         │   Backend API    │         │   External APIs │
│  (Native Android)│◄──────►│   (Next.js)     │◄──────►│  - Open-Meteo   │
│                 │         │                 │         │  - SoilGrids     │
│  - Camera capture│        │  - REST API     │         │  - Gemini AI     │
│  - ML Inference │         │  - MongoDB      │         │                 │
│  - View Reports │         │  - Auth         │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## Tech Stack

### Backend
- **Framework:** Next.js 16 (App Router)
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT-based auth
- **AI:** Google Gemini for report generation

### Mobile App
- **Platform:** Native Android (Kotlin)
- **ML:** TensorFlow Lite for on-device inference
- **Camera:** CameraX for image capture

## Project Structure

```
ISS396/
├── web/                    # Next.js Backend
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   │   ├── api/      # API Routes
│   │   │   │   ├── weather/
│   │   │   │   ├── soil/
│   │   │   │   ├── reports/
│   │   │   │   └── scans/
│   │   │   └── (pages)
│   │   ├── models/        # Mongoose Models
│   │   │   ├── User.js
│   │   │   ├── Scan.js
│   │   │   └── Report.js
│   │   ├── services/       # Business Logic
│   │   │   ├── gemini.service.js
│   │   │   ├── scan.service.js
│   │   │   ├── report.service.js
│   │   │   ├── reportParser.service.js
│   │   │   └── imageEmbed.service.js
│   │   └── assets/
│   │       └── SYSTEM_PROMPT.md
│   └── package.json
│
├── android/                # Native Android App
│   ├── app/src/main/
│   │   ├── java/         # Kotlin source
│   │   └── res/          # Resources
│   └── build.gradle
│
└── ml/                     # Machine Learning Models
    ├── train.py
    └── model.tflite
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB instance
- Android Studio (for mobile development)

### Backend Setup

1. Install dependencies:
```bash
cd web
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```

Edit `.env` with your values:
```
MONGODB_URI=mongodb://localhost:27017/yourdb
JWT_SECRET=your-secret-key
GOOGLE_API_KEY=your-gemini-api-key
```

3. Start development server:
```bash
npm run dev
```

### API Endpoints

#### Weather Data
```
GET /api/weather?lat={lat}&lon={lon}
```

#### Soil Data
```
GET /api/soil?lat={lat}&lon={lon}
```

#### Scan Sessions
```
POST /api/scans                    # Create/update scan session
GET  /api/scans?sessionId={id}    # Get session by ID
GET  /api/scans                   # List all sessions
```

#### Reports
```
POST /api/reports/generate         # Generate AI report
GET  /api/reports?sessionId={id}  # Get reports by session
GET  /api/reports                 # List all reports
```

## Report Generation Flow

1. Mobile app captures plant images and runs ML inference
2. Scan data (images + detections) sent to `/api/scans`
3. User triggers report generation via `/api/reports/generate`
4. Backend:
   - Fetches weather data from Open-Meteo API
   - Fetches soil data from SoilGrids API
   - Sends enriched context + scan data to Gemini AI
   - AI generates diagnostic report with embedded images
   - Report saved to MongoDB

## Report Response Structure

```json
{
  "success": true,
  "reports": [{
    "_id": "...",
    "sessionId": "...",
    "scanId": "...",
    "status": "completed",
    "diagnosis": "Apple scab detected...",
    "treatment": "Apply fungicide...",
    "fullReport": "=== DIAGNOSTIC REPORT ===\n...",
    "enrichedContext": {
      "weather": { "temperature_2m_max": 24.5, ... },
      "soil": { "sand": 35.2, "clay": 22.0, ... },
      "location": { "latitude": 36.8, "longitude": 10.18 },
      "date": "2024-05-23T10:42:00.000Z"
    },
    "reportData": {
      "header": {
        "scanId": "...",
        "crop": "Apple",
        "result": "Apple Scab",
        "date": "...",
        "location": [10.18, 36.8],
        "stats": {
          "leavesAnalyzed": 3,
          "primaryFinding": "...",
          "avgConfidence": "74.5%"
        }
      },
      "summary": "...",
      "perLeafDetails": [...],
      "managementRecommendations": "...",
      "nextSteps": "..."
    },
    "embeddedImages": {
      "original_image_masked": "base64...",
      "original_image_clean": "base64...",
      "leaves": {
        "maskId1": "base64...",
        "maskId2": "base64..."
      }
    },
    "createdAt": "...",
    "updatedAt": "..."
  }]
}
```

## External APIs

### Open-Meteo Weather API
- **Endpoint:** `https://api.open-meteo.com/v1/forecast`
- **Free tier:** Unlimited requests
- **Data:** Temperature, precipitation, humidity, wind, soil moisture

### SoilGrids API
- **Endpoint:** `https://rest.isric.org/soilgrids/v2.0/properties/query`
- **Data:** Sand, silt, clay, pH, organic carbon, nitrogen
- **Note:** Limited geographic coverage (null values for some regions)

### Google Gemini AI
- **Model:** gemini-3-flash-preview
- **Purpose:** Generate diagnostic reports from scan data
- **Requires:** `GOOGLE_API_KEY` in environment

## Mobile App (Native Android)

The mobile app is built as a native Android application using Kotlin. It features:

- Camera capture using CameraX
- On-device ML inference with TensorFlow Lite
- Leaf segmentation and disease classification
- Report viewing with embedded images
- Offline-first architecture

See `android/` directory for the full mobile app codebase.

## Development

### Running Tests
```bash
cd web
npm test
```

### Building for Production
```bash
npm run build
npm start
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Google Gemini API](https://ai.google.dev/)
- [Open-Meteo API](https://open-meteo.com/en/docs)
- [SoilGrids API](https://ISRIC.org)
