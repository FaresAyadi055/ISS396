package com.example.smartcropdiseasereporter

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

class MainMenuActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main_menu)

        findViewById<Button>(R.id.btn_open_camera).setOnClickListener {
            startActivity(Intent(this, CameraActivity::class.java))
        }
    }
}
