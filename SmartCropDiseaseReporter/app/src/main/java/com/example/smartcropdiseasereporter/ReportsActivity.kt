package com.example.smartcropdiseasereporter

import android.os.Bundle
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
import com.example.smartcropdiseasereporter.data.api.GetReportsResponse
import com.example.smartcropdiseasereporter.data.api.Report
import com.example.smartcropdiseasereporter.data.api.ReportApiService
import com.example.smartcropdiseasereporter.util.SettingsManager
import io.noties.markwon.Markwon
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
    private lateinit var markwon: Markwon

    private lateinit var settingsManager: SettingsManager
    private lateinit var loginRepository: LoginRepository
    private lateinit var apiService: ReportApiService

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_reports)

        settingsManager = SettingsManager(this)
        loginRepository = LoginRepository.getInstance(LoginDataSource(settingsManager))
        markwon = Markwon.create(this)

        setupApi()
        setupUI()
        loadReports()
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

        apiService = retrofit.create(ReportApiService::class.java)
    }

    private fun setupUI() {
        rvReports = findViewById(R.id.rvReports)
        rvReports.layoutManager = LinearLayoutManager(this)
        
        progressBar = findViewById(R.id.progressBarReports)
        btnBack = findViewById(R.id.btnBackReports)
        tvNoReports = findViewById(R.id.tvNoReports)

        btnBack.setOnClickListener { finish() }
    }

    private fun loadReports() {
        progressBar.visibility = View.VISIBLE
        tvNoReports.visibility = View.GONE
        
        apiService.getReports().enqueue(object : Callback<GetReportsResponse> {
            override fun onResponse(call: Call<GetReportsResponse>, response: Response<GetReportsResponse>) {
                progressBar.visibility = View.GONE
                if (response.isSuccessful && response.body()?.success == true) {
                    val reports = response.body()?.reports ?: emptyList()
                    if (reports.isEmpty()) {
                        tvNoReports.visibility = View.VISIBLE
                    } else {
                        rvReports.adapter = ReportsAdapter(reports)
                    }
                } else {
                    Toast.makeText(this@ReportsActivity, "Failed to load reports", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(call: Call<GetReportsResponse>, t: Throwable) {
                progressBar.visibility = View.GONE
                Toast.makeText(this@ReportsActivity, "Error: ${t.message}", Toast.LENGTH_SHORT).show()
            }
        })
    }

    inner class ReportsAdapter(private val reports: List<Report>) : RecyclerView.Adapter<ReportsAdapter.ViewHolder>() {

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.item_report, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val report = reports[position]
            val header = report.reportData.header
            
            holder.tvTitle.text = "${header.crop} Diagnosis - ${header.primaryFinding}"
            
            // Format date
            try {
                val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                val outputFormat = SimpleDateFormat("MMM dd, yyyy - HH:mm", Locale.getDefault())
                val date = inputFormat.parse(report.createdAt)
                holder.tvDate.text = outputFormat.format(date!!)
            } catch (e: Exception) {
                holder.tvDate.text = report.createdAt
            }

            holder.tvDiagnosis.text = report.diagnosis
            holder.tvTreatment.text = report.treatment

            holder.btnFullReport.setOnClickListener {
                showFullReportDialog(report)
            }
        }

        override fun getItemCount(): Int = reports.size

        inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val tvTitle: TextView = view.findViewById(R.id.tvReportTitle)
            val tvDate: TextView = view.findViewById(R.id.tvReportDate)
            val tvDiagnosis: TextView = view.findViewById(R.id.tvDiagnosis)
            val tvTreatment: TextView = view.findViewById(R.id.tvTreatment)
            val btnFullReport: Button = view.findViewById(R.id.btnViewFullReport)
        }
    }

    private fun showFullReportDialog(report: Report) {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_full_report, null)
        val tvContent = dialogView.findViewById<TextView>(R.id.tvFullReportContent)
        
        // Render Markdown instead of raw text
        markwon.setMarkdown(tvContent, report.fullReport)

        AlertDialog.Builder(this)
            .setTitle("Detailed AI Report")
            .setView(dialogView)
            .setPositiveButton("Close", null)
            .show()
    }
}
