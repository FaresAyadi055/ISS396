package com.example.smartcropdiseasereporter.data

import com.example.smartcropdiseasereporter.data.api.AuthApiService
import com.example.smartcropdiseasereporter.data.model.LoggedInUser
import com.example.smartcropdiseasereporter.data.model.LoginRequest
import com.example.smartcropdiseasereporter.util.SettingsManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException

/**
 * Class that handles authentication w/ login credentials and retrieves user information.
 */
class LoginDataSource(private val settingsManager: SettingsManager) {

    fun login(username: String, password: String): Result<LoggedInUser> {
        try {
            val baseUrl = settingsManager.getBackendUrl().let { 
                if (it.endsWith("/")) it else "$it/"
            }
            
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            val client = OkHttpClient.Builder()
                .addInterceptor(logging)
                .build()

            val retrofit = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()

            val service = retrofit.create(AuthApiService::class.java)
            val response = service.login(LoginRequest(username, password)).execute()

            if (response.isSuccessful && response.body() != null) {
                val loginResponse = response.body()!!
                if (loginResponse.success && loginResponse.user != null) {
                    return Result.Success(
                        LoggedInUser(
                            userId = loginResponse.user.id,
                            displayName = loginResponse.user.name,
                            token = loginResponse.token ?: ""
                        )
                    )
                }
            }
            return Result.Error(IOException("Login failed: ${response.message()}"))
        } catch (e: Exception) {
            return Result.Error(IOException("Error logging in", e))
        }
    }

    fun logout() {
        // TODO: revoke authentication
    }
}
