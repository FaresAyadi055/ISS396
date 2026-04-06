package com.example.smartcropdiseasereporter.util

import android.content.Context
import android.content.SharedPreferences

class SettingsManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("app_settings", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_BACKEND_URL = "backend_url"
        private const val DEFAULT_URL = "http://"
    }

    fun saveBackendUrl(url: String) {
        prefs.edit().putString(KEY_BACKEND_URL, url).apply()
    }

    fun getBackendUrl(): String {
        return prefs.getString(KEY_BACKEND_URL, DEFAULT_URL) ?: DEFAULT_URL
    }
}