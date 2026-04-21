package com.example.smartcropdiseasereporter

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Bundle
import android.util.Log
import android.view.SurfaceHolder
import android.view.SurfaceView
import android.view.View
import android.view.WindowManager
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.example.smartcropdiseasereporter.data.LoginDataSource
import com.example.smartcropdiseasereporter.data.LoginRepository
import com.example.smartcropdiseasereporter.util.SettingsManager
import com.tencent.yolo11ncnn.YOLO11Ncnn
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class CameraActivity : AppCompatActivity(), SurfaceHolder.Callback {

    private val yolo11ncnn = YOLO11Ncnn()
    private var facing = 1 // Default to Back camera
    private val sessionId = UUID.randomUUID().toString()

    private lateinit var btnAnalyze: Button
    private lateinit var btnBack: ImageButton
    private lateinit var btnSettings: ImageButton
    private lateinit var btnGallery: ImageButton
    private lateinit var controlPanel: LinearLayout
    private lateinit var resultPanel: LinearLayout
    private lateinit var btnContinue: Button
    private lateinit var btnFinish: Button
    private lateinit var btnViewScan: Button
    private lateinit var loadingProgress: ProgressBar
    private lateinit var loadingLayout: LinearLayout
    private lateinit var btnCancel: Button

    private var analysisJob: kotlinx.coroutines.Job? = null

    private lateinit var settingsManager: SettingsManager
    private lateinit var loginRepository: LoginRepository
    private var currentModelId = 3 // Default to n-480
    private var currentCpuGpu = 1 // Default to GPU

    private val pickImageLauncher = registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.GetContent()) { uri ->
        uri?.let {
            val bitmap = android.graphics.BitmapFactory.decodeStream(contentResolver.openInputStream(it))
            if (bitmap != null) {
                analyzeGalleryImage(bitmap)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        settingsManager = SettingsManager(this)
        loginRepository = LoginRepository.getInstance(LoginDataSource(settingsManager))

        val cameraView = findViewById<SurfaceView>(R.id.cameraview)
        cameraView.holder.addCallback(this)

        btnAnalyze = findViewById(R.id.btnAnalyze)
        btnBack = findViewById(R.id.btnBack)
        btnSettings = findViewById(R.id.btnSettings)
        btnGallery = findViewById(R.id.btnGallery)
        controlPanel = findViewById(R.id.controlPanel)
        resultPanel = findViewById(R.id.resultPanel)
        btnContinue = findViewById(R.id.btnContinue)
        btnFinish = findViewById(R.id.btnFinish)
        btnViewScan = findViewById(R.id.btnViewScan)
        loadingProgress = findViewById(R.id.loadingProgress)
        loadingLayout = findViewById(R.id.loadingLayout)
        btnCancel = findViewById(R.id.btnCancel)

        setupButtons()
        
        reloadModel()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 100)
        }
        
        if (loginRepository.user == null) {
            Toast.makeText(this, "Offline Mode: Analysis unavailable", Toast.LENGTH_LONG).show()
        }
    }

    private fun setupButtons() {
        btnAnalyze.setOnClickListener {
            if (loginRepository.user == null) {
                Toast.makeText(this, "Please login to analyze and upload scans", Toast.LENGTH_SHORT).show()
            } else {
                analyzeFrame()
            }
        }

        btnBack.setOnClickListener {
            onBackPressed()
        }

        btnSettings.setOnClickListener {
            showSettingsDialog()
        }

        btnGallery.setOnClickListener {
            if (loginRepository.user == null) {
                Toast.makeText(this, "Please login to analyze and upload scans", Toast.LENGTH_SHORT).show()
            } else {
                pickImageLauncher.launch("image/*")
            }
        }

        btnContinue.setOnClickListener {
            resultPanel.visibility = View.GONE
            controlPanel.visibility = View.VISIBLE
        }

        btnFinish.setOnClickListener {
            finish()
        }

        btnViewScan.setOnClickListener {
            val intent = Intent(this, ScansActivity::class.java)
            intent.putExtra("SESSION_ID", sessionId)
            startActivity(intent)
        }

        btnCancel.setOnClickListener {
            analysisJob?.cancel()
            loadingLayout.visibility = View.GONE
            controlPanel.visibility = View.VISIBLE
            Toast.makeText(this, "Analysis cancelled", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showSettingsDialog() {
        val dialogView = layoutInflater.inflate(R.layout.dialog_camera_settings, null)
        val spinnerRes = dialogView.findViewById<Spinner>(R.id.spinnerDialogResolution)
        val spinnerProc = dialogView.findViewById<Spinner>(R.id.spinnerDialogProcessor)

        val resolutions = arrayOf("n-320", "n-480", "n-640")
        val resAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, resolutions)
        resAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerRes.adapter = resAdapter
        
        val initialResPos = when (currentModelId) {
            0 -> 0
            3 -> 1
            6 -> 2
            else -> 0
        }
        spinnerRes.setSelection(initialResPos)

        val processors = arrayOf("CPU", "GPU", "Turnip")
        val procAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, processors)
        procAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerProc.adapter = procAdapter
        spinnerProc.setSelection(currentCpuGpu)

        AlertDialog.Builder(this)
            .setTitle("Model Settings")
            .setView(dialogView)
            .setPositiveButton("Apply") { _, _ ->
                currentModelId = when (spinnerRes.selectedItemPosition) {
                    0 -> 0 // n-320
                    1 -> 3 // n-480
                    2 -> 6 // n-640
                    else -> 0
                }
                currentCpuGpu = spinnerProc.selectedItemPosition
                reloadModel()
                Toast.makeText(this, "Settings applied", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun analyzeGalleryImage(bitmap: Bitmap) {
        analysisJob = lifecycleScope.launch {
            loadingLayout.visibility = View.VISIBLE
            controlPanel.visibility = View.GONE
            
            withContext(Dispatchers.Default) {
                yolo11ncnn.processBitmap(bitmap)
            }
            
            performAnalysisFlow()
        }
    }

    private fun analyzeFrame() {
        analysisJob = lifecycleScope.launch {
            loadingLayout.visibility = View.VISIBLE
            controlPanel.visibility = View.GONE

            yolo11ncnn.captureStill()
            
            var timeout = 0
            while (!yolo11ncnn.isStillCaptured() && timeout < 50) { 
                delay(50)
                timeout++
            }
            
            performAnalysisFlow()
        }
    }

    private suspend fun performAnalysisFlow() {
        val user = loginRepository.user ?: return

        val maskedBitmap = yolo11ncnn.getLastFrame() 
        val cleanBitmap = yolo11ncnn.getCleanFrame() 
        val masks = yolo11ncnn.getDetectedMasks() 
        
        if (masks == null || masks.isEmpty()) {
            loadingLayout.visibility = View.GONE
            controlPanel.visibility = View.VISIBLE
            Toast.makeText(this@CameraActivity, "No leaves detected", Toast.LENGTH_SHORT).show()
            return
        }

        if (maskedBitmap == null || cleanBitmap == null) {
            loadingLayout.visibility = View.GONE
            controlPanel.visibility = View.VISIBLE
            Toast.makeText(this@CameraActivity, "Capture failed", Toast.LENGTH_SHORT).show()
            return
        }

        val backendUrl = settingsManager.getBackendUrl()
        if (backendUrl.isBlank()) {
            loadingLayout.visibility = View.GONE
            controlPanel.visibility = View.VISIBLE
            Toast.makeText(this@CameraActivity, "URL not configured", Toast.LENGTH_SHORT).show()
            return
        }

        try {
            val request = withContext(Dispatchers.IO) {
                val builder = MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("sessionId", sessionId)
                    .addFormDataPart("location", "[10.1815, 36.8065]")
                    .addFormDataPart("date", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date()))

                val maskedStream = ByteArrayOutputStream()
                maskedBitmap.compress(Bitmap.CompressFormat.JPEG, 70, maskedStream)
                builder.addFormDataPart("original_image_masked", "masked.jpg", 
                    maskedStream.toByteArray().toRequestBody("image/jpeg".toMediaTypeOrNull()))

                val cleanStream = ByteArrayOutputStream()
                cleanBitmap.compress(Bitmap.CompressFormat.JPEG, 70, cleanStream)
                builder.addFormDataPart("original_image_clean", "clean.jpg", 
                    cleanStream.toByteArray().toRequestBody("image/jpeg".toMediaTypeOrNull()))

                masks.forEachIndexed { index, bitmap ->
                    val stream = ByteArrayOutputStream()
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 80, stream)
                    builder.addFormDataPart("masks", "mask_$index.jpg", 
                        stream.toByteArray().toRequestBody("image/jpeg".toMediaTypeOrNull()))
                }

                val uploadUrl = if (backendUrl.endsWith("/")) "${backendUrl}api/scans" else "$backendUrl/api/scans"
                
                Request.Builder()
                    .url(uploadUrl)
                    .addHeader("Authorization", "Bearer ${user.token}")
                    .post(builder.build())
                    .build()
            }

            val client = OkHttpClient.Builder()
                .connectTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(180, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .build()

            client.newCall(request).enqueue(object : okhttp3.Callback {
                override fun onFailure(call: okhttp3.Call, e: java.io.IOException) {
                    runOnUiThread {
                        loadingLayout.visibility = View.GONE
                        controlPanel.visibility = View.VISIBLE
                        Toast.makeText(this@CameraActivity, "Upload Failed: No connection", Toast.LENGTH_LONG).show()
                    }
                }

                override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                    runOnUiThread {
                        loadingLayout.visibility = View.GONE
                        if (response.isSuccessful) {
                            Toast.makeText(this@CameraActivity, "Success!", Toast.LENGTH_SHORT).show()
                            resultPanel.visibility = View.VISIBLE
                        } else {
                            Toast.makeText(this@CameraActivity, "Server error", Toast.LENGTH_SHORT).show()
                            controlPanel.visibility = View.VISIBLE
                        }
                    }
                }
            })
        } catch (e: Exception) {
            loadingLayout.visibility = View.GONE
            controlPanel.visibility = View.VISIBLE
            Toast.makeText(this@CameraActivity, "Preparation failed", Toast.LENGTH_SHORT).show()
        }
    }

    private fun reloadModel() {
        val ret = yolo11ncnn.loadModel(assets, 1, currentModelId, currentCpuGpu)
        Log.d("CameraActivity", "loadModel: $ret")
    }

    override fun onResume() {
        super.onResume()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED) {
            yolo11ncnn.openCamera(facing)
        }
    }

    override fun onPause() {
        super.onPause()
        yolo11ncnn.closeCamera()
    }

    override fun surfaceCreated(holder: SurfaceHolder) {}

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
        yolo11ncnn.setOutputWindow(holder.surface)
    }

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        yolo11ncnn.setOutputWindow(null)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 100 && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            yolo11ncnn.openCamera(facing)
        }
    }
}
