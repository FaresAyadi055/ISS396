# MongoDB & Testing Guide

Complete testing setup for the ISS396 Agricultural Diagnostic Application

---

## 📁 Testing Files Overview

### 1. **mongodb-setup.js**
MongoDB shell script to create database structure with validation

**How to run:**
```bash
mongosh < mongodb-setup.js
```

**What it does:**
- Creates `iss396` database
- Creates `users` collection with schema validation
- Creates `reports` collection with schema validation  
- Sets up indexes for optimal performance
- Validates unique email constraint

---

### 2. **web/scripts/seed-database.js**
Node.js script to populate database with test data

**How to run:**
```bash
cd web
npm install  # First time only
node scripts/seed-database.js
```

**What it creates:**
- 1 admin user (admin@example.com / password123)
- 5 farmer accounts with different emails
- 6 sample reports with diagnoses and treatments
- Proper bcrypt password hashing
- Timestamps for all records

**Output:**
```
✅ Database Seeding Complete!
📊 Summary:
   Users: 1 admin + 5 farmers = 6 total
   Reports: 6
🔐 Test Credentials:
   Email: admin@example.com
   Password: password123
```

---

### 3. **mongodb-queries.js**
Collection of MongoDB shell queries for testing and verification

**How to run:**
```bash
mongosh
use iss396
// Copy-paste commands from this file
```

**Included queries:**
- Collection information
- User queries (find, count, aggregate)
- Report queries (find, count, joins)
- Pagination examples
- Index information
- Data modification tests
- Backup/export commands
- Performance analysis
- Complete test suite

---

### 4. **quick-start.sh** (macOS/Linux)
Automated setup script that runs everything

**How to run:**
```bash
# Give execute permission
chmod +x quick-start.sh

# Run the script
./quick-start.sh
```

**What it does:**
1. ✅ Checks Node.js and MongoDB
2. 📦 Installs backend dependencies
3. 🗄️ Creates database with MongoDB
4. 🌱 Seeds test data
5. 🚀 Starts Next.js server
6. 🧪 Tests API endpoints
7. 🌐 Offers to open browser
8. 📱 Optional mobile setup

---

### 5. **quick-start.bat** (Windows)
Windows batch version of quick start script

**How to run:**
```cmd
quick-start.bat
```

Same functionality as `quick-start.sh` but for Windows

---

### 6. **TESTING.md**
Comprehensive testing guide with examples

**Contains:**
- MongoDB shell commands
- cURL API examples
- Postman collection (JSON)
- Expected API responses
- Error handling examples
- Browser testing URLs
- Mobile app testing
- Verification checklist

---

## 🚀 Quick Start (5 minutes)

### Step 1: Setup Database
```bash
# Create collections and schema
mongosh < mongodb-setup.js

# Seed test data
cd web
node scripts/seed-database.js
```

### Step 2: Start Backend
```bash
cd web
npm install
npm run dev
# Server runs on http://localhost:3000
```

### Step 3: Login & Test
```
Browser: http://localhost:3000/login
Email: admin@example.com
Password: password123
```

---

## 📡 API Testing Examples

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"password123"}'
```

### Get All Farmers (Admin Only)
```bash
curl -H 'Authorization: Bearer <TOKEN>' \
  http://localhost:3000/api/admin/farmers
```

### Create Farmer (Admin Only)
```bash
curl -X POST http://localhost:3000/api/admin/farmers \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"New Farmer",
    "email":"new@example.com",
    "password":"password123"
  }'
```

### Get Reports with Pagination
```bash
curl -H 'Authorization: Bearer <TOKEN>' \
  'http://localhost:3000/api/admin/reports?page=1&limit=10'
```

---

## 🧪 MongoDB Testing

### Check Database Status
```bash
mongosh
use iss396
db.users.countDocuments()        # Count users
db.reports.countDocuments()      # Count reports
db.users.find().pretty()         # View all users
db.reports.find().pretty()       # View all reports
```

### Verify Email Index
```bash
db.users.getIndexes()            # Show all indexes
db.users.getIndex('email_1')     # Get email index info
```

### Test Duplicate Email Prevention
```bash
# This should fail (email already exists)
db.users.insertOne({
  name: 'Test',
  email: 'admin@example.com',  // Duplicate!
  password: 'test',
  role: 'farmer'
})
```

### Get Farmer Statistics
```bash
db.reports.aggregate([
  { $group: {
      _id: '$farmerId',
      reportCount: { $sum: 1 },
      lastReport: { $max: '$createdAt' }
    }
  },
  { $sort: { reportCount: -1 } }
]).pretty()
```

---

## 📊 Testing Checklist

### Database Layer
- [ ] MongoDB running and accessible
- [ ] `iss396` database exists
- [ ] `users` collection with 6 records (1 admin + 5 farmers)
- [ ] `reports` collection with 6 records
- [ ] Indexes created correctly
- [ ] Email unique constraint working

### API Layer
- [ ] Login endpoint returns JWT token
- [ ] Admin can access `/api/admin/farmers`
- [ ] Farmer cannot access `/api/admin/farmers`
- [ ] Get farmers returns all farmers (5)
- [ ] Get reports works with pagination
- [ ] Invalid token rejected

### UI/UX
- [ ] Admin login page loads correctly
- [ ] Admin can login successfully
- [ ] Dashboard shows metrics
- [ ] Farmer list displays all farmers
- [ ] Reports page shows paginated reports
- [ ] Black & white minimalist theme applied
- [ ] Responsive on desktop

### Mobile (Optional)
- [ ] Login screen works
- [ ] Farmer can login
- [ ] Dashboard displays user info
- [ ] Logout button functional
- [ ] Black & white minimalist design

---

## 🔐 Test Credentials

**Admin:**
```
Email: admin@example.com
Password: password123
Role: admin
```

**Farmers:** (password: farmer123)
```
john.doe@example.com
jane.smith@example.com
ahmed.hassan@example.com
maria.garcia@example.com
david.wilson@example.com
```

---

## 🛠️ Troubleshooting

### MongoDB Connection Failed
- Ensure MongoDB is running: `mongosh`
- Check MONGO_URI in `.env.local`
- Verify IP whitelist on MongoDB Atlas

### Seed Script Fails
```bash
# Check if mongoose is installed
cd web
npm install mongoose bcrypt

# Run seed script again
node scripts/seed-database.js
```

### API Tests Return 401/403
- Verify JWT_SECRET in `.env.local`
- Check authorization header format: `Bearer <TOKEN>`
- Ensure token hasn't expired

### Database Schema Validation Errors
```bash
# Reset database
mongosh
use iss396
db.dropDatabase()

# Re-run setup
mongosh < mongodb-setup.js
node web/scripts/seed-database.js
```

---

## 📚 File Locations

```
ISS396/
├── mongodb-setup.js              # Database schema setup
├── mongodb-queries.js            # Test queries
├── quick-start.sh                # Auto setup (Linux/macOS)
├── quick-start.bat               # Auto setup (Windows)
├── TESTING.md                    # Full testing guide
├── IMPLEMENTATION.md             # Architecture guide
└── web/
    └── scripts/
        └── seed-database.js      # Seed test data
```

---

## 🎯 Next Steps

1. **Run setup:** `mongosh < mongodb-setup.js`
2. **Seed data:** `node web/scripts/seed-database.js`
3. **Start server:** `npm run dev` (in web/)
4. **Test login:** http://localhost:3000/login
5. **Explore app:** Create, edit, delete farmers
6. **Check reports:** View paginated reports
7. **Test mobile:** `npm run ios` (in mobile/)

---

## 📞 Support

For detailed information:
- See `IMPLEMENTATION.md` for architecture
- See `TESTING.md` for complete testing guide
- Check `mongodb-queries.js` for all available queries

---

**Happy Testing! 🚀**
