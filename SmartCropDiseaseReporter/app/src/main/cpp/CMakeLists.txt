cmake_minimum_required(VERSION 3.10)
project(yolo11ncnn)

# 1. Setup OpenMP
find_package(OpenMP REQUIRED)
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${OpenMP_C_FLAGS}")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${OpenMP_CXX_FLAGS}")
# Use static openmp to avoid library dependency issues
set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -static-openmp")

# 2. Setup OpenCV
# If extracted directly, the folder name is usually opencv-mobile-2.4.13.7-android
set(OpenCV_DIR "${CMAKE_CURRENT_SOURCE_DIR}/opencv-mobile-2.4.13.7-android/sdk/native/jni")
find_package(OpenCV REQUIRED core imgproc)

# 3. Setup ncnn
# ncnn is usually extracted into a folder like ncnn-20260113-android-vulkan
set(ncnn_DIR "${CMAKE_CURRENT_SOURCE_DIR}/ncnn-20260113-android-vulkan/${ANDROID_ABI}/lib/cmake/ncnn")
find_package(ncnn REQUIRED)

# 4. List Source Files
set(YOLO_SOURCES
        yolo11ncnn.cpp
        yolo11.cpp
        yolo11_seg.cpp
        ndkcamera.cpp
)

# 5. Create Library
add_library(yolo11ncnn SHARED ${YOLO_SOURCES})

# 6. Link Libraries
target_link_libraries(yolo11ncnn
        ncnn
        opencv_core
        opencv_imgproc
        camera2ndk
        mediandk
        log
        jnigraphics
        OpenMP::OpenMP_CXX
)
