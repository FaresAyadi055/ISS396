# YOLO11 NCNN Android Interface Documentation

This document explains how to interface with the C++ native logic of the `ncnn-android-yolo11` project from Kotlin/Java.

## 1. The JNI Bridge Class

The primary interface is the `YOLO11Ncnn` class. You should keep a single instance of this class in your Activity or ViewModel.

```kotlin
val yolo11ncnn = YOLO11Ncnn()
```

## 2. API Reference

### `loadModel(mgr: AssetManager, taskid: Int, modelid: Int, cpugpu: Int): Boolean`
Loads the NCNN model from the assets folder.

- **`taskid`**:
    - `0`: Detection
    - `1`: **Segmentation** (Customized for "leaf" class)
    - `2`: Pose
    - `3`: Classification
    - `4`: OBB
- **`modelid`**: Controls the resolution and model complexity.
    - `0, 1, 2`: Tier 1 (**320x320**) - n, s, m
    - `3, 4, 5`: Tier 2 (**480x480**) - n, s, m
    - `6, 7, 8`: Tier 3 (**640x640**) - n, s, m
- **`cpugpu`**:
    - `0`: CPU
    - `1`: GPU (Vulkan)
    - `2`: Turnip (Vulkan)
    - *Note: Segmentation is currently optimized to run on CPU for stability.*

### `openCamera(facing: Int): Boolean`
Starts the high-performance NDK camera.
- **`facing`**: `0` for Back camera, `1` for Front camera.

### `closeCamera(): Boolean`
Stops the camera and releases resources. Must be called in `onPause()`.

### `setOutputWindow(surface: Surface?): Boolean`
Links the native renderer to an Android `Surface`.
- This is typically called from the `surfaceChanged` callback of a `SurfaceView`.

---

## 3. Recommended Lifecycle Integration (Kotlin)

```kotlin
class CameraActivity : AppCompatActivity(), SurfaceHolder.Callback {
    private val yolo11ncnn = YOLO11Ncnn()
    private var facing = 0 // Back camera

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // ... layout setup ...
        
        val cameraView = findViewById<SurfaceView>(R.id.cameraview)
        cameraView.holder.addCallback(this)
        
        // Initial model load
        reloadModel()
    }

    private fun reloadModel() {
        // Example: Segmentation, Tier 1 (320x320), CPU
        yolo11ncnn.loadModel(assets, 1, 0, 0)
    }

    override fun onResume() {
        super.onResume()
        yolo11ncnn.openCamera(facing)
    }

    override fun onPause() {
        super.onPause()
        yolo11ncnn.closeCamera()
    }

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, w: Int, h: Int) {
        yolo11ncnn.setOutputWindow(holder.surface)
    }
    
    // ... other surface callbacks ...
}
```

---

## 4. Native Implementation Details (For reference)

- **Object Count**: In Segmentation mode (`taskid == 1`), the C++ logic calculates the number of detected "leaf" objects and draws it next to the FPS in the top-right corner.
- **Resolution Filter**: The model uses Tier-based resolution (320, 480, 640). Using Tier 1 (320) is recommended for your "leaf" model to minimize false positives.
- **Coordinate System**: The native layer handles "letterbox" padding and scaling automatically. It transforms detection coordinates back to the original camera frame size before rendering.
- **Memory Management**: The `YOLO11* g_yolo11` pointer in `yolo11ncnn.cpp` is protected by a `ncnn::Mutex` to prevent race conditions during model reloading or camera frame processing.

## 5. Assets Requirement
Ensure the following files (or your custom versions) exist in `app/src/main/assets`:
- `yolo11n_seg.ncnn.param`
- `yolo11n_seg.ncnn.bin`
- (And other models if you plan to support non-segmentation tasks)
