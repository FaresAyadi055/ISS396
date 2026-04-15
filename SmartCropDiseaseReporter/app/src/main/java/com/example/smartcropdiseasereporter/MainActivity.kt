package com.example.smartcropdiseasereporter

import android.Manifest
import android.content.pm.PackageManager
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
import com.tencent.yolo11ncnn.YOLO11Ncnn

class MainActivity : AppCompatActivity(), SurfaceHolder.Callback {

    private val yolo11ncnn = YOLO11Ncnn()
    private var facing = 1 // Default to Back camera

    private lateinit var btnSettings: ImageButton
    private lateinit var btnAnalyze: Button

    private var currentModelId = 3 // Default to n-480
    private var currentCpuGpu = 1 // Default to GPU

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val cameraView = findViewById<SurfaceView>(R.id.cameraview)
        cameraView.holder.addCallback(this)

        btnSettings = findViewById(R.id.btnSettings)
        btnAnalyze = findViewById(R.id.btnAnalyze)

        btnSettings.setOnClickListener {
            showSettingsDialog()
        }

        btnAnalyze.setOnClickListener {
            // Basic analyze logic for MainActivity if needed, 
            // though CameraActivity handles the full flow.
            Toast.makeText(this, "Analysis started...", Toast.LENGTH_SHORT).show()
        }
        
        reloadModel()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 100)
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

    private fun reloadModel() {
        val ret = yolo11ncnn.loadModel(assets, 1, currentModelId, currentCpuGpu)
        Log.d("MainActivity", "loadModel: $ret")
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
