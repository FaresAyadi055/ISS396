package com.example.smartcropdiseasereporter.util

import android.content.Context
import com.example.smartcropdiseasereporter.data.api.ScanListResponse
import com.example.smartcropdiseasereporter.data.api.GetReportsResponse
import com.google.gson.Gson
import java.io.File

class CacheManager(private val context: Context) {
    private val gson = Gson()
    private val scansFile = "scans_cache.json"
    private val reportsFile = "reports_cache.json"

    fun saveScans(data: ScanListResponse) {
        try {
            val json = gson.toJson(data)
            File(context.filesDir, scansFile).writeText(json)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun getScans(): ScanListResponse? {
        return try {
            val file = File(context.filesDir, scansFile)
            if (file.exists()) {
                gson.fromJson(file.readText(), ScanListResponse::class.java)
            } else null
        } catch (e: Exception) {
            null
        }
    }

    fun saveReports(data: GetReportsResponse) {
        try {
            val json = gson.toJson(data)
            File(context.filesDir, reportsFile).writeText(json)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun getReports(): GetReportsResponse? {
        return try {
            val file = File(context.filesDir, reportsFile)
            if (file.exists()) {
                gson.fromJson(file.readText(), GetReportsResponse::class.java)
            } else null
        } catch (e: Exception) {
            null
        }
    }
}
