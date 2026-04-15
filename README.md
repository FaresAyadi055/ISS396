# Full Stack Monorepo — Next.js + Native  Android + MongoDB

This project is a full-stack application composed of:

* **Next.js** → Backend API + Admin Web Dashboard
* **Native  Android** → Mobile App
* **MongoDB + Mongoose** → Database layer
Here's how to set up the ISS project with proper Markdown formatting:

# ISS Project Setup Guide

## Getting Started

First, pull the repository and switch to the `new` branch:

```bash
git pull
git checkout new
```

---

## Mobile Project Setup

Download the following two packages:

1. [ncnn-20260113-android-vulkan.zip](https://github.com/Tencent/ncnn/releases/download//ncnn-20260113-android-vulkan.zip)
2. [opencv-mobile-2.4.13.7-android.zip](https://github.com/nihui/opencv-mobile/releases/download/v35/opencv-mobile-2.4.13.7-android.zip)

After downloading, extract both packages into the following directory:

```
SmartCropDiseaseReporter\app\src\main\cpp
```

---

## Web Project Setup

### Step 1: Create a Hugging Face Account & API Key

1. Go to [Hugging Face](https://huggingface.co/)
2. Sign up or log in to your account
3. Create a **read** API key
4. Copy the generated key
### Step 1: Create a Hugging Face Account & API Key

1. Go to [GOOGLE AI STUDIO](https://aistudio.google.com/)
2. Sign up or log in to your account
3. Go to Get API key
4. Copy the default key
4. click on quick-stqrt.bat
### Step 3: Configure Environment Variables

Inside the `web` folder, create a `.env` file and add your API key:

```env
HF_API_TOKEN=hf_wl……………
GOOGLE_API_KEY=AI……………
```



---

## Project Structure

```
SmartCropDiseaseReporter/
├── app/
│   └── src/
│       └── main/
│           └── cpp/          ← NCNN + OpenCV packages go here
├── web/
│   └── .env                  ← Hugging Face and Google API key
└── ...
```
---

## 📦 Project Structure

```text
root/
│
├── web/                      # Next.js (Backend + Admin Dashboard)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/          # Backend API routes
│   │   │   │   ├── status/
│   │   │   │   │   └── route.js
│   │   │   │   └── users/
│   │   │   │       └── route.js
│   │   │   │
│   │   │   ├── (admin)/      # Admin dashboard pages
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.js
│   │   │   │   └── users/
│   │   │   │       └── page.js
│   │   │   │
│   │   │   └── (auth)/       # Authentication pages
│   │   │       └── login/
│   │   │           └── page.js
│   │   │
│   │   ├── lib/              # Core backend utilities
│   │   │   ├── db.js
│   │   │   └── auth.js
│   │   │
│   │   ├── models/           # Mongoose models
│   │   │   └── user.model.js
│   │   │
│   │   ├── services/         # Business / external services
│   │   │   └── user.service.js
│   │   │
│   │   ├── utils/            # Helpers
│   │   │   └── validators.js
│   │   │
│   │   └── middleware.js
│   │
│   ├── package.json
│   └── next.config.js
│
├── SmartCropDiseaseReporter/ # Native Android App (Kotlin)
│   ├── app/
│   │   └── src/main/
│   │       ├── java/
│   │       │   └── com/example/smartcropdiseasereporter/
│   │       │       ├── data/
│   │       │       │   ├── api/         # API services (Retrofit)
│   │       │       │   ├── model/        # Data models
│   │       │       │   └── ...
│   │       │       ├── ui/               # Activities & ViewModels
│   │       │       └── util/             # Utilities
│   │       └── res/              # Resources (layouts, values, etc.)
│   └── build.gradle.kts
│
├── README.md
└── .env
```

---

## 🧠 Architecture Overview

```text
Mobile App (Native Android - Kotlin)
        │
        │ AI Inference (NCNN + OpenCV)
        │ src/main/cpp/ ← YOLO11 model running here
        │
        │ HTTPS Requests
        ▼
Next.js Backend (API Routes)
        │
        │ Mongoose ODM
        ▼
MongoDB Database
```
