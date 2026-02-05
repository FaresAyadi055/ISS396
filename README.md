# Full Stack Monorepo — Next.js + Expo + MongoDB

This project is a full-stack application composed of:

* **Next.js** → Backend API + Admin Web Dashboard
* **Expo (React Native)** → Mobile App
* **MongoDB + Mongoose** → Database layer

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
├── mobile/                   # Expo React Native App
│   ├── src/
│   ├── components/
│   ├── screens/
│   ├── services/             # API client
│   └── package.json
│
├── README.md
└── .env
```

---

## 🧠 Architecture Overview

```text
Mobile App (Expo)
        │
        │ HTTPS Requests
        ▼
Next.js Backend (API Routes)
        │
        │ Mongoose ODM
        ▼
MongoDB Database
```
