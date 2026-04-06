package com.example.smartcropdiseasereporter

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.view.SurfaceHolder
import android.view.SurfaceView
import android.view.View
import android.view.WindowManager
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Spinner
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.tencent.yolo11ncnn.YOLO11Ncnn

class CameraActivity : AppCompatActivity(), SurfaceHolder.Callback {

    private val yolo11ncnn = YOLO11Ncnn()
    private var facing = 1 // Default to Back camera (0=front, 1=back in this NDK implementation)

    private lateinit var spinnerResolution: Spinner
    private lateinit var spinnerProcessor: Spinner

    private var currentModelId = 0 // n-320
    private var currentCpuGpu = 0 // CPU

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val cameraView = findViewById<SurfaceView>(R.id.cameraview)
        cameraView.holder.addCallback(this)

        spinnerResolution = findViewById(R.id.spinnerResolution)
        spinnerProcessor = findViewById(R.id.spinnerProcessor)

        setupSpinners()
        
        // Initial model load
        reloadModel()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 100)
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
        // taskid = 1 for Segmentation
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
