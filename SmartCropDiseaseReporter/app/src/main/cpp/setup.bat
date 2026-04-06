@echo off
setlocal

set URL1=https://github.com/Tencent/ncnn/archive/20260113-android-vulkan.zip
set URL2=https://github.com/opencv/opencv-mobile/archive/2.4.13.7-android.zip

set DOWNLOAD1=ncnn-20260113-android-vulkan.zip
set DOWNLOAD2=opencv-mobile-2.4.13.7-android.zip

for %%i in (%DOWNLOAD1% %DOWNLOAD2%) do (
    if exist %%i (
        echo File %%i already exists. Delete it first if you want to download again.
        exit /b 1
    )
)

echo Downloading %DOWNLOAD1%...
curl -L -o %DOWNLOAD1% %URL1%

echo Downloading %DOWNLOAD2%...
curl -L -o %DOWNLOAD2% %URL2%

echo Extracting %DOWNLOAD1%...
powershell -command "Expand-Archive -Force %DOWNLOAD1% ."

echo Extracting %DOWNLOAD2%...
powershell -command "Expand-Archive -Force %DOWNLOAD2% ."

echo Deleting zip files...
del %DOWNLOAD1% %DOWNLOAD2%

echo Done! Extracted contents are in the current directory.

endlocal