package com.example.smartcropdiseasereporter

import android.graphics.BitmapFactory
import android.os.Bundle
import android.util.Base64
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.smartcropdiseasereporter.data.LoginDataSource
import com.example.smartcropdiseasereporter.data.LoginRepository
import com.example.smartcropdiseasereporter.data.api.*
import com.example.smartcropdiseasereporter.util.CacheManager
import com.example.smartcropdiseasereporter.util.SettingsManager
import io.noties.markwon.Markwon
import io.noties.markwon.image.ImagesPlugin
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.text.SimpleDateFormat
import java.util.*

class ReportsActivity : AppCompatActivity() {

    private lateinit var rvReports: RecyclerView
    private lateinit var progressBar: ProgressBar
    private lateinit var btnBack: ImageButton
    private lateinit var tvNoReports: TextView
    private lateinit var spinnerFilter: Spinner
    private lateinit var markwon: Markwon

    private lateinit var settingsManager: SettingsManager
    private lateinit var loginRepository: LoginRepository
    private lateinit var cacheManager: CacheManager
    private var reportApiService: ReportApiService? = null
    private var scanApiService: ScanApiService? = null
    
    private var allSessions: List<ScanSessionData> = emptyList()
    private var currentSessionId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_reports)

        currentSessionId = intent.getStringExtra("SESSION_ID")

        settingsManager = SettingsManager(this)
        loginRepository = LoginRepository.getInstance(LoginDataSource(settingsManager))
        cacheManager = CacheManager(this)
        
        markwon = Markwon.builder(this)
            .usePlugin(ImagesPlugin.create())
            .build()

        setupApi()
        setupUI()
        loadSessions()
    }

    private fun setupApi() {
        val user = loginRepository.user ?: return
        val backendUrl = settingsManager.getBackendUrl()
        
        val authInterceptor = Interceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("Authorization", "Bearer ${user.token}")
                .build()
            chain.proceed(request)
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(if (backendUrl.endsWith("/")) backendUrl else "$backendUrl/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        reportApiService = retrofit.create(ReportApiService::class.java)
        scanApiService = retrofit.create(ScanApiService::class.java)
    }

    private fun setupUI() {
        rvReports = findViewById(R.id.rvReports)
        rvReports.layoutManager = LinearLayoutManager(this)
        
        progressBar = findViewById(R.id.progressBarReports)
        btnBack = findViewById(R.id.btnBackReports)
        tvNoReports = findViewById(R.id.tvNoReports)
        spinnerFilter = findViewById(R.id.spinnerReportFilter)

        btnBack.setOnClickListener { finish() }
    }

    private fun loadSessions() {
        val service = scanApiService
        if (service == null) {
            loadSessionsFromCache()
            return
        }

        progressBar.visibility = View.VISIBLE
        service.getSessions().enqueue(object : Callback<ScanListResponse> {
            override fun onResponse(call: Call<ScanListResponse>, response: Response<ScanListResponse>) {
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()!!
                    allSessions = data.data ?: emptyList()
                    cacheManager.saveScans(data)
                    setupSpinner()
                } else {
                    loadSessionsFromCache()
                }
            }

            override fun onFailure(call: Call<ScanListResponse>, t: Throwable) {
                loadSessionsFromCache()
            }
        })
    }

    private fun loadSessionsFromCache() {
        val cached = cacheManager.getScans()
        if (cached != null) {
            allSessions = cached.data ?: emptyList()
            setupSpinner()
        } else {
            progressBar.visibility = View.GONE
            loadReports(null)
        }
    }

    private fun setupSpinner() {
        val sessionNames = mutableListOf("All Sessions")
        allSessions.forEachIndexed { index, _ ->
            sessionNames.add("Item ${index + 1}")
        }
        
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, sessionNames)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerFilter.adapter = adapter

        currentSessionId?.let { id ->
            val index = allSessions.indexOfFirst { it.sessionId == id }
            if (index != -1) {
                spinnerFilter.setSelection(index + 1)
            }
        }

        spinnerFilter.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val sessionId = if (position == 0) null else allSessions[position - 1].sessionId
                loadReports(sessionId)
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
    }

    private fun loadReports(sessionId: String?) {
        val service = reportApiService
        if (service == null) {
            loadReportsFromCache()
            return
        }

        progressBar.visibility = View.VISIBLE
        tvNoReports.visibility = View.GONE
        
        service.getReports(sessionId = sessionId).enqueue(object : Callback<GetReportsResponse> {
            override fun onResponse(call: Call<GetReportsResponse>, response: Response<GetReportsResponse>) {
                progressBar.visibility = View.GONE
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()!!
                    val reports = data.reports ?: emptyList()
                    cacheManager.saveReports(data)
                    if (reports.isEmpty()) {
                        tvNoReports.visibility = View.VISIBLE
                        rvReports.adapter = null
                    } else {
                        rvReports.adapter = ReportsAdapter(reports)
                    }
                } else {
                    loadReportsFromCache()
                }
            }

            override fun onFailure(call: Call<GetReportsResponse>, t: Throwable) {
                progressBar.visibility = View.GONE
                loadReportsFromCache()
            }
        })
    }

    private fun loadReportsFromCache() {
        val cached = cacheManager.getReports()
        if (cached != null) {
            val reports = cached.reports ?: emptyList()
            if (reports.isEmpty()) {
                tvNoReports.visibility = View.VISIBLE
            } else {
                rvReports.adapter = ReportsAdapter(reports)
            }
            Toast.makeText(this, "Showing cached reports (Offline)", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "No reports available offline", Toast.LENGTH_SHORT).show()
        }
    }

    inner class ReportsAdapter(private val reports: List<Report>) : RecyclerView.Adapter<ReportsAdapter.ViewHolder>() {

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.item_report, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val report = reports[position]
            val header = report.reportData?.header
            
            val crop = header?.crop ?: "Unknown Crop"
            val result = header?.result ?: "No Result"
            
            holder.tvTitle.text = "$crop - $result"
            holder.tvTitle.visibility = View.VISIBLE
            
            try {
                val createdAt = report.createdAt
                if (createdAt != null) {
                    val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                    val outputFormat = SimpleDateFormat("MMM dd, yyyy - HH:mm", Locale.getDefault())
                    val date = inputFormat.parse(createdAt)
                    holder.tvDate.text = outputFormat.format(date!!)
                } else {
                    holder.tvDate.text = "Date Unknown"
                }
            } catch (e: Exception) {
                holder.tvDate.text = report.createdAt ?: "Date Unknown"
            }

            val base64Image = report.embeddedImages?.originalImageClean
            if (!base64Image.isNullOrBlank()) {
                try {
                    val cleanBase64 = if (base64Image.startsWith("data:image")) {
                        base64Image.substringAfter("base64,")
                    } else {
                        base64Image
                    }
                    val imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                    val decodedImage = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                    holder.ivThumbnail.setImageBitmap(decodedImage)
                } catch (e: Exception) {
                    holder.ivThumbnail.setImageResource(android.R.drawable.ic_menu_gallery)
                }
            } else {
                holder.ivThumbnail.setImageResource(android.R.drawable.ic_menu_gallery)
            }

            holder.btnFullReport.setOnClickListener {
                showFullReportDialog(report)
            }
        }

        override fun getItemCount(): Int = reports.size

        inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val tvTitle: TextView = view.findViewById(R.id.tvReportTitle)
            val tvDate: TextView = view.findViewById(R.id.tvReportDate)
            val ivThumbnail: ImageView = view.findViewById(R.id.ivReportThumbnail)
            val btnFullReport: Button = view.findViewById(R.id.btnViewFullReport)
        }
    }

    private fun showFullReportDialog(report: Report) {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_full_report, null)
        val tvContent = dialogView.findViewById<TextView>(R.id.tvFullReportContent)
        
        markwon.setMarkdown(tvContent, report.fullReport ?: "Report content not available.")

        AlertDialog.Builder(this)
            .setTitle("Detailed AI Report")
            .setView(dialogView)
            .setPositiveButton("Close", null)
            .show()
    }
}
