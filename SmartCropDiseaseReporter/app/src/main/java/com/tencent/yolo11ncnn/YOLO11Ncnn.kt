package com.tencent.yolo11ncnn

import android.content.res.AssetManager
import android.view.Surface

class YOLO11Ncnn {
    external fun loadModel(mgr: AssetManager, taskid: Int, modelid: Int, cpugpu: Int): Boolean
    external fun openCamera(facing: Int): Boolean
    external fun closeCamera(): Boolean
    external fun setOutputWindow(surface: Surface?): Boolean

    companion object {
        init {
            System.loadLibrary("yolo11ncnn")
        }
    }
}
