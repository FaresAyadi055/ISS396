package com.example.smartcropdiseasereporter.data.api

import com.google.gson.annotations.SerializedName
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Call
import retrofit2.http.*

interface ScanApiService {
    @POST("api/scans")
    fun uploadScans(
        @Body body: RequestBody
    ): Call<ResponseBody>

    @GET("api/scans")
    fun getSessions(
        @Query("sessionId") sessionId: String? = null,
        @Query("limit") limit: Int? = 50,
        @Query("skip") skip: Int? = 0
    ): Call<ScanListResponse>

    @GET("api/scans/{id}")
    fun getSessionById(@Path("id") id: String): Call<ScanSessionResponse>
}

data class ScanListResponse(
    val success: Boolean,
    val count: Int,
    val data: List<ScanSessionData>
)

data class ScanSessionResponse(
    val success: Boolean,
    val data: ScanSessionData
)

data class ScanSessionData(
    val _id: String,
    val userId: String,
    val sessionId: String,
    val totalDetections: Int,
    val lastScannedAt: String,
    val createdAt: String,
    val updatedAt: String,
    val scans: List<ScanBatch>,
    @SerializedName("enriched_context") val enrichedContext: EnrichedContext? = null,
    val hasReport: Boolean? = false,
    val reportId: String? = null
)

data class ScanBatch(
    @SerializedName("scan_id") val scanId: String,
    @SerializedName("original_image_masked") val originalImageMasked: String?, // base64
    @SerializedName("original_image_clean") val originalImageClean: String?, // base64
    @SerializedName("detections_count") val detectionsCount: Int,
    val detections: List<ScanDetection>
)

data class ScanDetection(
    val location: List<Double>,
    val date: String,
    val mask: String, // base64
    @SerializedName("classification_results") val classificationResults: ClassificationResults
)

data class ClassificationResults(
    val classifications: List<Classification>
)

data class Classification(
    val label: String,
    val score: Double
)
