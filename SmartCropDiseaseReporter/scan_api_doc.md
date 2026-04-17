
---

# Scan API Documentation

## POST /api/scans

**Upload original images (masked + clean) and derived masks for AI classification**

Each batch represents one original scene/leaf with two versions:
- **Masked original** – the original image with mask annotations drawn on it
- **Clean original** – the same original image without any masks
- **Masks** – N individual mask images cropped from the original

All masks in the same batch share the same `location`, `date`, and `scan_id`. Repeat calls with the same `sessionId` append to the same document.

### Request — multipart/form-data

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `original_image_masked` | File | ✓ | The original image with mask annotations drawn on it. Stored as-is for visualization/reference. |
| `original_image_clean` | File | ✓ | The same original image without any masks. Stored as-is for comparison. |
| `masks` | File[] | ✓ | One or more leaf mask images cropped from the original. Each is sent to the HF MobileNet-V2 model for classification. |
| `sessionId` | string | ✓ | Groups related upload batches under one document. Use a stable device or field-trip identifier. A new document is created automatically on first use. |
| `location` | string (JSON) | ✓ | JSON-encoded `[longitude, latitude]` pair — e.g. `"[10.1815, 36.8065]"`. Applied to every mask in this batch. |
| `date` | string (ISO 8601) | optional | Capture timestamp for this batch. Defaults to server time if omitted. |
| `scan_id` | string | optional | Unique identifier for this batch. A UUID is auto-generated if omitted. |

### Data Structure

Each upload batch creates:
- **1** `scan_id`
- **2** original images (masked + clean)
- **N** detections (each with mask + classification results)

All detections reference the same batch originals (no duplication).

### Responses

#### 200 OK
```json
{
  "success": true,
  "data": {
    "_id": "664fa1b2c3e4f5a6b7c8d9e0",
    "userId": "663abc...",
    "sessionId": "device-001",
    "totalDetections": 3,
    "lastScannedAt": "2024-05-23T10:42:00.000Z",
    "createdAt": "2024-05-23T10:40:00.000Z",
    "updatedAt": "2024-05-23T10:42:00.000Z",
    "scans": [
      {
        "scan_id": "a1b2c3d4-...",
        "original_image_masked": "<base64 string of masked original>",
        "original_image_clean": "<base64 string of clean original>",
        "detections_count": 3,
        "detections": [
          {
            "location": [10.1815, 36.8065],
            "date": "2024-05-23T10:41:55.000Z",
            "mask": "<base64 string of mask 1>",
            "classification_results": {
              "classifications": [
                { "label": "Apple___Apple_scab", "score": 0.4920 },
                { "label": "Apple___Black_rot", "score": 0.1001 },
                { "label": "Apple___Cedar_apple_rust", "score": 0.0116 },
                { "label": "Apple___healthy", "score": 0.0005 }
              ]
            }
          },
          {
            "location": [10.1815, 36.8065],
            "date": "2024-05-23T10:41:55.000Z",
            "mask": "<base64 string of mask 2>",
            "classification_results": {
              "classifications": [
                { "label": "Apple___Black_rot", "score": 0.7234 },
                { "label": "Apple___Apple_scab", "score": 0.1567 }
              ]
            }
          }
        ]
      }
    ]
  }
}
```

**Note:** Classifications are returned in **alphabetical order by label** (38 entries total) for consistent aggregation.

#### 400 Bad Request
```json
{
  "success": false,
  "message": "sessionId is required"
}

{
  "success": false,
  "message": "location must be a JSON array of two numbers [lng, lat]"
}

{
  "success": false,
  "message": "Both original_image_masked and original_image_clean are required"
}

{
  "success": false,
  "message": "At least one mask image is required"
}

{
  "success": false,
  "message": "Hugging Face API error (503): ..."
}
```

### Example — Kotlin (Android)

**Add dependencies to `build.gradle.kts` (Module: app):**
```kotlin
dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.google.code.gson:gson:2.10.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")
}
```

**Add internet permission to `AndroidManifest.xml`:**
```xml
<uses-permission android:name="android.permission.INTERNET" />
```

**MainActivity.kt:**
```kotlin
package com.example.scanapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : ComponentActivity() {
    
    private val client = OkHttpClient()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        setContent {
            MaterialTheme {
                ScanScreen(
                    onUploadClick = { originalMasked, originalClean, masks ->
                        uploadScanBatch(originalMasked, originalClean, masks)
                    }
                )
            }
        }
    }
    
    private fun uploadScanBatch(
        originalMasked: File,
        originalClean: File,
        masks: List<File>
    ) {
        lifecycleScope.launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    performUpload(originalMasked, originalClean, masks)
                }
                println("Upload success: $result")
            } catch (e: Exception) {
                println("Upload failed: ${e.message}")
            }
        }
    }
    
    private fun performUpload(
        originalMasked: File,
        originalClean: File,
        masks: List<File>
    ): String {
        val multipartBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("sessionId", "device-001")
            .addFormDataPart("location", "[10.1815, 36.8065]")
            .addFormDataPart(
                "date", 
                SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
            )
            .addFormDataPart(
                "original_image_masked", 
                "masked.jpg", 
                originalMasked.asRequestBody("image/jpeg".toMediaTypeOrNull())
            )
            .addFormDataPart(
                "original_image_clean", 
                "clean.jpg", 
                originalClean.asRequestBody("image/jpeg".toMediaTypeOrNull())
            )
        
        // Add each mask
        masks.forEachIndexed { index, mask ->
            multipartBody.addFormDataPart(
                "masks", 
                "mask_$index.jpg", 
                mask.asRequestBody("image/jpeg".toMediaTypeOrNull())
            )
        }
        
        val request = Request.Builder()
            .url("https://yourapp.com/api/scans")
            .post(multipartBody.build())
            .addHeader("Authorization", "Bearer YOUR_TOKEN_HERE")
            .build()
        
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw Exception("Unexpected code $response")
            }
            return response.body?.string() ?: throw Exception("Empty response")
        }
    }
}

@Composable
fun ScanScreen(
    onUploadClick: (File, File, List<File>) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Button(
            onClick = {
                // Example: 1 masked original + 1 clean original + 3 masks
                val demoMasked = File("/path/to/masked_image.jpg")
                val demoClean = File("/path/to/clean_image.jpg")
                val demoMasks = listOf(
                    File("/path/to/mask1.jpg"),
                    File("/path/to/mask2.jpg"),
                    File("/path/to/mask3.jpg")
                )
                onUploadClick(demoMasked, demoClean, demoMasks)
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Upload Batch (2 Originals + N Masks)")
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "Each batch contains:\n" +
                   "• 1 masked original image\n" +
                   "• 1 clean original image\n" +
                   "• N mask images (N ≥ 1)",
            style = MaterialTheme.typography.bodySmall
        )
    }
}
```

---

## GET /api/scans

**List all sessions for the authenticated user**

### Query parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | string | optional | Filter results to a specific session tag. |
| `limit` | number | optional | Max documents to return. Default `50`, max `100`. |
| `skip` | number | optional | Pagination offset. Default `0`. |

### Response — 200 OK

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "664fa1b2c3e4f5a6b7c8d9e0",
      "userId": "663abc...",
      "sessionId": "device-001",
      "totalDetections": 5,
      "lastScannedAt": "2024-05-23T10:42:00.000Z",
      "scans": [ ... ],
      "createdAt": "2024-05-23T10:40:00.000Z",
      "updatedAt": "2024-05-23T10:42:00.000Z"
    }
  ]
}
```

### Example — Kotlin

```kotlin
suspend fun listSessions(sessionId: String? = null, limit: Int = 50): String {
    val urlBuilder = HttpUrl.parse("https://yourapp.com/api/scans")?.newBuilder()
    sessionId?.let { urlBuilder?.addQueryParameter("sessionId", it) }
    urlBuilder?.addQueryParameter("limit", limit.toString())
    
    val request = Request.Builder()
        .url(urlBuilder?.build().toString())
        .get()
        .addHeader("Authorization", "Bearer YOUR_TOKEN_HERE")
        .build()
    
    return client.newCall(request).execute().use { response ->
        response.body?.string() ?: throw Exception("Empty response")
    }
}
```

---

## GET /api/scans/:id

**Retrieve a single session by document ID**

### Path parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✓ | MongoDB `_id` of the scan session document. Ownership is enforced. |

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "_id": "664fa1b2c3e4f5a6b7c8d9e0",
    "userId": "663abc...",
    "sessionId": "device-001",
    "totalDetections": 5,
    "lastScannedAt": "2024-05-23T10:42:00.000Z",
    "scans": [
      {
        "scan_id": "a1b2c3d4-...",
        "original_image_masked": "<base64 string>",
        "original_image_clean": "<base64 string>",
        "detections_count": 3,
        "detections": [
          {
            "location": [10.1815, 36.8065],
            "date": "2024-05-23T10:41:55.000Z",
            "mask": "<base64 string>",
            "classification_results": {
              "classifications": [
                { "label": "Apple___Apple_scab", "score": 0.4920 }
              ]
            }
          }
        ]
      }
    ],
    "createdAt": "2024-05-23T10:40:00.000Z",
    "updatedAt": "2024-05-23T10:42:00.000Z"
  }
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Scan session not found"
}
```

### Example — Kotlin

```kotlin
suspend fun getSessionById(sessionDocId: String): String {
    val request = Request.Builder()
        .url("https://yourapp.com/api/scans/$sessionDocId")
        .get()
        .addHeader("Authorization", "Bearer YOUR_TOKEN_HERE")
        .build()
    
    return client.newCall(request).execute().use { response ->
        if (!response.isSuccessful) {
            throw Exception("Session not found or unauthorized")
        }
        response.body?.string() ?: throw Exception("Empty response")
    }
}
```

---

## Data Class Examples (Kotlin)

```kotlin
data class ScanResponse(
    val success: Boolean,
    val data: ScanData?
)

data class ScanData(
    val id: String,
    val userId: String,
    val sessionId: String,
    val totalDetections: Int,
    val lastScannedAt: String,
    val scans: List<ScanBatch>
)

data class ScanBatch(
    val scanId: String,
    val originalImageMasked: String,  // base64
    val originalImageClean: String,   // base64
    val detectionsCount: Int,
    val detections: List<Detection>
)

data class Detection(
    val location: List<Double>,
    val date: String,
    val mask: String,                 // base64
    val classificationResults: ClassificationResults
)

data class ClassificationResults(
    val classifications: List<Classification>
)

data class Classification(
    val label: String,
    val score: Double
)
```

### Usage with Gson

```kotlin
val gson = Gson()
val response = gson.fromJson(jsonString, ScanResponse::class.java)
if (response.success) {
    val batches = response.data?.scans ?: emptyList()
    batches.forEach { batch ->
        println("Batch ID: ${batch.scanId}")
        println("  Masked original: ${batch.originalImageMasked.take(50)}...")
        println("  Detections: ${batch.detectionsCount}")
        batch.detections.forEach { detection ->
            val topPrediction = detection.classificationResults.classifications
                .maxByOrNull { it.score }
            println("    → ${topPrediction?.label} (${topPrediction?.score})")
        }
    }
}
```

## Notes

- **Authentication required** for all endpoints via Bearer token
- **2 original images per batch**: one with masks drawn, one clean
- **N masks per batch**: all derived from the same original images
- **No duplication**: originals stored once per batch, not per mask
- **Classifications** are returned in **alphabetical order by label** (38 entries total)
- Use stable `sessionId` values to group related scan batches
- Each batch must have at least 1 mask (N ≥ 1)