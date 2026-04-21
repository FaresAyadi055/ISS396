// Tencent is pleased to support the open source community by making ncnn available.
//
// Copyright (C) 2025 THL A29 Limited, a Tencent company. All rights reserved.
//
// Licensed under the BSD 3-Clause License (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
//
// https://opensource.org/licenses/BSD-3-Clause
//
// Unless required by applicable law or agreed to in writing, software distributed
// under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
// CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.

#include <android/asset_manager_jni.h>
#include <android/native_window_jni.h>
#include <android/native_window.h>
#include <android/bitmap.h>
#include <android/log.h>

#include <jni.h>

#include <string>
#include <vector>

#include <platform.h>
#include <benchmark.h>

#include "yolo11.h"

#include "ndkcamera.h"

#include <opencv2/core/core.hpp>
#include <opencv2/imgproc/imgproc.hpp>

#if __ARM_NEON
#include <arm_neon.h>
#endif // __ARM_NEON

// Workaround for undefined symbol: __kmpc_dispatch_deinit
extern "C" {
    void __kmpc_dispatch_deinit(void* loc, jint gtid) {
        // dummy
    }
}

static int draw_unsupported(cv::Mat& rgb)
{
    const char text[] = "unsupported";

    int baseLine = 0;
    cv::Size label_size = cv::getTextSize(text, cv::FONT_HERSHEY_SIMPLEX, 1.0, 1, &baseLine);

    int y = (rgb.rows - label_size.height) / 2;
    int x = (rgb.cols - label_size.width) / 2;

    cv::rectangle(rgb, cv::Rect(cv::Point(x, y), cv::Size(label_size.width, label_size.height + baseLine)),
                    cv::Scalar(255, 255, 255), -1);

    cv::putText(rgb, text, cv::Point(x, y + label_size.height),
                cv::FONT_HERSHEY_SIMPLEX, 1.0, cv::Scalar(0, 0, 0));

    return 0;
}

static int draw_fps(cv::Mat& rgb, int obj_count = -1)
{
    // resolve moving average
    float avg_fps = 0.f;
    {
        static double t0 = 0.f;
        static float fps_history[10] = {0.f};

        double t1 = ncnn::get_current_time();
        if (t0 == 0.f)
        {
            t0 = t1;
            return 0;
        }

        float fps = 1000.f / (t1 - t0);
        t0 = t1;

        for (int i = 9; i >= 1; i--)
        {
            fps_history[i] = fps_history[i - 1];
        }
        fps_history[0] = fps;

        if (fps_history[9] == 0.f)
        {
            return 0;
        }

        for (int i = 0; i < 10; i++)
        {
            avg_fps += fps_history[i];
        }
        avg_fps /= 10.f;
    }

    char text[64];
    if (obj_count >= 0)
    {
        sprintf(text, "FPS=%.2f COUNT=%d", avg_fps, obj_count);
    }
    else
    {
        sprintf(text, "FPS=%.2f", avg_fps);
    }

    int baseLine = 0;
    cv::Size label_size = cv::getTextSize(text, cv::FONT_HERSHEY_SIMPLEX, 0.5, 1, &baseLine);

    int y = 0;
    int x = rgb.cols - label_size.width;

    cv::rectangle(rgb, cv::Rect(cv::Point(x, y), cv::Size(label_size.width, label_size.height + baseLine)),
                    cv::Scalar(255, 255, 255), -1);

    cv::putText(rgb, text, cv::Point(x, y + label_size.height),
                cv::FONT_HERSHEY_SIMPLEX, 0.5, cv::Scalar(0, 0, 0));

    return 0;
}

static YOLO11* g_yolo11 = 0;
static ncnn::Mutex lock;
static cv::Mat g_last_frame;
static cv::Mat g_last_frame_clean;
static std::vector<Object> g_last_objects;

// Still capture globals
static cv::Mat g_still_frame;
static std::vector<Object> g_still_objects;
static ncnn::Mutex still_lock;
static bool g_still_captured = false;

class MyNdkCamera : public NdkCameraWindow
{
public:
    virtual void on_image_render(cv::Mat& rgb) const;
    virtual void on_still_image(const cv::Mat& nv21) const;
};

void MyNdkCamera::on_image_render(cv::Mat& rgb) const
{
    int obj_count = -1;
    // yolo11
    {
        ncnn::MutexLockGuard g(lock);

        if (g_yolo11)
        {
            std::vector<Object> objects;
            g_yolo11->detect(rgb, objects);

            g_last_frame_clean = rgb.clone();

            g_yolo11->draw(rgb, objects);

            g_last_frame = rgb.clone();
            g_last_objects = objects;

            obj_count = (int)objects.size();
        }
        else
        {
            draw_unsupported(rgb);
        }
    }

    draw_fps(rgb, obj_count);
}

void MyNdkCamera::on_still_image(const cv::Mat& nv21_mat) const
{
    __android_log_print(ANDROID_LOG_DEBUG, "ncnn", "on_still_image %d x %d", nv21_mat.cols, nv21_mat.rows);

    int width = nv21_mat.cols;
    int height = nv21_mat.rows * 2 / 3;

    // Rotate high-res NV21 to match preview orientation
    int w = 0, h = 0, rotate_type = 0;
    if (camera_orientation == 0) { w = width; h = height; rotate_type = camera_facing == 0 ? 2 : 1; }
    if (camera_orientation == 90) { w = height; h = width; rotate_type = camera_facing == 0 ? 5 : 6; }
    if (camera_orientation == 180) { w = width; h = height; rotate_type = camera_facing == 0 ? 4 : 3; }
    if (camera_orientation == 270) { w = height; h = width; rotate_type = camera_facing == 0 ? 7 : 8; }

    cv::Mat nv21_rotated(h + h / 2, w, CV_8UC1);
    ncnn::kanna_rotate_yuv420sp(nv21_mat.data, width, height, nv21_rotated.data, w, h, rotate_type);

    cv::Mat rgb(h, w, CV_8UC3);
    ncnn::yuv420sp2rgb(nv21_rotated.data, w, h, rgb.data);

    {
        ncnn::MutexLockGuard g(still_lock);
        g_still_frame = rgb.clone();

        // Run detection on the high-res frame
        ncnn::MutexLockGuard g_model(lock);
        if (g_yolo11)
        {
            g_yolo11->detect(g_still_frame, g_still_objects);
        }
        g_still_captured = true;
    }
}

static MyNdkCamera* g_camera = 0;

extern "C" {

JNIEXPORT jint JNI_OnLoad(JavaVM* vm, void* reserved)
{
    __android_log_print(ANDROID_LOG_DEBUG, "ncnn", "JNI_OnLoad");

    g_camera = new MyNdkCamera;

    ncnn::create_gpu_instance();

    return JNI_VERSION_1_4;
}

JNIEXPORT void JNI_OnUnload(JavaVM* vm, void* reserved)
{
    __android_log_print(ANDROID_LOG_DEBUG, "ncnn", "JNI_OnUnload");

    {
        ncnn::MutexLockGuard g(lock);

        delete g_yolo11;
        g_yolo11 = 0;
    }

    ncnn::destroy_gpu_instance();

    delete g_camera;
    g_camera = 0;
}

// public native boolean loadModel(AssetManager mgr, int taskid, int modelid, int cpugpu);
JNIEXPORT jboolean JNICALL Java_com_tencent_yolo11ncnn_YOLO11Ncnn_loadModel(JNIEnv* env, jobject thiz, jobject assetManager, jint taskid, jint modelid, jint cpugpu)
{
    AAssetManager* mgr = AAssetManager_fromJava(env, assetManager);

    __android_log_print(ANDROID_LOG_DEBUG, "ncnn", "loadModel %p", mgr);

    const char* modeltypes[9] =
    {
        "n", "s", "m",
        "n", "s", "m",
        "n", "s", "m"
    };

    // Simplified to only use 'n' models and '_seg' task
    std::string parampath = std::string("yolo11") + modeltypes[(int)modelid] + "_seg.ncnn.param";
    std::string modelpath = std::string("yolo11") + modeltypes[(int)modelid] + "_seg.ncnn.bin";

    bool use_gpu = (int)cpugpu == 1;
    bool use_turnip = (int)cpugpu == 2;

    // Segmentation: Vulkan disabled for correct masks/boxes on CPU
    bool net_use_vulkan = false;
    __android_log_print(ANDROID_LOG_WARN, "ncnn", "YOLO11_seg: inference on CPU only");

    // reload
    {
        ncnn::MutexLockGuard g(lock);

        {
            static int old_modelid = -1;
            static int old_cpugpu = -1;
            if (modelid != old_modelid || cpugpu != old_cpugpu)
            {
                delete g_yolo11;
                g_yolo11 = 0;
            }
            old_modelid = modelid;
            old_cpugpu = cpugpu;

            ncnn::destroy_gpu_instance();

            if (use_turnip)
            {
                ncnn::create_gpu_instance("libvulkan_freedreno.so");
            }
            else if (use_gpu)
            {
                ncnn::create_gpu_instance();
            }

            if (!g_yolo11)
            {
                g_yolo11 = new YOLO11_seg;
                g_yolo11->load(mgr, parampath.c_str(), modelpath.c_str(), net_use_vulkan);
            }

            int target_size = 640;
            if ((int)modelid >= 0 && (int)modelid <= 2) target_size = 320;
            else if ((int)modelid >= 3 && (int)modelid <= 5) target_size = 480;

            g_yolo11->set_det_target_size(target_size);
        }
    }

    return JNI_TRUE;
}

// public native boolean openCamera(int facing);
JNIEXPORT jboolean JNICALL Java_com_tencent_yolo11ncnn_YOLO11Ncnn_openCamera(JNIEnv* env, jobject thiz, jint facing)
{
    if (facing < 0 || facing > 1)
        return JNI_FALSE;

    __android_log_print(ANDROID_LOG_DEBUG, "ncnn", "openCamera %d", facing);

    int ret = g_camera->open((int)facing);

    return ret == 0 ? JNI_TRUE : JNI_FALSE;
}

// public native boolean closeCamera();
JNIEXPORT jboolean JNICALL Java_com_tencent_yolo11ncnn_YOLO11Ncnn_closeCamera(JNIEnv* env, jobject thiz)
{
    __android_log_print(ANDROID_LOG_DEBUG, "ncnn", "closeCamera");

    g_camera->close();

    return JNI_TRUE;
}

// public native boolean setOutputWindow(Surface surface);
JNIEXPORT jboolean JNICALL Java_com_tencent_yolo11ncnn_YOLO11Ncnn_setOutputWindow(JNIEnv* env, jobject thiz, jobject surface)
{
    ANativeWindow* win = 0;
    if (surface)
    {
        win = ANativeWindow_fromSurface(env, surface);
    }

    __android_log_print(ANDROID_LOG_DEBUG, "ncnn", "setOutputWindow %p", win);

    g_camera->set_window(win);

    return JNI_TRUE;
}

JNIEXPORT jboolean JNICALL Java_com_tencent_yolo11ncnn_YOLO11Ncnn_toggleFlash(JNIEnv* env, jobject thiz, jboolean enable)
{
    return JNI_FALSE;
}

JNIEXPORT jboolean JNICALL Java_com_tencent_yolo11ncnn_YOLO11Ncnn_captureStill(JNIEnv* env, jobject thiz)
{
    {
        ncnn::MutexLockGuard g(still_lock);
        g_still_captured = false;
        g_still_objects.clear();
        g_still_frame.release();
    }
    g_camera->capture_still();
    return JNI_TRUE;
}

JNIEXPORT jboolean JNICALL Java_com_tencent_yolo11ncnn_YOLO11Ncnn_isStillCaptured(JNIEnv* env, jobject thiz)
{
    ncnn::MutexLockGuard g(still_lock);
    return g_still_captured ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jboolean JNICALL Java_com_tencent_yolo11ncnn_YOLO11Ncnn_processBitmap(JNIEnv* env, jobject thiz, jobject bitmap)
{
    AndroidBitmapInfo info;
    if (AndroidBitmap_getInfo(env, bitmap, &info) < 0) return JNI_FALSE;
    if (info.format != ANDROID_BITMAP_FORMAT_RGBA_8888) return JNI_FALSE;

    void* pixels = 0;
    if (AndroidBitmap_lockPixels(env, bitmap, &pixels) < 0) return JNI_FALSE;

    cv::Mat rgba(info.height, info.width, CV_8UC4, pixels);
    cv::Mat rgb;
    cv::cvtColor(rgba, rgb, cv::COLOR_RGBA2RGB);

    AndroidBitmap_unlockPixels(env, bitmap);

    {
        ncnn::MutexLockGuard g(still_lock);
        g_still_frame = rgb.clone();
        g_still_objects.clear();

        ncnn::MutexLockGuard g_model(lock);
        if (g_yolo11)
        {
            g_yolo11->detect(g_still_frame, g_still_objects);
        }
        g_still_captured = true;
    }

    return JNI_TRUE;
}

JNIEXPORT jobjectArray JNICALL Java_com_tencent_yolo11ncnn_YOLO11Ncnn_getDetectedMasks(JNIEnv* env, jobject thiz)
{
    ncnn::MutexLockGuard g_still(still_lock);

    const cv::Mat* source_frame = NULL;
    const std::vector<Object>* source_objects = NULL;

    if (g_still_captured)
    {
        if (g_still_frame.empty() || g_still_objects.empty())
            return NULL;

        source_frame = &g_still_frame;
        source_objects = &g_still_objects;
    }
    else
    {
        // Fallback to preview frame
        ncnn::MutexLockGuard g_preview(lock);
        if (g_last_frame_clean.empty() || g_last_objects.empty())
            return NULL;

        source_frame = &g_last_frame_clean;
        source_objects = &g_last_objects;
    }

    jclass bitmapClass = env->FindClass("android/graphics/Bitmap");
    jmethodID createBitmapMethod = env->GetStaticMethodID(bitmapClass, "createBitmap", "(IILandroid/graphics/Bitmap$Config;)Landroid/graphics/Bitmap;");
    jclass configClass = env->FindClass("android/graphics/Bitmap$Config");
    jfieldID argb8888Field = env->GetStaticFieldID(configClass, "ARGB_8888", "Landroid/graphics/Bitmap$Config;");
    jobject argb8888Config = env->GetStaticObjectField(configClass, argb8888Field);

    int count = source_objects->size();
    jobjectArray bitmaps = env->NewObjectArray(count, bitmapClass, NULL);

    for (int i = 0; i < count; i++)
    {
        const Object& obj = (*source_objects)[i];

        // Ensure rect is within bounds
        cv::Rect roi_rect = obj.rect;
        roi_rect &= cv::Rect(0, 0, source_frame->cols, source_frame->rows);
        if (roi_rect.width <= 0 || roi_rect.height <= 0) continue;

        cv::Mat roi = (*source_frame)(roi_rect).clone();

        // Apply mask
        for (int y = 0; y < roi.rows; y++) {
            for (int x = 0; x < roi.cols; x++) {
                if (!obj.mask.at<uchar>(y, x)) {
                    roi.at<cv::Vec3b>(y, x) = cv::Vec3b(0, 0, 0);
                }
            }
        }

        // Resize all masks to 224x224 as required by the classification model
        cv::Mat roi_resized;
        cv::resize(roi, roi_resized, cv::Size(224, 224), 0, 0, cv::INTER_LINEAR);

        cv::Mat mask_rgba;
        cv::cvtColor(roi_resized, mask_rgba, cv::COLOR_RGB2RGBA);

        jobject bitmap = env->CallStaticObjectMethod(bitmapClass, createBitmapMethod, 224, 224, argb8888Config);

        AndroidBitmapInfo info;
        void* pixels = 0;
        AndroidBitmap_getInfo(env, bitmap, &info);
        AndroidBitmap_lockPixels(env, bitmap, &pixels);
        memcpy(pixels, mask_rgba.data, 224 * 224 * 4);
        AndroidBitmap_unlockPixels(env, bitmap);

        env->SetObjectArrayElement(bitmaps, i, bitmap);
    }

    return bitmaps;
}

JNIEXPORT jobject JNICALL Java_com_tencent_yolo11ncnn_YOLO11Ncnn_getLastFrame(JNIEnv* env, jobject thiz)
{
    cv::Mat frame_to_draw;

    {
        ncnn::MutexLockGuard g_still(still_lock);
        if (g_still_captured)
        {
            if (g_still_frame.empty()) return NULL;
            frame_to_draw = g_still_frame.clone();

            ncnn::MutexLockGuard g_model(lock);
            if (g_yolo11)
            {
                g_yolo11->draw(frame_to_draw, g_still_objects);
            }
        }
    }

    if (frame_to_draw.empty())
    {
        ncnn::MutexLockGuard g_preview(lock);
        if (g_last_frame.empty()) return NULL;
        frame_to_draw = g_last_frame.clone();
    }

    jclass bitmapClass = env->FindClass("android/graphics/Bitmap");
    jmethodID createBitmapMethod = env->GetStaticMethodID(bitmapClass, "createBitmap", "(IILandroid/graphics/Bitmap$Config;)Landroid/graphics/Bitmap;");
    jclass configClass = env->FindClass("android/graphics/Bitmap$Config");
    jfieldID argb8888Field = env->GetStaticFieldID(configClass, "ARGB_8888", "Landroid/graphics/Bitmap$Config;");
    jobject argb8888Config = env->GetStaticObjectField(configClass, argb8888Field);

    cv::Mat frame_rgba;
    cv::Mat frame_resized;
    cv::resize(frame_to_draw, frame_resized, cv::Size(640, 480));
    cv::cvtColor(frame_resized, frame_rgba, cv::COLOR_RGB2RGBA);

    jobject bitmap = env->CallStaticObjectMethod(bitmapClass, createBitmapMethod, 640, 480, argb8888Config);

    void* pixels = 0;
    AndroidBitmap_lockPixels(env, bitmap, &pixels);
    memcpy(pixels, frame_rgba.data, 640 * 480 * 4);
    AndroidBitmap_unlockPixels(env, bitmap);

    return bitmap;
}

JNIEXPORT jobject JNICALL Java_com_tencent_yolo11ncnn_YOLO11Ncnn_getCleanFrame(JNIEnv* env, jobject thiz)
{
    cv::Mat frame;

    {
        ncnn::MutexLockGuard g_still(still_lock);
        if (g_still_captured)
        {
            if (g_still_frame.empty()) return NULL;
            frame = g_still_frame.clone();
        }
    }

    if (frame.empty())
    {
        ncnn::MutexLockGuard g_preview(lock);
        if (g_last_frame_clean.empty()) return NULL;
        frame = g_last_frame_clean.clone();
    }

    jclass bitmapClass = env->FindClass("android/graphics/Bitmap");
    jmethodID createBitmapMethod = env->GetStaticMethodID(bitmapClass, "createBitmap", "(IILandroid/graphics/Bitmap$Config;)Landroid/graphics/Bitmap;");
    jclass configClass = env->FindClass("android/graphics/Bitmap$Config");
    jfieldID argb8888Field = env->GetStaticFieldID(configClass, "ARGB_8888", "Landroid/graphics/Bitmap$Config;");
    jobject argb8888Config = env->GetStaticObjectField(configClass, argb8888Field);

    cv::Mat frame_rgba;
    cv::Mat frame_resized;
    cv::resize(frame, frame_resized, cv::Size(640, 480));
    cv::cvtColor(frame_resized, frame_rgba, cv::COLOR_RGB2RGBA);

    jobject bitmap = env->CallStaticObjectMethod(bitmapClass, createBitmapMethod, 640, 480, argb8888Config);

    void* pixels = 0;
    AndroidBitmap_lockPixels(env, bitmap, &pixels);
    memcpy(pixels, frame_rgba.data, 640 * 480 * 4);
    AndroidBitmap_unlockPixels(env, bitmap);

    return bitmap;
}

}
