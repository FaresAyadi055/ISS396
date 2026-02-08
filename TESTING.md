#!/bin/bash
# MongoDB & API Testing Guide
# This file contains all commands to test the ISS396 application

echo "=================================="
echo "ISS396 Testing Guide"
echo "=================================="
echo ""

# ============================================
# STEP 1: MongoDB Shell Commands
# ============================================
echo "STEP 1: MongoDB Shell Testing"
echo "=============================="
echo ""
echo "Run these commands in MongoDB shell (mongosh):"
echo ""
echo "# Connect to database"
echo "  use iss396"
echo ""
echo "# View all users"
echo "  db.users.find().pretty()"
echo ""
echo "# Find admin user"
echo "  db.users.findOne({ email: 'admin@example.com' })"
echo ""
echo "# Count farmers"
echo "  db.users.countDocuments({ role: 'farmer' })"
echo ""
echo "# View all reports"
echo "  db.reports.find().pretty()"
echo ""
echo "# Find reports by farmer"
echo "  db.reports.find({ farmerId: ObjectId('FARMER_ID_HERE') }).pretty()"
echo ""
echo "# Count total reports"
echo "  db.reports.countDocuments()"
echo ""
echo "# View database size"
echo "  db.stats()"
echo ""
echo "# List all indexes"
echo "  db.users.getIndexes()"
echo "  db.reports.getIndexes()"
echo ""

# ============================================
# STEP 2: API Testing Examples
# ============================================
echo ""
echo "STEP 2: API Testing (cURL)"
echo "=============================="
echo ""

echo "# 1. LOGIN as Admin"
echo "   curl -X POST http://localhost:3000/api/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"admin@example.com\",\"password\":\"password123\"}'"
echo ""
echo "   Response will include JWT token"
echo ""

echo "# 2. GET All Farmers (Admin Only)"
echo "   curl -H 'Authorization: Bearer <JWT_TOKEN>' \\"
echo "     http://localhost:3000/api/admin/farmers"
echo ""

echo "# 3. CREATE New Farmer (Admin Only)"
echo "   curl -X POST http://localhost:3000/api/admin/farmers \\"
echo "     -H 'Authorization: Bearer <JWT_TOKEN>' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"name\":\"Test Farmer\",\"email\":\"test@example.com\",\"password\":\"test123\"}'"
echo ""

echo "# 4. UPDATE Farmer (Admin Only)"
echo "   curl -X PUT http://localhost:3000/api/admin/farmers/<FARMER_ID> \\"
echo "     -H 'Authorization: Bearer <JWT_TOKEN>' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"name\":\"Updated Name\"}'"
echo ""

echo "# 5. DELETE Farmer (Admin Only)"
echo "   curl -X DELETE http://localhost:3000/api/admin/farmers/<FARMER_ID> \\"
echo "     -H 'Authorization: Bearer <JWT_TOKEN>'"
echo ""

echo "# 6. GET All Reports with Pagination"
echo "   curl -H 'Authorization: Bearer <JWT_TOKEN>' \\"
echo "     'http://localhost:3000/api/admin/reports?page=1&limit=10'"
echo ""

echo "# 7. LOGIN as Farmer"
echo "   curl -X POST http://localhost:3000/api/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"john.doe@example.com\",\"password\":\"farmer123\"}'"
echo ""

# ============================================
# STEP 3: Postman Collection
# ============================================
echo ""
echo "STEP 3: Postman Testing"
echo "========================"
echo ""
echo "Import this JSON into Postman"
echo ""

cat << 'POSTMAN_JSON'
{
  "info": {
    "name": "ISS396 API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login Admin",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\"email\":\"admin@example.com\",\"password\":\"password123\"}"
            }
          }
        },
        {
          "name": "Login Farmer",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\"email\":\"john.doe@example.com\",\"password\":\"farmer123\"}"
            }
          }
        }
      ]
    },
    {
      "name": "Admin - Farmers",
      "item": [
        {
          "name": "Get All Farmers",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/api/admin/farmers",
            "header": {"key": "Authorization", "value": "Bearer {{token}}"}
          }
        },
        {
          "name": "Create Farmer",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/admin/farmers",
            "header": {"key": "Authorization", "value": "Bearer {{token}}"},
            "body": {
              "mode": "raw",
              "raw": "{\"name\":\"New Farmer\",\"email\":\"new@example.com\",\"password\":\"pass123\"}"
            }
          }
        },
        {
          "name": "Update Farmer",
          "request": {
            "method": "PUT",
            "url": "{{baseUrl}}/api/admin/farmers/:id",
            "header": {"key": "Authorization", "value": "Bearer {{token}}"},
            "body": {
              "mode": "raw",
              "raw": "{\"name\":\"Updated Name\"}"
            }
          }
        },
        {
          "name": "Delete Farmer",
          "request": {
            "method": "DELETE",
            "url": "{{baseUrl}}/api/admin/farmers/:id",
            "header": {"key": "Authorization", "value": "Bearer {{token}}"}
          }
        }
      ]
    },
    {
      "name": "Admin - Reports",
      "item": [
        {
          "name": "Get All Reports",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/api/admin/reports?page=1&limit=10",
            "header": {"key": "Authorization", "value": "Bearer {{token}}"}
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000",
      "type": "string"
    },
    {
      "key": "token",
      "value": "",
      "type": "string"
    }
  ]
}
POSTMAN_JSON

echo ""

# ============================================
# STEP 4: Expected Responses
# ============================================
echo ""
echo "STEP 4: Expected API Responses"
echo "=============================="
echo ""
echo "Login Success (200):"
cat << 'JSON'
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65a7c1234567890abcdef123",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  }
}
JSON

echo ""
echo "Get Farmers (200):"
cat << 'JSON'
{
  "success": true,
  "farmers": [
    {
      "_id": "65a7c1234567890abcdef124",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "farmer",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
JSON

echo ""
echo "Create Farmer (201):"
cat << 'JSON'
{
  "success": true,
  "user": {
    "id": "65a7c1234567890abcdef125",
    "name": "Test Farmer",
    "email": "test@example.com",
    "role": "farmer"
  }
}
JSON

echo ""
echo "Error - No Token (401):"
cat << 'JSON'
{
  "success": false,
  "message": "No token provided"
}
JSON

echo ""
echo "Error - Not Admin (403):"
cat << 'JSON'
{
  "success": false,
  "message": "Access denied. Admin role required."
}
JSON

echo ""

# ============================================
# STEP 5: Browser Testing
# ============================================
echo "STEP 5: Browser Testing"
echo "======================="
echo ""
echo "Admin Dashboard:"
echo "  URL: http://localhost:3000/login"
echo "  Email: admin@example.com"
echo "  Password: password123"
echo ""
echo "Pages to test:"
echo "  1. /admin/dashboard - Overview with metrics"
echo "  2. /admin/farmers - Farmer CRUD operations"
echo "  3. /admin/reports - Reports table with pagination"
echo ""

# ============================================
# STEP 6: Mobile Testing
# ============================================
echo "STEP 6: Mobile App Testing"
echo "==========================="
echo ""
echo "Run mobile app:"
echo "  cd mobile"
echo "  npm run ios  # or npm run android"
echo ""
echo "Test credentials:"
echo "  Email: john.doe@example.com"
echo "  Password: farmer123"
echo ""
echo "Test flows:"
echo "  1. Login with farmer credentials"
echo "  2. View farmer dashboard"
echo "  3. Test logout button"
echo ""

# ============================================
# STEP 7: Verification Checklist
# ============================================
echo ""
echo "STEP 7: Verification Checklist"
echo "==============================="
echo ""
echo "✓ MongoDB Collections"
echo "  [ ] users collection exists"
echo "  [ ] reports collection exists"
echo "  [ ] Unique index on users.email"
echo ""
echo "✓ Authentication"
echo "  [ ] Admin login works"
echo "  [ ] Farmer login works"
echo "  [ ] Invalid credentials rejected"
echo "  [ ] JWT token returned"
echo ""
echo "✓ Admin CRUD"
echo "  [ ] Can list all farmers"
echo "  [ ] Can create new farmer"
echo "  [ ] Can update farmer details"
echo "  [ ] Can delete farmer"
echo "  [ ] Cannot access without token"
echo "  [ ] Cannot access as farmer"
echo ""
echo "✓ Reports"
echo "  [ ] Can list all reports"
echo "  [ ] Pagination works (page, limit)"
echo "  [ ] Farmer reference populated"
echo "  [ ] Reports sorted by date"
echo ""
echo "✓ UI/UX"
echo "  [ ] Admin login page styled (black & white)"
echo "  [ ] Admin dashboard accessible after login"
echo "  [ ] Farmer pages functional"
echo "  [ ] Mobile app login works"
echo ""

echo ""
echo "=================================="
echo "Ready to test ISS396!"
echo "=================================="
echo ""
