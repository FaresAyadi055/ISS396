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
    @SerializedName("scan_id") val scanId: String?,
    val diagnosis: String,
    val treatment: String,
    @SerializedName("full_report") val fullReport: String,
    @SerializedName("report_data") val reportData: ReportData,
    @SerializedName("embedded_images") val embeddedImages: EmbeddedImages,
    @SerializedName("enriched_context") val enrichedContext: EnrichedContext,
    val status: String,
    val createdAt: String
)

data class ReportData(
    val header: ReportHeader,
    val summary: String,
    @SerializedName("per_leaf_details") val perLeafDetails: List<LeafDetail>,
    @SerializedName("management_recommendations") val managementRecommendations: String,
    @SerializedName("next_steps") val nextSteps: String
)

data class ReportHeader(
    @SerializedName("scan_id") val scanId: String,
    val crop: String,
    val date: String,
    val location: List<Double>,
    @SerializedName("leaves_analyzed") val leavesAnalyzed: Int,
    @SerializedName("primary_finding") val primaryFinding: String?,
    @SerializedName("avg_confidence") val avgConfidence: String
)

data class LeafDetail(
    @SerializedName("leaf_index") val leafIndex: Int,
    val disease: String,
    val confidence: Double,
    val severity: String,
    @SerializedName("affected_area") val affectedArea: Int?,
    @SerializedName("mask_id") val maskId: String?
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
