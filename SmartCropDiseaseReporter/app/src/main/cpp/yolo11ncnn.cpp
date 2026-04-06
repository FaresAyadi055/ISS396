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

class MyNdkCamera : public NdkCameraWindow
{
public:
    virtual void on_image_render(cv::Mat& rgb) const;
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

            g_yolo11->draw(rgb, objects);

            obj_count = (int)objects.size();
        }
        else
        {
            draw_unsupported(rgb);
        }
    }

    draw_fps(rgb, obj_count);
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

    // Segmentation: Vulkan (GPU / Turnip) disabled for correct masks/boxes on CPU
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

}
