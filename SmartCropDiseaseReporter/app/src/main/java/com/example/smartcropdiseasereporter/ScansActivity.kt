package com.example.smartcropdiseasereporter

import android.content.Intent
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
import com.example.smartcropdiseasereporter.util.SettingsManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class ScansActivity : AppCompatActivity() {

    private lateinit var rvScans: RecyclerView
    private lateinit var spinnerFilter: Spinner
    private lateinit var btnBack: ImageButton
    private lateinit var progressBar: ProgressBar
    
    private lateinit var settingsManager: SettingsManager
    private lateinit var loginRepository: LoginRepository
    private lateinit var apiService: ScanApiService
    private lateinit var reportApiService: ReportApiService
    
    private var currentSessionId: String? = null
    private var allSessions: List<ScanSessionData> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_scans)

        currentSessionId = intent.getStringExtra("SESSION_ID")

        settingsManager = SettingsManager(this)
        loginRepository = LoginRepository.getInstance(LoginDataSource(settingsManager))
        
        setupApi()
        setupUI()
        loadData()
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
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(if (backendUrl.endsWith("/")) backendUrl else "$backendUrl/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        apiService = retrofit.create(ScanApiService::class.java)
        reportApiService = retrofit.create(ReportApiService::class.java)
    }

    private fun setupUI() {
        rvScans = findViewById(R.id.rvScans)
        rvScans.layoutManager = LinearLayoutManager(this)
        
        spinnerFilter = findViewById(R.id.spinnerSessionFilter)
        
        btnBack = findViewById(R.id.btnBack)
        btnBack.setOnClickListener { finish() }

        progressBar = findViewById(R.id.progressBar)
        
        findViewById<Button>(R.id.btnGenerateDiagnostic).visibility = View.GONE
    }

    private fun loadData() {
        progressBar.visibility = View.VISIBLE
        apiService.getSessions().enqueue(object : Callback<ScanListResponse> {
            override fun onResponse(call: Call<ScanListResponse>, response: Response<ScanListResponse>) {
                progressBar.visibility = View.GONE
                if (response.isSuccessful && response.body()?.success == true) {
                    allSessions = response.body()?.data ?: emptyList()
                    setupSpinner()
                    updateDisplay()
                } else {
                    Toast.makeText(this@ScansActivity, "Failed to load scans", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(call: Call<ScanListResponse>, t: Throwable) {
                progressBar.visibility = View.GONE
                Toast.makeText(this@ScansActivity, "Error: ${t.message}", Toast.LENGTH_SHORT).show()
            }
        })
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
                updateDisplay()
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
    }

    private fun updateDisplay() {
        val selectedPos = spinnerFilter.selectedItemPosition
        val filtered = if (selectedPos == 0) {
            allSessions
        } else {
            listOf(allSessions[selectedPos - 1])
        }
        displaySessions(filtered)
    }

    private fun displaySessions(sessions: List<ScanSessionData>) {
        val adapter = ScansAdapter(sessions)
        rvScans.adapter = adapter
    }

    inner class ScansAdapter(private val sessionsList: List<ScanSessionData>) : RecyclerView.Adapter<ScansAdapter.BatchHeaderViewHolder>() {
        
        private val items = mutableListOf<Pair<ScanSessionData, ScanBatch>>()

        init {
            sessionsList.forEach { session ->
                session.scans.forEach { batch ->
                    items.add(session to batch)
                }
            }
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): BatchHeaderViewHolder {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.item_scan_batch_header, parent, false)
            return BatchHeaderViewHolder(view)
        }

        override fun onBindViewHolder(holder: BatchHeaderViewHolder, position: Int) {
            val (session, batch) = items[position]
            
            val sessionIdx = allSessions.indexOfFirst { it._id == session._id } + 1
            holder.tvTitle.text = "Session: Item $sessionIdx - Batch ${batch.scanId.take(8)}"
            
            var showMasked = true
            fun updateImage() {
                val base64 = if (showMasked) batch.originalImageMasked else batch.originalImageClean
                if (!base64.isNullOrEmpty()) {
                    try {
                        val bytes = Base64.decode(base64, Base64.DEFAULT)
                        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                        holder.ivOriginal.setImageBitmap(bitmap)
                    } catch (e: Exception) {}
                }
            }
            updateImage()
            holder.btnToggle.setOnClickListener {
                showMasked = !showMasked
                updateImage()
                holder.btnToggle.setImageResource(if (showMasked) android.R.drawable.ic_menu_view else android.R.drawable.ic_menu_gallery)
            }

            holder.container.removeAllViews()
            batch.detections.forEach { det ->
                val detView = LayoutInflater.from(this@ScansActivity).inflate(R.layout.view_detection_row, holder.container, false)
                val ivMask = detView.findViewById<ImageView>(R.id.ivSmallMask)
                val tvLabel = detView.findViewById<TextView>(R.id.tvSmallLabel)
                val tvConf = detView.findViewById<TextView>(R.id.tvSmallConf)
                val tvRes = detView.findViewById<TextView>(R.id.tvSmallResolution)

                val best = det.classificationResults.classifications.maxByOrNull { it.score }
                tvLabel.text = best?.label?.replace("___", " ")?.replace("_", " ") ?: "Unknown"
                tvConf.text = String.format("%.1f%%", (best?.score ?: 0.0) * 100)

                try {
                    val bytes = Base64.decode(det.mask, Base64.DEFAULT)
                    val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                    ivMask.setImageBitmap(bitmap)
                    tvRes.text = "Resolution: ${bitmap.width}x${bitmap.height}"
                } catch (e: Exception) {}

                holder.container.addView(detView)
            }

            val hasReport = session.hasReport == true
            if (!hasReport) {
                holder.btnGenerate.visibility = View.VISIBLE
                holder.btnGenerate.setOnClickListener {
                    generateDiagnostic(session.sessionId)
                }
            } else {
                holder.btnGenerate.visibility = View.GONE
            }
        }

        override fun getItemCount(): Int = items.size

        inner class BatchHeaderViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val tvTitle: TextView = view.findViewById(R.id.tvBatchTitle)
            val ivOriginal: ImageView = view.findViewById(R.id.ivOriginalImage)
            val btnToggle: ImageButton = view.findViewById(R.id.btnToggleMask)
            val container: LinearLayout = view.findViewById(R.id.llDetectionsContainer)
            val btnGenerate: Button = view.findViewById(R.id.btnGenerateReport)
        }
    }

    private fun generateDiagnostic(sessionId: String) {
        progressBar.visibility = View.VISIBLE
        reportApiService.generateReport(GenerateReportRequest(sessionId)).enqueue(object : Callback<GenerateReportResponse> {
            override fun onResponse(call: Call<GenerateReportResponse>, response: Response<GenerateReportResponse>) {
                progressBar.visibility = View.GONE
                if (response.isSuccessful && response.body()?.success == true) {
                    showSuccessDialog(sessionId)
                } else {
                    Toast.makeText(this@ScansActivity, "Generation failed", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(call: Call<GenerateReportResponse>, t: Throwable) {
                progressBar.visibility = View.GONE
                Toast.makeText(this@ScansActivity, "Error: ${t.message}", Toast.LENGTH_SHORT).show()
            }
        })
    }

    private fun showSuccessDialog(sessionId: String) {
        AlertDialog.Builder(this)
            .setTitle("Report Generated")
            .setMessage("Your AI diagnostic report has been created successfully. Would you like to view it now?")
            .setPositiveButton("View Reports") { _, _ ->
                val intent = Intent(this, ReportsActivity::class.java)
                intent.putExtra("SESSION_ID", sessionId)
                startActivity(intent)
                finish()
            }
            .setNegativeButton("Later", null)
            .show()
    }
}
