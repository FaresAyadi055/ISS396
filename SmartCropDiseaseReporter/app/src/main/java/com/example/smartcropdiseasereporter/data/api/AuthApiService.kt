package com.example.smartcropdiseasereporter.data.api

import com.example.smartcropdiseasereporter.data.model.LoginRequest
import com.example.smartcropdiseasereporter.data.model.LoginResponse
import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApiService {
    @POST("api/auth/login")
    fun login(@Body request: LoginRequest): Call<LoginResponse>
}
