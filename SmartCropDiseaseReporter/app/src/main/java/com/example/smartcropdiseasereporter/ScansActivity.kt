package com.example.smartcropdiseasereporter

import android.graphics.BitmapFactory
import android.os.Bundle
import android.util.Base64
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.smartcropdiseasereporter.data.LoginDataSource
import com.example.smartcropdiseasereporter.data.LoginRepository
import com.example.smartcropdiseasereporter.data.api.ScanApiService
import com.example.smartcropdiseasereporter.data.api.ScanImage
import com.example.smartcropdiseasereporter.data.api.ScanListResponse
import com.example.smartcropdiseasereporter.data.api.ScanSessionData
import com.example.smartcropdiseasereporter.data.api.ScanSessionResponse
import com.example.smartcropdiseasereporter.util.SettingsManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class ScansActivity : AppCompatActivity() {

    private lateinit var rvScans: RecyclerView
    private lateinit var spinnerFilter: Spinner
    private lateinit var btnBack: ImageButton
    private lateinit var progressBar: ProgressBar
    private lateinit var btnGenerateDiagnostic: Button
    
    private lateinit var settingsManager: SettingsManager
    private lateinit var loginRepository: LoginRepository
    private lateinit var apiService: ScanApiService
    
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
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(if (backendUrl.endsWith("/")) backendUrl else "$backendUrl/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        apiService = retrofit.create(ScanApiService::class.java)
    }

    private fun setupUI() {
        rvScans = findViewById(R.id.rvScans)
        rvScans.layoutManager = LinearLayoutManager(this)
        
        spinnerFilter = findViewById(R.id.spinnerSessionFilter)
        val filters = if (currentSessionId != null) arrayOf("This Session", "All Sessions") else arrayOf("All Sessions")
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, filters)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerFilter.adapter = adapter
        
        spinnerFilter.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (filters[position] == "This Session") {
                    displaySessions(allSessions.filter { it.sessionId == currentSessionId })
                } else {
                    displaySessions(allSessions)
                }
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        btnBack = findViewById(R.id.btnBack)
        btnBack.setOnClickListener { finish() }

        progressBar = findViewById(R.id.progressBar)
        btnGenerateDiagnostic = findViewById(R.id.btnGenerateDiagnostic)
        btnGenerateDiagnostic.setOnClickListener {
            Toast.makeText(this, "Diagnostic generation started...", Toast.LENGTH_SHORT).show()
        }
    }

    private fun loadData() {
        progressBar.visibility = View.VISIBLE
        apiService.getSessions().enqueue(object : Callback<ScanListResponse> {
            override fun onResponse(call: Call<ScanListResponse>, response: Response<ScanListResponse>) {
                progressBar.visibility = View.GONE
                if (response.isSuccessful && response.body()?.success == true) {
                    allSessions = response.body()?.data ?: emptyList()
                    if (currentSessionId != null && spinnerFilter.selectedItem == "This Session") {
                        displaySessions(allSessions.filter { it.sessionId == currentSessionId })
                    } else {
                        displaySessions(allSessions)
                    }
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

    private fun displaySessions(sessions: List<ScanSessionData>) {
        val adapter = ScansAdapter(sessions)
        rvScans.adapter = adapter
    }

    inner class ScansAdapter(private val sessions: List<ScanSessionData>) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
        
        private val items = mutableListOf<Any>()

        init {
            sessions.forEach { session ->
                items.add(session)
                session.scans.forEach { batch ->
                    batch.image.forEach { img ->
                        items.add(img)
                    }
                }
            }
        }

        override fun getItemViewType(position: Int): Int {
            return if (items[position] is ScanSessionData) 0 else 1
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
            return if (viewType == 0) {
                val view = LayoutInflater.from(parent.context).inflate(android.R.layout.simple_list_item_1, parent, false)
                SessionHeaderViewHolder(view)
            } else {
                val view = LayoutInflater.from(parent.context).inflate(R.layout.item_scan_leaf, parent, false)
                LeafViewHolder(view)
            }
        }

        override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
            if (holder is SessionHeaderViewHolder) {
                val session = items[position] as ScanSessionData
                val plantType = determinePlantType(session)
                holder.textView.text = "Title: $plantType"
                holder.textView.textSize = 24f
                holder.textView.setPadding(32, 32, 32, 16)
            } else if (holder is LeafViewHolder) {
                val img = items[position] as ScanImage
                val session = findSessionForImage(position)
                val plantType = determinePlantType(session)
                
                val bestLabel = img.classification_results.classifications
                    .filter { it.label.contains(plantType, ignoreCase = true) }
                    .maxByOrNull { it.score }?.label ?: img.classification_results.classifications.maxByOrNull { it.score }?.label ?: "Unknown"

                holder.tvLabel.text = bestLabel
                holder.tvScore.text = "Confidence: ${String.format("%.2f%%", (img.classification_results.classifications.find { it.label == bestLabel }?.score ?: 0.0) * 100)}"
                
                try {
                    val imageBytes = Base64.decode(img.mask, Base64.DEFAULT)
                    val decodedImage = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                    holder.ivMask.setImageBitmap(decodedImage)
                } catch (e: Exception) {
                    holder.ivMask.setImageResource(android.R.drawable.ic_menu_report_image)
                }
            }
        }

        override fun getItemCount(): Int = items.size

        private fun findSessionForImage(position: Int): ScanSessionData {
            for (i in position downTo 0) {
                if (items[i] is ScanSessionData) return items[i] as ScanSessionData
            }
            return sessions[0]
        }

        private fun determinePlantType(session: ScanSessionData): String {
            val typeScores = mutableMapOf<String, Double>()
            session.scans.forEach { batch ->
                batch.image.forEach { img ->
                    img.classification_results.classifications.forEach { cls ->
                        val type = getPlantTypeFromLabel(cls.label)
                        typeScores[type] = typeScores.getOrDefault(type, 0.0) + cls.score
                    }
                }
            }
            return typeScores.maxByOrNull { it.value }?.key ?: "Unknown"
        }

        private fun getPlantTypeFromLabel(label: String): String {
            return when {
                label.contains("Apple", true) -> "Apple"
                label.contains("Bell Pepper", true) -> "Bell Pepper"
                label.contains("Blueberry", true) -> "Blueberry"
                label.contains("Cherry", true) -> "Cherry"
                label.contains("Corn", true) || label.contains("Maize", true) -> "Corn (Maize)"
                label.contains("Grape", true) -> "Grape"
                label.contains("Orange", true) -> "Orange"
                label.contains("Peach", true) -> "Peach"
                label.contains("Potato", true) -> "Potato"
                label.contains("Raspberry", true) -> "Raspberry"
                label.contains("Soybean", true) -> "Soybean"
                label.contains("Squash", true) -> "Squash"
                label.contains("Strawberry", true) -> "Strawberry"
                label.contains("Tomato", true) -> "Tomato"
                else -> "Unknown"
            }
        }

        class SessionHeaderViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val textView: TextView = view.findViewById(android.R.id.text1)
        }

        class LeafViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val tvLabel: TextView = view.findViewById(R.id.tvLeafLabel)
            val ivMask: ImageView = view.findViewById(R.id.ivLeafMask)
            val tvScore: TextView = view.findViewById(R.id.tvLeafScore)
        }
    }
}
