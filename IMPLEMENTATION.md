# Full Stack Agricultural Diagnostic Application

A complete full-stack solution for crop disease diagnosis and management, featuring a React Native mobile app for farmers and a Next.js admin dashboard, backed by Node.js with MongoDB.

---

## 🎯 Features

### Mobile App (React Native / Expo)
- **Farmer Authentication**: Secure login with JWT tokens
- **Static Dashboard**: User profile and quick actions
- **Minimalist UI**: Black and white design for clarity
- **Offline Support**: AsyncStorage for token persistence

### Admin Dashboard (Next.js)
- **Admin Authentication**: Secure login with httpOnly cookies
- **Farmer Management**: Full CRUD operations
- **Reports Viewer**: Paginated report display
- **Overview Metrics**: Dashboard with key statistics
- **Role-Based Access Control**: Only admins can access protected routes
- **Minimalist Design**: Clean black and white UI

### Backend (Next.js API Routes)
- **User Management**: Create, read, update, delete farmers
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Authorization**: Admin and farmer roles
- **Report Management**: Store and retrieve crop diagnostic reports
- **MongoDB Integration**: Persistent data storage with Mongoose

---

## 📁 Project Structure

```
ISS396/
├── web/                          # Next.js backend + admin dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/              # Backend API routes
│   │   │   │   ├── auth/
│   │   │   │   │   └── login/
│   │   │   │   │       └── route.js
│   │   │   │   └── admin/
│   │   │   │       ├── farmers/
│   │   │   │       │   ├── route.js
│   │   │   │       │   └── [id]/route.js
│   │   │   │       └── reports/
│   │   │   │           └── route.js
│   │   │   ├── admin/            # Protected admin pages
│   │   │   │   ├── layout.js
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.js
│   │   │   │   ├── farmers/
│   │   │   │   │   └── page.js
│   │   │   │   └── reports/
│   │   │   │       └── page.js
│   │   │   ├── login/
│   │   │   │   └── page.js
│   │   │   ├── globals.css
│   │   │   └── layout.js
│   │   ├── components/           # Reusable UI components
│   │   │   ├── Sidebar.js
│   │   │   ├── Navbar.js
│   │   │   ├── Table.js
│   │   │   ├── Button.js
│   │   │   └── FormInput.js
│   │   ├── models/               # Mongoose schemas
│   │   │   ├── User.js
│   │   │   └── Report.js
│   │   ├── services/             # Business logic
│   │   │   ├── user.service.js
│   │   │   └── report.service.js
│   │   └── lib/
│   │       ├── pool.js           # MongoDB connection
│   │       ├── auth.js           # JWT utilities
│   │       └── cookies.js        # Cookie handling
│   ├── middleware.js             # Next.js route protection
│   ├── .env.example
│   └── package.json
│
├── mobile/                       # React Native / Expo app
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   └── DashboardScreen.js
│   ├── context/
│   │   └── AuthContext.js        # Auth state management
│   ├── services/
│   │   └── authService.js        # API calls & token storage
│   ├── navigation/
│   │   └── RootNavigator.js      # Navigation setup
│   ├── App.js
│   └── package.json
│
└── README.md
```

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Expo CLI (for mobile development)
- Git

### 1. Backend Setup (Next.js + API)

```bash
cd web
npm install

# Create .env.local file
cp .env.example .env.local

# Edit .env.local with your values:
# MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/iss396
# JWT_SECRET=your_secret_key_here
# NODE_ENV=development
```

**Run development server:**
```bash
npm run dev
# Opening http://localhost:3000
```

**Create test admin user:**
Make a POST request to `/api/auth/login` with:
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### 2. Mobile App Setup (React Native / Expo)

```bash
cd mobile
npm install

# Update authService.js with your API URL
# Or set EXPO_PUBLIC_API_URL in .env
```

**Run on iOS simulator:**
```bash
npm run ios
```

**Run on Android emulator:**
```bash
npm run android
```

**Run on web:**
```bash
npm run web
```

---

## 🔐 Authentication Flow

### Mobile App (Farmer)
1. User enters email and password
2. POST `/api/auth/login`
3. Receives JWT token
4. Token stored in AsyncStorage
5. Token attached to all future requests
6. Logout clears token

### Admin Dashboard
1. Admin enters credentials
2. POST `/api/auth/login`
3. Receives JWT token in httpOnly cookie
4. Middleware verifies token on protected routes
5. Automatic redirect if token invalid/expired

---

## 📡 API Endpoints

### Authentication
```
POST /api/auth/login
- Body: { email: string, password: string }
- Response: { token: string, user: {...} }
```

### Admin Routes (Protected - Require JWT)
```
GET /api/admin/farmers
- Headers: Authorization: Bearer <TOKEN>
- Response: { farmers: [...] }

POST /api/admin/farmers
- Headers: Authorization: Bearer <TOKEN>
- Body: { name: string, email: string, password: string }
- Response: { user: {...} }

PUT /api/admin/farmers/:id
- Headers: Authorization: Bearer <TOKEN>
- Body: { name?: string, email?: string }
- Response: { farmer: {...} }

DELETE /api/admin/farmers/:id
- Headers: Authorization: Bearer <TOKEN>
- Response: { success: true }

GET /api/admin/reports?page=1&limit=10
- Headers: Authorization: Bearer <TOKEN>
- Response: { reports: [...], pagination: {...} }
```

---

## 🎨 UI Theme

**Minimalist Black & White Design:**
- Primary: Black (#000)
- Secondary: White (#fff)
- Accents: Gray shades
- Font: System fonts for consistency

---

## 📋 Database Models

### User Model
```javascript
{
  _id: ObjectId,
  name: String,               // User's full name
  email: String,              // Unique email address
  password: String,           // Hashed with bcrypt (10 rounds)
  role: "admin" | "farmer",   // User role
  createdAt: Date,
  updatedAt: Date
}
```

### Report Model
```javascript
{
  _id: ObjectId,
  farmerId: ObjectId,         // Reference to User
  imageUrl: String,           // URL to crop image
  diagnosis: String,          // Disease diagnosis
  treatment: String,          // Recommended treatment
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🧪 Testing

### Test Admin Credentials
- Email: `admin@example.com`
- Password: `password123`

### Mobile App Testing
```bash
cd mobile
npm run ios  # or npm run android
```
- Login with test credentials
- View dashboard
- Test logout

### Admin Dashboard Testing
```bash
cd web
npm run dev
# Visit http://localhost:3000/login
```
- Login with test credentials
- Create/Edit/Delete farmers
- View reports with pagination

---

## 🛠️ Development Guide

### Adding New API Route
```javascript
// src/app/api/route-name/route.js
import connectDB from '@/lib/pool'

export async function GET(req) {
  await connectDB()
  // Your code here
}
```

### Adding New Admin Page
```javascript
// src/app/admin/page-name/page.js
'use client'
import Navbar from '@/components/Navbar'

export default function PageName() {
  return (
    <>
      <Navbar title="Page Title" />
      {/* Content here */}
    </>
  )
}
```

### Creating Reusable Component
```javascript
// src/components/ComponentName.js
'use client'

export default function ComponentName({ props }) {
  return <div>{/* JSX */}</div>
}
```

---

## 🔒 Security Considerations

1. **Password Hashing**: Bcrypt with 10 salt rounds
2. **JWT Tokens**: Expire after 7 days
3. **HttpOnly Cookies**: Inaccessible to JavaScript
4. **HTTPS**: Required in production
5. **Environment Variables**: Never commit secrets
6. **CORS**: Configure for your domain
7. **Input Validation**: All endpoints validate input

---

## 📚 Git Workflow & Commits

All 4 phases have been implemented with the following commits:

### Phase 1: Backend Setup
- ✅ Initialize Express/Next.js backend
- ✅ Connect MongoDB with Mongoose
- ✅ Create User & Report models
- ✅ Implement JWT authentication
- ✅ Add role-based authorization

### Phase 2: Mobile Authentication  
- ✅ Initialize React Native/Expo project
- ✅ Build farmer login screen UI
- ✅ Integrate login API with Axios
- ✅ Store JWT in AsyncStorage
- ✅ Create static dashboard screen

### Phase 3: Admin Dashboard Auth
- ✅ Initialize Next.js dashboard
- ✅ Configure black & white theme
- ✅ Create admin login page
- ✅ Implement secure cookies
- ✅ Protect routes with middleware

### Phase 4: Admin Features
- ✅ Create dashboard layout
- ✅ Add overview metrics page
- ✅ Implement reports table
- ✅ Build farmer CRUD interface
- ✅ Connect CRUD to backend API

**Push to repository:**
```bash
git add .
git commit -m "feat: complete agricultural diagnostic application"
git push origin khalil
```

---

## 🚨 Troubleshooting

### MongoDB Connection
- Verify MONGO_URI in `.env.local`
- Check IP whitelist on MongoDB Atlas
- Ensure MongoDB server is running

### Authentication Issues
- Clear browser cookies and AsyncStorage
- Check JWT_SECRET matches in .env
- Verify token hasn't expired

### API Errors
- Check request headers (especially Authorization)
- Verify role-based access control
- Check request body format

### Mobile App Issues
- Ensure API_URL points to correct backend
- Clear Expo cache: `npm start -- --clear`
- Check network connectivity

---

## 📞 Next Steps

1. **Database Setup**: Create MongoDB database
2. **Environment Configuration**: Set up `.env.local` in web/
3. **Create Admin User**: Use login endpoint to create admin
4. **Run Backend**: `npm run dev` in web/
5. **Run Mobile**: `npm run ios/android` in mobile/
6. **Start Developing**: Build additional features!

---

**Built with ❤️ for sustainable agriculture**
