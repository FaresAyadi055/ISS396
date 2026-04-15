package com.tencent.yolo11ncnn

import android.content.res.AssetManager
import android.graphics.Bitmap
import android.view.Surface

class YOLO11Ncnn {
    external fun loadModel(mgr: AssetManager, taskid: Int, modelid: Int, cpugpu: Int): Boolean
    external fun openCamera(facing: Int): Boolean
    external fun closeCamera(): Boolean
    external fun setOutputWindow(surface: Surface?): Boolean
    external fun toggleFlash(enable: Boolean): Boolean
    external fun getDetectedMasks(): Array<Bitmap>?
    external fun getLastFrame(): Bitmap?
    external fun getCleanFrame(): Bitmap?
    external fun captureStill(): Boolean
    external fun isStillCaptured(): Boolean

    companion object {
        init {
            System.loadLibrary("yolo11ncnn")
        }
    }
}
