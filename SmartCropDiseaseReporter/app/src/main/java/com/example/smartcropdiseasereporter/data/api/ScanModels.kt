package com.example.smartcropdiseasereporter.data.api

import com.google.gson.annotations.SerializedName

data class ScanListResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: List<ScanSessionData>
)

data class ScanSessionResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: ScanSessionData
)

data class ScanSessionData(
    @SerializedName("_id") val sessionId: String,
    @SerializedName("location") val location: String,
    @SerializedName("date") val date: String,
    @SerializedName("scans") val scans: List<ScanBatch>
)

data class ScanBatch(
    @SerializedName("image") val image: List<ScanImage>
)

data class ScanImage(
    @SerializedName("mask") val mask: String, // Base64 encoded image
    @SerializedName("classification_results") val classification_results: ClassificationResults
)

data class ClassificationResults(
    @SerializedName("classifications") val classifications: List<Classification>
)

data class Classification(
    @SerializedName("label") val label: String,
    @SerializedName("score") val score: Double
)
