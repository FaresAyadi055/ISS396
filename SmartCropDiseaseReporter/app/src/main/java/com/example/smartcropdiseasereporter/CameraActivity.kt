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
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.example.smartcropdiseasereporter.data.LoginDataSource
import com.example.smartcropdiseasereporter.data.LoginRepository
import com.example.smartcropdiseasereporter.util.SettingsManager
import com.tencent.yolo11ncnn.YOLO11Ncnn
import kotlinx.coroutines.Dispatchers
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
    private var isFlashOn = false
    private val sessionId = UUID.randomUUID().toString()

    private lateinit var spinnerResolution: Spinner
    private lateinit var spinnerProcessor: Spinner
    private lateinit var btnAnalyze: Button
    private lateinit var btnBack: ImageButton
    private lateinit var btnFlash: ImageButton
    private lateinit var controlPanel: LinearLayout
    private lateinit var resultPanel: LinearLayout
    private lateinit var btnContinue: Button
    private lateinit var btnFinish: Button
    private lateinit var btnViewScan: Button
    private lateinit var loadingProgress: ProgressBar

    private lateinit var settingsManager: SettingsManager
    private lateinit var loginRepository: LoginRepository
    private var currentModelId = 0 // n-320
    private var currentCpuGpu = 0 // CPU

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        settingsManager = SettingsManager(this)
        loginRepository = LoginRepository.getInstance(LoginDataSource(settingsManager))

        if (loginRepository.user == null) {
            Toast.makeText(this, "Session expired, please login again", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        val cameraView = findViewById<SurfaceView>(R.id.cameraview)
        cameraView.holder.addCallback(this)

        spinnerResolution = findViewById(R.id.spinnerResolution)
        spinnerProcessor = findViewById(R.id.spinnerProcessor)
        btnAnalyze = findViewById(R.id.btnAnalyze)
        btnBack = findViewById(R.id.btnBack)
        btnFlash = findViewById(R.id.btnFlash)
        controlPanel = findViewById(R.id.controlPanel)
        resultPanel = findViewById(R.id.resultPanel)
        btnContinue = findViewById(R.id.btnContinue)
        btnFinish = findViewById(R.id.btnFinish)
        btnViewScan = findViewById(R.id.btnViewScan)
        loadingProgress = findViewById(R.id.loadingProgress)

        setupSpinners()
        setupButtons()
        
        reloadModel()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 100)
        }
    }

    private fun setupButtons() {
        btnAnalyze.setOnClickListener {
            analyzeFrame()
        }

        btnBack.setOnClickListener {
            onBackPressed()
        }

        btnFlash.setOnClickListener {
            isFlashOn = !isFlashOn
            yolo11ncnn.toggleFlash(isFlashOn)
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
    }

    private fun analyzeFrame() {
        val user = loginRepository.user ?: return

        val maskedBitmap = yolo11ncnn.getLastFrame()
        val cleanBitmap = yolo11ncnn.getCleanFrame()
        val masks = yolo11ncnn.getDetectedMasks()
        
        if (masks == null || masks.isEmpty()) {
            Toast.makeText(this, "No leaves detected to analyze", Toast.LENGTH_SHORT).show()
            return
        }

        if (maskedBitmap == null || cleanBitmap == null) {
            Toast.makeText(this, "Could not capture frames", Toast.LENGTH_SHORT).show()
            return
        }

        val backendUrl = settingsManager.getBackendUrl()
        if (backendUrl.isBlank()) {
            Toast.makeText(this, "Backend URL not configured", Toast.LENGTH_SHORT).show()
            return
        }

        loadingProgress.visibility = View.VISIBLE
        controlPanel.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val request = withContext(Dispatchers.IO) {
                    val builder = MultipartBody.Builder()
                        .setType(MultipartBody.FORM)
                        .addFormDataPart("sessionId", sessionId)
                        .addFormDataPart("location", "[10.1815, 36.8065]")
                        .addFormDataPart("date", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date()))

                    // Original Masked Image
                    val maskedStream = ByteArrayOutputStream()
                    maskedBitmap.compress(Bitmap.CompressFormat.JPEG, 70, maskedStream)
                    builder.addFormDataPart("original_image_masked", "masked.jpg", 
                        maskedStream.toByteArray().toRequestBody("image/jpeg".toMediaTypeOrNull()))

                    // Original Clean Image
                    val cleanStream = ByteArrayOutputStream()
                    cleanBitmap.compress(Bitmap.CompressFormat.JPEG, 70, cleanStream)
                    builder.addFormDataPart("original_image_clean", "clean.jpg", 
                        cleanStream.toByteArray().toRequestBody("image/jpeg".toMediaTypeOrNull()))

                    // Individual Masks
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
                            loadingProgress.visibility = View.GONE
                            controlPanel.visibility = View.VISIBLE
                            Log.e("CameraActivity", "Upload error: ${e.message}", e)
                            Toast.makeText(this@CameraActivity, "Upload Failed: ${e.message}", Toast.LENGTH_LONG).show()
                        }
                    }

                    override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                        val responseBody = response.body?.string()
                        runOnUiThread {
                            loadingProgress.visibility = View.GONE
                            if (response.isSuccessful) {
                                Toast.makeText(this@CameraActivity, "Analysis successful!", Toast.LENGTH_SHORT).show()
                                resultPanel.visibility = View.VISIBLE
                            } else {
                                Log.e("CameraActivity", "Upload failed (${response.code}): $responseBody")
                                Toast.makeText(this@CameraActivity, "Server error: ${response.code}", Toast.LENGTH_SHORT).show()
                                controlPanel.visibility = View.VISIBLE
                            }
                        }
                    }
                })
            } catch (e: Exception) {
                loadingProgress.visibility = View.GONE
                controlPanel.visibility = View.VISIBLE
                Log.e("CameraActivity", "Failed to prepare upload: ${e.message}", e)
                Toast.makeText(this@CameraActivity, "Preparation failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun setupSpinners() {
        val resolutions = arrayOf("n-320", "n-480", "n-640")
        val resolutionAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, resolutions)
        resolutionAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerResolution.adapter = resolutionAdapter
        spinnerResolution.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                currentModelId = when (position) {
                    0 -> 0 // n-320
                    1 -> 3 // n-480
                    2 -> 6 // n-640
                    else -> 0
                }
                reloadModel()
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        val processors = arrayOf("CPU", "GPU", "Turnip")
        val processorAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, processors)
        processorAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerProcessor.adapter = processorAdapter
        spinnerProcessor.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                currentCpuGpu = position
                reloadModel()
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
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
            val ret = yolo11ncnn.openCamera(facing)
            Log.d("CameraActivity", "openCamera: $ret")
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
