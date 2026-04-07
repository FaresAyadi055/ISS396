package com.example.smartcropdiseasereporter.data.api

import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Call
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

interface ScanApiService {
    @Multipart
    @POST("api/scans")
    fun uploadScans(
        @Part masks: List<MultipartBody.Part>,
        @Part("sessionId") sessionId: RequestBody,
        @Part("location") location: RequestBody,
        @Part("date") date: RequestBody? = null,
        @Part("scan_id") scanId: RequestBody? = null
    ): Call<ResponseBody>
}
