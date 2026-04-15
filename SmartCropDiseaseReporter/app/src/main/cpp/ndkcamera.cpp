// Tencent is pleased to support the open source community by making ncnn available.
//
// Copyright (C) 2021 THL A29 Limited, a Tencent company. All rights reserved.
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

#include "ndkcamera.h"

#include <string>
#include <android/log.h>
#include <opencv2/core/core.hpp>
#include "mat.h"

static void onDisconnected(void* context, ACameraDevice* device)
{
    __android_log_print(ANDROID_LOG_WARN, "NdkCamera", "onDisconnected %p", device);
}

static void onError(void* context, ACameraDevice* device, int error)
{
    __android_log_print(ANDROID_LOG_WARN, "NdkCamera", "onError %p %d", device, error);
}

static void onImageAvailable(void* context, AImageReader* reader)
{
    AImage* image = 0;
    media_status_t status = AImageReader_acquireLatestImage(reader, &image);

    if (status != AMEDIA_OK)
    {
        return;
    }

    int32_t width = 0;
    int32_t height = 0;
    AImage_getWidth(image, &width);
    AImage_getHeight(image, &height);

    int32_t y_pixelStride = 0;
    int32_t u_pixelStride = 0;
    int32_t v_pixelStride = 0;
    AImage_getPlanePixelStride(image, 0, &y_pixelStride);
    AImage_getPlanePixelStride(image, 1, &u_pixelStride);
    AImage_getPlanePixelStride(image, 2, &v_pixelStride);

    int32_t y_rowStride = 0;
    int32_t u_rowStride = 0;
    int32_t v_rowStride = 0;
    AImage_getPlaneRowStride(image, 0, &y_rowStride);
    AImage_getPlaneRowStride(image, 1, &u_rowStride);
    AImage_getPlaneRowStride(image, 2, &v_rowStride);

    uint8_t* y_data = 0;
    uint8_t* u_data = 0;
    uint8_t* v_data = 0;
    int y_len = 0;
    int u_len = 0;
    int v_len = 0;
    AImage_getPlaneData(image, 0, &y_data, &y_len);
    AImage_getPlaneData(image, 1, &u_data, &u_len);
    AImage_getPlaneData(image, 2, &v_data, &v_len);

    NdkCamera* cam = (NdkCamera*)context;

    if (u_data == v_data + 1 && v_data == y_data + width * height && y_pixelStride == 1 && u_pixelStride == 2 && v_pixelStride == 2 && y_rowStride == width && u_rowStride == width && v_rowStride == width)
    {
        if (reader == cam->still_image_reader)
            cam->on_still_image(cv::Mat(height + height / 2, width, CV_8UC1, (unsigned char*)y_data).clone());
        else
            cam->on_image((unsigned char*)y_data, (int)width, (int)height);
    }
    else
    {
        unsigned char* nv21 = new unsigned char[width * height + width * height / 2];
        {
            // Y
            unsigned char* yptr = nv21;
            for (int y=0; y<height; y++)
            {
                const unsigned char* y_data_ptr = y_data + y_rowStride * y;
                for (int x=0; x<width; x++)
                {
                    yptr[0] = y_data_ptr[0];
                    yptr++;
                    y_data_ptr += y_pixelStride;
                }
            }

            // UV
            unsigned char* uvptr = nv21 + width * height;
            for (int y=0; y<height/2; y++)
            {
                const unsigned char* v_data_ptr = v_data + v_rowStride * y;
                const unsigned char* u_data_ptr = u_data + u_rowStride * y;
                for (int x=0; x<width/2; x++)
                {
                    uvptr[0] = v_data_ptr[0];
                    uvptr[1] = u_data_ptr[0];
                    uvptr += 2;
                    v_data_ptr += v_pixelStride;
                    u_data_ptr += u_pixelStride;
                }
            }
        }

        if (reader == cam->still_image_reader)
            cam->on_still_image(cv::Mat(height + height / 2, width, CV_8UC1, nv21).clone());
        else
            cam->on_image((unsigned char*)nv21, (int)width, (int)height);

        delete[] nv21;
    }

    AImage_delete(image);
}

static void onSessionActive(void* context, ACameraCaptureSession *session) {}
static void onSessionReady(void* context, ACameraCaptureSession *session) {}
static void onSessionClosed(void* context, ACameraCaptureSession *session) {}
void onCaptureFailed(void* context, ACameraCaptureSession* session, ACaptureRequest* request, ACameraCaptureFailure* failure) {}
void onCaptureSequenceCompleted(void* context, ACameraCaptureSession* session, int sequenceId, int64_t frameNumber) {}
void onCaptureSequenceAborted(void* context, ACameraCaptureSession* session, int sequenceId) {}
void onCaptureCompleted(void* context, ACameraCaptureSession* session, ACaptureRequest* request, const ACameraMetadata* result) {}

NdkCamera::NdkCamera()
{
    camera_facing = 0;
    camera_orientation = 0;
    camera_manager = 0;
    camera_device = 0;
    image_reader = 0;
    image_reader_surface = 0;
    image_reader_target = 0;
    capture_request = 0;
    capture_session_output_container = 0;
    capture_session_output = 0;
    capture_session = 0;
    still_image_reader = 0;
    still_image_reader_surface = 0;
    still_image_reader_target = 0;
    still_capture_session_output = 0;
}

NdkCamera::~NdkCamera()
{
    close();
}

int NdkCamera::open(int _camera_facing)
{
    camera_facing = _camera_facing;
    camera_manager = ACameraManager_create();
    if (!camera_manager) return -1;

    std::string camera_id;
    int max_width = 0;
    int max_height = 0;
    int preview_width = 0;
    int preview_height = 0;

    ACameraIdList* camera_id_list = 0;
    ACameraManager_getCameraIdList(camera_manager, &camera_id_list);
    for (int i = 0; i < camera_id_list->numCameras; ++i)
    {
        const char* id = camera_id_list->cameraIds[i];
        ACameraMetadata* camera_metadata = 0;
        ACameraManager_getCameraCharacteristics(camera_manager, id, &camera_metadata);

        ACameraMetadata_const_entry e = { 0 };
        ACameraMetadata_getConstEntry(camera_metadata, ACAMERA_LENS_FACING, &e);
        acamera_metadata_enum_android_lens_facing_t facing = (acamera_metadata_enum_android_lens_facing_t)e.data.u8[0];

        if (camera_facing == 0 && facing != ACAMERA_LENS_FACING_FRONT) { ACameraMetadata_free(camera_metadata); continue; }
        if (camera_facing == 1 && facing != ACAMERA_LENS_FACING_BACK) { ACameraMetadata_free(camera_metadata); continue; }

        camera_id = id;
        ACameraMetadata_getConstEntry(camera_metadata, ACAMERA_SENSOR_ORIENTATION, &e);
        camera_orientation = (int)e.data.i32[0];

        ACameraMetadata_getConstEntry(camera_metadata, ACAMERA_SCALER_AVAILABLE_STREAM_CONFIGURATIONS, &e);

        // Find maximum resolution for still capture
        for (int j = 0; j < e.count; j += 4) {
            if (e.data.i32[j] == AIMAGE_FORMAT_YUV_420_888 && e.data.i32[j+3] == 0) {
                int w = e.data.i32[j+1];
                int h = e.data.i32[j+2];
                if (w * h > max_width * max_height) { max_width = w; max_height = h; }
            }
        }

        // Find a suitable preview resolution (same aspect ratio as max, prefer close to 640x480)
        double target_aspect = (double)max_width / (max_height ? max_height : 1);
        double min_aspect_diff = 1.0;
        for (int j = 0; j < e.count; j += 4) {
            if (e.data.i32[j] == AIMAGE_FORMAT_YUV_420_888 && e.data.i32[j+3] == 0) {
                int w = e.data.i32[j+1];
                int h = e.data.i32[j+2];
                double aspect = (double)w / h;
                double aspect_diff = std::abs(aspect - target_aspect);
                if (aspect_diff < 0.01) { // Same aspect ratio
                    if (preview_width == 0 || std::abs(w - 640) + std::abs(h - 480) < std::abs(preview_width - 640) + std::abs(preview_height - 480)) {
                        preview_width = w;
                        preview_height = h;
                    }
                }
            }
        }
        // If no matching aspect ratio found for preview, just pick something close to 640x480
        if (preview_width == 0) {
            for (int j = 0; j < e.count; j += 4) {
                if (e.data.i32[j] == AIMAGE_FORMAT_YUV_420_888 && e.data.i32[j+3] == 0) {
                    int w = e.data.i32[j+1];
                    int h = e.data.i32[j+2];
                    if (preview_width == 0 || std::abs(w - 640) + std::abs(h - 480) < std::abs(preview_width - 640) + std::abs(preview_height - 480)) {
                        preview_width = w;
                        preview_height = h;
                    }
                }
            }
        }

        ACameraMetadata_free(camera_metadata);
        break;
    }
    ACameraManager_deleteCameraIdList(camera_id_list);

    if (camera_id.empty()) return -1;
    if (preview_width == 0 || preview_height == 0) { preview_width = 640; preview_height = 480; }
    if (max_width == 0 || max_height == 0) { max_width = 640; max_height = 480; }

    AImageReader_new(preview_width, preview_height, AIMAGE_FORMAT_YUV_420_888, 2, &image_reader);
    AImageReader_ImageListener listener;
    listener.context = this;
    listener.onImageAvailable = onImageAvailable;
    AImageReader_setImageListener(image_reader, &listener);
    AImageReader_getWindow(image_reader, &image_reader_surface);
    ANativeWindow_acquire(image_reader_surface);

    AImageReader_new(max_width, max_height, AIMAGE_FORMAT_YUV_420_888, 2, &still_image_reader);
    AImageReader_setImageListener(still_image_reader, &listener);
    AImageReader_getWindow(still_image_reader, &still_image_reader_surface);
    ANativeWindow_acquire(still_image_reader_surface);

    ACameraDevice_StateCallbacks camera_device_state_callbacks;
    camera_device_state_callbacks.context = this;
    camera_device_state_callbacks.onDisconnected = onDisconnected;
    camera_device_state_callbacks.onError = onError;
    ACameraManager_openCamera(camera_manager, camera_id.c_str(), &camera_device_state_callbacks, &camera_device);

    ACameraDevice_createCaptureRequest(camera_device, TEMPLATE_PREVIEW, &capture_request);
    ACameraOutputTarget_create(image_reader_surface, &image_reader_target);
    ACaptureRequest_addTarget(capture_request, image_reader_target);
    ACameraOutputTarget_create(still_image_reader_surface, &still_image_reader_target);

    ACameraCaptureSession_stateCallbacks camera_capture_session_state_callbacks;
    camera_capture_session_state_callbacks.context = this;
    camera_capture_session_state_callbacks.onActive = onSessionActive;
    camera_capture_session_state_callbacks.onReady = onSessionReady;
    camera_capture_session_state_callbacks.onClosed = onSessionClosed;

    ACaptureSessionOutputContainer_create(&capture_session_output_container);
    ACaptureSessionOutput_create(image_reader_surface, &capture_session_output);
    ACaptureSessionOutputContainer_add(capture_session_output_container, capture_session_output);
    ACaptureSessionOutput_create(still_image_reader_surface, &still_capture_session_output);
    ACaptureSessionOutputContainer_add(capture_session_output_container, still_capture_session_output);

    ACameraDevice_createCaptureSession(camera_device, capture_session_output_container, &camera_capture_session_state_callbacks, &capture_session);

    ACameraCaptureSession_captureCallbacks camera_capture_session_capture_callbacks;
    camera_capture_session_capture_callbacks.context = this;
    camera_capture_session_capture_callbacks.onCaptureStarted = 0;
    camera_capture_session_capture_callbacks.onCaptureProgressed = 0;
    camera_capture_session_capture_callbacks.onCaptureCompleted = onCaptureCompleted;
    camera_capture_session_capture_callbacks.onCaptureFailed = onCaptureFailed;
    camera_capture_session_capture_callbacks.onCaptureSequenceCompleted = onCaptureSequenceCompleted;
    camera_capture_session_capture_callbacks.onCaptureSequenceAborted = onCaptureSequenceAborted;
    camera_capture_session_capture_callbacks.onCaptureBufferLost = 0;

    ACameraCaptureSession_setRepeatingRequest(capture_session, &camera_capture_session_capture_callbacks, 1, &capture_request, nullptr);

    return 0;
}

void NdkCamera::capture_still()
{
    ACaptureRequest* still_request = nullptr;
    ACameraDevice_createCaptureRequest(camera_device, TEMPLATE_STILL_CAPTURE, &still_request);
    ACaptureRequest_addTarget(still_request, still_image_reader_target);
    ACameraCaptureSession_capture(capture_session, nullptr, 1, &still_request, nullptr);
    ACaptureRequest_free(still_request);
}

void NdkCamera::close()
{
    if (capture_session) { ACameraCaptureSession_stopRepeating(capture_session); ACameraCaptureSession_close(capture_session); capture_session = 0; }
    if (camera_device) { ACameraDevice_close(camera_device); camera_device = 0; }
    if (capture_session_output_container) { ACaptureSessionOutputContainer_free(capture_session_output_container); capture_session_output_container = 0; }
    if (capture_session_output) { ACaptureSessionOutput_free(capture_session_output); capture_session_output = 0; }
    if (still_capture_session_output) { ACaptureSessionOutput_free(still_capture_session_output); still_capture_session_output = 0; }
    if (capture_request) { ACaptureRequest_free(capture_request); capture_request = 0; }
    if (image_reader_target) { ACameraOutputTarget_free(image_reader_target); image_reader_target = 0; }
    if (still_image_reader_target) { ACameraOutputTarget_free(still_image_reader_target); still_image_reader_target = 0; }
    if (camera_manager) { ACameraManager_delete(camera_manager); camera_manager = 0; }
    if (image_reader) { AImageReader_delete(image_reader); image_reader = 0; }
    if (image_reader_surface) { ANativeWindow_release(image_reader_surface); image_reader_surface = 0; }
    if (still_image_reader) { AImageReader_delete(still_image_reader); still_image_reader = 0; }
    if (still_image_reader_surface) { ANativeWindow_release(still_image_reader_surface); still_image_reader_surface = 0; }
}

void NdkCamera::on_image(const cv::Mat& rgb) const {}
void NdkCamera::on_still_image(const cv::Mat& rgb) const {}

void NdkCamera::on_image(const unsigned char* nv21, int nv21_width, int nv21_height) const
{
    int w = 0, h = 0, rotate_type = 0;
    if (camera_orientation == 0) { w = nv21_width; h = nv21_height; rotate_type = camera_facing == 0 ? 2 : 1; }
    if (camera_orientation == 90) { w = nv21_height; h = nv21_width; rotate_type = camera_facing == 0 ? 5 : 6; }
    if (camera_orientation == 180) { w = nv21_width; h = nv21_height; rotate_type = camera_facing == 0 ? 4 : 3; }
    if (camera_orientation == 270) { w = nv21_height; h = nv21_width; rotate_type = camera_facing == 0 ? 7 : 8; }

    cv::Mat nv21_rotated(h + h / 2, w, CV_8UC1);
    ncnn::kanna_rotate_yuv420sp(nv21, nv21_width, nv21_height, nv21_rotated.data, w, h, rotate_type);
    cv::Mat rgb(h, w, CV_8UC3);
    ncnn::yuv420sp2rgb(nv21_rotated.data, w, h, rgb.data);
    on_image(rgb);
}

NdkCameraWindow::NdkCameraWindow() : NdkCamera()
{
    sensor_manager = ASensorManager_getInstance();
    accelerometer_sensor = ASensorManager_getDefaultSensor(sensor_manager, ASENSOR_TYPE_ACCELEROMETER);
    win = 0;
    accelerometer_orientation = 0;
    sensor_event_queue = 0;
}

NdkCameraWindow::~NdkCameraWindow()
{
    if (accelerometer_sensor) ASensorEventQueue_disableSensor(sensor_event_queue, accelerometer_sensor);
    if (sensor_event_queue) ASensorManager_destroyEventQueue(sensor_manager, sensor_event_queue);
    if (win) ANativeWindow_release(win);
}

void NdkCameraWindow::set_window(ANativeWindow* _win)
{
    if (win) ANativeWindow_release(win);
    win = _win;
    if (win) ANativeWindow_acquire(win);
}

void NdkCameraWindow::on_image_render(cv::Mat& rgb) const {}

void NdkCameraWindow::on_image(const unsigned char* nv21, int nv21_width, int nv21_height) const
{
    if (!win) return;
    {
        if (!sensor_event_queue) {
            sensor_event_queue = ASensorManager_createEventQueue(sensor_manager, ALooper_prepare(ALOOPER_PREPARE_ALLOW_NON_CALLBACKS), 233, 0, 0);
            ASensorEventQueue_enableSensor(sensor_event_queue, accelerometer_sensor);
        }
        int id = ALooper_pollOnce(0, 0, 0, 0);
        if (id == 233) {
            ASensorEvent e[8];
            ssize_t num_event = 0;
            while (ASensorEventQueue_hasEvents(sensor_event_queue) == 1) {
                num_event = ASensorEventQueue_getEvents(sensor_event_queue, e, 8);
                if (num_event < 0) break;
            }
            if (num_event > 0) {
                float x = e[num_event - 1].acceleration.x;
                float y = e[num_event - 1].acceleration.y;
                if (y > 7) accelerometer_orientation = 0;
                else if (x < -7) accelerometer_orientation = 90;
                else if (y < -7) accelerometer_orientation = 180;
                else if (x > 7) accelerometer_orientation = 270;
            }
        }
    }

    int win_w = ANativeWindow_getWidth(win);
    int win_h = ANativeWindow_getHeight(win);
    if (accelerometer_orientation == 90 || accelerometer_orientation == 270) std::swap(win_w, win_h);
    const int final_orientation = (camera_orientation + accelerometer_orientation) % 360;

    int roi_x, roi_y, roi_w, roi_h;
    if (final_orientation == 0 || final_orientation == 180) {
        if (win_w * nv21_height > win_h * nv21_width) {
            roi_w = nv21_width; roi_h = (nv21_width * win_h / win_w) / 2 * 2;
            roi_x = 0; roi_y = ((nv21_height - roi_h) / 2) / 2 * 2;
        } else {
            roi_h = nv21_height; roi_w = (nv21_height * win_w / win_h) / 2 * 2;
            roi_x = ((nv21_width - roi_w) / 2) / 2 * 2; roi_y = 0;
        }
    } else {
        if (win_w * nv21_width > win_h * nv21_height) {
            roi_w = nv21_height; roi_h = (nv21_height * win_h / win_w) / 2 * 2;
            roi_x = 0; roi_y = ((nv21_width - roi_h) / 2) / 2 * 2;
        } else {
            roi_h = nv21_width; roi_w = (nv21_width * win_w / win_h) / 2 * 2;
            roi_x = ((nv21_height - roi_w) / 2) / 2 * 2; roi_y = 0;
        }
    }

    int rotate_type = 0;
    if (camera_facing == 0) {
        if (camera_orientation == 0) rotate_type = (accelerometer_orientation == 0) ? 2 : (accelerometer_orientation == 90) ? 7 : (accelerometer_orientation == 180) ? 4 : 5;
        else if (camera_orientation == 90) rotate_type = (accelerometer_orientation == 0) ? 5 : (accelerometer_orientation == 90) ? 2 : (accelerometer_orientation == 180) ? 7 : 4;
        else if (camera_orientation == 180) rotate_type = (accelerometer_orientation == 0) ? 4 : (accelerometer_orientation == 90) ? 5 : (accelerometer_orientation == 180) ? 2 : 7;
        else if (camera_orientation == 270) rotate_type = (accelerometer_orientation == 0) ? 7 : (accelerometer_orientation == 90) ? 4 : (accelerometer_orientation == 180) ? 5 : 2;
    } else {
        rotate_type = (final_orientation == 0) ? 1 : (final_orientation == 90) ? 6 : (final_orientation == 180) ? 3 : 8;
    }

    int render_w, render_h, render_rotate_type;
    if (accelerometer_orientation == 0) { render_w = roi_w; render_h = roi_h; render_rotate_type = 1; }
    else if (accelerometer_orientation == 90) { render_w = roi_h; render_h = roi_w; render_rotate_type = 8; }
    else if (accelerometer_orientation == 180) { render_w = roi_w; render_h = roi_h; render_rotate_type = 3; }
    else { render_w = roi_h; render_h = roi_w; render_rotate_type = 6; }

    cv::Mat nv21_croprotated(roi_h + roi_h / 2, roi_w, CV_8UC1);
    const unsigned char* srcY = nv21 + (final_orientation < 90 || final_orientation >= 270 ? roi_y * nv21_width + roi_x : roi_x * nv21_width + roi_y);
    ncnn::kanna_rotate_c1(srcY, (final_orientation % 180 == 0 ? roi_w : roi_h), (final_orientation % 180 == 0 ? roi_h : roi_w), nv21_width, nv21_croprotated.data, roi_w, roi_h, roi_w, rotate_type);
    const unsigned char* srcUV = nv21 + nv21_width * nv21_height + (final_orientation < 90 || final_orientation >= 270 ? roi_y * nv21_width / 2 + roi_x : roi_x * nv21_width / 2 + roi_y);
    ncnn::kanna_rotate_c2(srcUV, (final_orientation % 180 == 0 ? roi_w : roi_h) / 2, (final_orientation % 180 == 0 ? roi_h : roi_w) / 2, nv21_width, nv21_croprotated.data + roi_w * roi_h, roi_w / 2, roi_h / 2, roi_w, rotate_type);

    cv::Mat rgb(roi_h, roi_w, CV_8UC3);
    ncnn::yuv420sp2rgb(nv21_croprotated.data, roi_w, roi_h, rgb.data);
    on_image_render(rgb);

    cv::Mat rgb_render(render_h, render_w, CV_8UC3);
    ncnn::kanna_rotate_c3(rgb.data, roi_w, roi_h, rgb_render.data, render_w, render_h, render_rotate_type);

    ANativeWindow_setBuffersGeometry(win, render_w, render_h, AHARDWAREBUFFER_FORMAT_R8G8B8A8_UNORM);
    ANativeWindow_Buffer buf;
    if (ANativeWindow_lock(win, &buf, NULL) == 0) {
        for (int y = 0; y < render_h; y++) {
            const unsigned char* ptr = rgb_render.ptr<const unsigned char>(y);
            unsigned char* outptr = (unsigned char*)buf.bits + buf.stride * 4 * y;
            for (int x = 0; x < render_w; x++) {
                outptr[0] = ptr[0]; outptr[1] = ptr[1]; outptr[2] = ptr[2]; outptr[3] = 255;
                ptr += 3; outptr += 4;
            }
        }
        ANativeWindow_unlockAndPost(win);
    }
}
