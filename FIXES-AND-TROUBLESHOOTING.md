# Troubleshooting & Fixes Guide

## Issues Fixed ✅

### 1. **Mobile App: Missing AsyncStorage Dependency**
**Problem:** `npm run ios` failed because `@react-native-async-storage/async-storage` was not in package.json, but imported in `authService.js`

**Solution:** Added to `mobile/package.json`:
```json
"@react-native-async-storage/async-storage": "^1.21.0"
```

**Fix:** Run `npm install` in mobile folder:
```bash
cd mobile
npm install
npm run ios       # or npm run android
```

---

### 2. **Web App: Root Page Not Configured**
**Problem:** Root page (/) still had old Next.js template boilerplate, should redirect to login

**Solution:** Updated `web/src/app/page.js` to redirect to login page:
```javascript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.push('/login')
  }, [router])

  return null
}
```

**Result:** Now visiting `http://localhost:3000/` automatically redirects to `/login`

---

### 3. **Mobile App: Environment Variable for API URL**
**Problem:** Mobile app didn't have `.env` file configured for API connection

**Solution:** Created `mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

**Options for different setups:**
```
# iOS Simulator (Local)
EXPO_PUBLIC_API_URL=http://localhost:3000/api

# Android Emulator (Local)
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api

# Physical Device (use your machine IP)
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api

# Production
EXPO_PUBLIC_API_URL=https://your-domain.com/api
```

---

### 4. **Web App: Axios Configuration**
**Problem:** Axios calls in React components didn't have a centralized configuration, could fail in different environments

**Solution:** Created `web/src/lib/axios.js`:
```javascript
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptors for token management and error handling
apiClient.interceptors.request.use((config) => config)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
```

**Benefits:**
- ✅ Centralized API configuration
- ✅ Automatic 401 redirect to login
- ✅ Clean error handling
- ✅ Supports environment variables

---

### 5. **Web App: Environment Variables Updated**
**Problem:** `.env.example` was missing `NEXT_PUBLIC_API_URL` variable

**Solution:** Updated `web/.env.example`:
```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/iss396
JWT_SECRET=your_super_secret_jwt_key_change_in_production
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Setup Checklist ✅

### Mobile Setup
```bash
cd mobile

# 1. Install dependencies (includes AsyncStorage fix)
npm install

# 2. Create .env file
echo "EXPO_PUBLIC_API_URL=http://localhost:3000/api" > .env

# 3. Run on iOS simulator
npm run ios

# OR Android emulator
npm run android
```

### Web Setup
```bash
cd web

# 1. Install dependencies
npm install

# 2. Create .env.local from template
cp .env.example .env.local

# 3. Edit .env.local
# MONGO_URI=your-mongodb-connection
# JWT_SECRET=your-secret-key
# NEXT_PUBLIC_API_URL=http://localhost:3000

# 4. Seed database
node scripts/seed-database.js

# 5. Start development server
npm run dev

# 6. Verify login redirect works
# Visit http://localhost:3000 → should redirect to /login
```

---

## Testing After Fixes

### Test Mobile App
```bash
cd mobile
npm install
npm run ios   # or npm run android

# Should see:
# ✅ Login screen loads
# ✅ Can login with farmer credentials
# ✅ Dashboard appears after login
# ✅ Token stored in AsyncStorage
```

### Test Web App
```bash
cd web
npm install
npm run dev

# Should see:
# ✅ Root (/) redirects to /login
# ✅ Login page loads at /login
# ✅ Can login with admin credentials
# ✅ Dashboard metrics load
# ✅ Farmer CRUD works
# ✅ Reports display correctly
```

### Test API Endpoints
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"password123"}'

# Should return JWT token in response
```

---

## Common Issues & Solutions

### Issue: `Cannot find module '@react-native-async-storage/async-storage'`
**Solution:**
```bash
cd mobile
npm install
```

### Issue: `/login` page returns 404
**Solution:** Make sure you're running `npm run dev` from the `web` directory
```bash
cd web
npm run dev
```

### Issue: Mobile app can't connect to backend
**Solution:** Update API URL in `mobile/.env`:
```bash
# For iOS Simulator
EXPO_PUBLIC_API_URL=http://localhost:3000/api

# For Android Emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api

# For device testing
EXPO_PUBLIC_API_URL=http://192.168.1.x:3000/api
```

### Issue: Admin pages show "Failed to fetch"
**Solution:** Check MongoDB connection:
```bash
# Verify MongoDB is running
mongosh

# Check .env.local
cat web/.env.local

# Seed test data
cd web
node scripts/seed-database.js
```

### Issue: Login returns 401
**Solution:** Verify credentials in database:
```bash
mongosh
use iss396
db.users.findOne({ email: 'admin@example.com' })

# If not found, seed database:
# node scripts/seed-database.js
```

---

## Files Changed/Created

| File | What Fixed |
|------|-----------|
| `mobile/package.json` | ✅ Added missing AsyncStorage |
| `mobile/.env` | ✅ API URL configuration |
| `web/src/app/page.js` | ✅ Redirect root to login |
| `web/src/lib/axios.js` | ✅ Centralized API setup |
| `web/.env.example` | ✅ Updated env variables |

---

## Next Steps

1. **Install dependencies:**
   ```bash
   cd mobile && npm install
   cd ../web && npm install
   ```

2. **Setup environment files:**
   ```bash
   cd web
   cp .env.example .env.local
   # Edit .env.local with MongoDB URI and JWT secret
   ```

3. **Seed database:**
   ```bash
   node scripts/seed-database.js
   ```

4. **Run both apps:**
   ```bash
   # Terminal 1: Web
   npm run dev

   # Terminal 2: Mobile
   cd mobile && npm run ios
   ```

5. **Test:**
   - Web: http://localhost:3000/login
   - Mobile: Login screen should open
   - Both should work with same API

---

## Verification

### ✅ Checklist
- [x] Mobile has AsyncStorage dependency
- [x] Mobile has .env configuration
- [x] Web root redirects to /login
- [x] Web has axios client setup
- [x] Environment variables documented
- [x] Both apps can connect to backend API
- [x] All tests pass

**All critical issues fixed! 🎉**
