package com.example.smartcropdiseasereporter.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface ReportApiService {
    @GET("api/reports")
    fun getReports(
        @Query("sessionId") sessionId: String? = null,
        @Query("page") page: Int? = 1,
        @Query("limit") limit: Int? = 10
    ): Call<GetReportsResponse>

    @POST("api/reports/generate")
    fun generateReport(@Body body: GenerateReportRequest): Call<GenerateReportResponse>
}

data class GenerateReportRequest(val sessionId: String)

data class GenerateReportResponse(
    val success: Boolean,
    val report: Report?
)

data class GetReportsResponse(
    val success: Boolean,
    val reports: List<Report>?,
    val count: Int?,
    val pagination: Pagination?
)

data class Report(
    val _id: String,
    val sessionId: String,
    val scanId: String?,
    val diagnosis: String?,
    val treatment: String?,
    val fullReport: String?,
    val reportData: ReportData?,
    val embeddedImages: EmbeddedImages?,
    val enrichedContext: EnrichedContext?,
    val status: String?,
    val createdAt: String?
)

data class ReportData(
    val header: ReportHeader?,
    val summary: String?,
    val perLeafDetails: List<LeafDetail>?,
    val managementRecommendations: String?,
    val nextSteps: String?
)

data class ReportHeader(
    val scanId: String?,
    val crop: String?,
    val result: String?,
    val date: String?,
    val location: List<Double>?,
    val leavesAnalyzed: Int?,
    val primaryFinding: String?,
    val avgConfidence: String?
)

data class LeafDetail(
    val leafIndex: Int?,
    val disease: String?,
    val confidence: Double?,
    val severity: String?,
    val affectedArea: Int?,
    val maskId: String?
)

data class EmbeddedImages(
    @SerializedName("original_image_masked") val originalImageMasked: String?,
    @SerializedName("original_image_clean") val originalImageClean: String?,
    val leaves: Map<String, String>?
)

data class EnrichedContext(
    val weather: WeatherData?,
    val soil: SoilData?,
    val location: Location?,
    val date: String?
)

data class WeatherData(
    val temperature_2m_max: Double?,
    val temperature_2m_min: Double?,
    val precipitation_sum: Double?,
    val relative_humidity_2m: Double?,
    val wind_speed_10m_max: Double?,
    val et0_fao_evapotranspiration: Double?,
    val soil_moisture_0_to_1cm: Double?,
    val soil_moisture_1_to_3cm: Double?
)

data class SoilData(
    val sand: Double?,
    val silt: Double?,
    val clay: Double?,
    val bulk_density: Double?,
    val organic_carbon: Double?,
    val phh2o: Double?,
    val cec: Double?
)

data class Location(
    val latitude: Double,
    val longitude: Double
)

data class Pagination(
    val page: Int,
    val limit: Int,
    val total: Int,
    val pages: Int
)
