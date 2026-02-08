#!/bin/bash
# Quick Start Testing Script
# Run with: bash quick-start.sh

set -e

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  ISS396 - Agricultural Diagnostic App ║"
echo "║       Quick Start & Testing Script    ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================
# Check Prerequisites
# ============================================
echo -e "${BLUE}📋 Checking prerequisites...${NC}"
echo ""

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "   Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

if ! command -v mongosh &> /dev/null; then
    echo -e "${YELLOW}⚠️  MongoDB Shell (mongosh) not found${NC}"
    echo "   Install with: npm install -g mongosh"
    echo "   Or: brew install mongosh (macOS)"
else
    echo -e "${GREEN}✅ MongoDB Shell installed${NC}"
fi

echo ""

# ============================================
# STEP 1: Setup Backend
# ============================================
echo -e "${BLUE}┌─ STEP 1: Backend Setup${NC}"
echo -e "${BLUE}└─────────────────────${NC}"
echo ""

echo "📦 Installing backend dependencies..."
cd web
npm install > /dev/null 2>&1 || npm install

echo -e "${GREEN}✅ Backend dependencies installed${NC}"
echo ""

# Check for .env.local
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local not found${NC}"
    echo "   Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo -e "${YELLOW}   ⚠️  IMPORTANT: Edit .env.local with your MongoDB URI${NC}"
    echo ""
    echo "   Current content:"
    cat .env.local | head -5
    echo ""
fi

echo ""

# ============================================
# STEP 2: MongoDB Setup & Seed
# ============================================
echo -e "${BLUE}┌─ STEP 2: MongoDB Setup${NC}"
echo -e "${BLUE}└──────────────────────${NC}"
echo ""

echo "⚠️  Checking MongoDB connection..."
echo "   Make sure MongoDB is running!"
echo ""

read -p "Is MongoDB running? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 Running database seed script..."
    if [ -f scripts/seed-database.js ]; then
        node scripts/seed-database.js
    else
        echo -e "${RED}❌ Seed script not found at scripts/seed-database.js${NC}"
        echo "   Create it manually with the provided MongoDB shell code"
    fi
    echo ""
else
    echo -e "${YELLOW}⚠️  Skipping database seed${NC}"
    echo "   Set up MongoDB and run later:"
    echo "   ${BLUE}node web/scripts/seed-database.js${NC}"
    echo ""
fi

# ============================================
# STEP 3: Start Backend Server
# ============================================
echo -e "${BLUE}┌─ STEP 3: Start Backend${NC}"
echo -e "${BLUE}└──────────────────────${NC}"
echo ""
echo "🚀 Starting Next.js development server..."
echo "   URL: ${BLUE}http://localhost:3000${NC}"
echo "   Login: ${BLUE}http://localhost:3000/login${NC}"
echo ""
echo "⚠️  Starting server in background..."
npm run dev &
SERVER_PID=$!
echo -e "${GREEN}✅ Server started (PID: $SERVER_PID)${NC}"
echo ""

# Wait for server to start
echo "⏳ Waiting for server to be ready..."
sleep 5

# Test server
echo "🧪 Testing server..."
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Server is running!${NC}"
else
    echo -e "${YELLOW}⚠️  Server might still be starting, check terminal${NC}"
fi

echo ""

# ============================================
# STEP 4: Test Credentials
# ============================================
echo -e "${BLUE}┌─ STEP 4: Test Credentials${NC}"
echo -e "${BLUE}└─────────────────────────${NC}"
echo ""

echo "👤 Admin Account:"
echo "   Email:    ${BLUE}admin@example.com${NC}"
echo "   Password: ${BLUE}password123${NC}"
echo ""

echo "👨‍🌾 Farmer Accounts (password: farmer123):"
echo "   • john.doe@example.com"
echo "   • jane.smith@example.com"
echo "   • ahmed.hassan@example.com"
echo "   • maria.garcia@example.com"
echo "   • david.wilson@example.com"
echo ""

# ============================================
# STEP 5: Test API Endpoints
# ============================================
echo -e "${BLUE}┌─ STEP 5: API Testing${NC}"
echo -e "${BLUE}└────────────────────${NC}"
echo ""

echo "🧪 Testing login endpoint..."

RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"password123"}')

if echo "$RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✅ Login works! Got JWT token${NC}"
    
    # Extract token (basic extraction for demo)
    TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "   Token (truncated): ${TOKEN:0:20}..."
    echo ""
    
    echo "🧪 Testing admin endpoint..."
    FARMERS=$(curl -s -H "Authorization: Bearer $TOKEN" \
      http://localhost:3000/api/admin/farmers)
    
    if echo "$FARMERS" | grep -q "farmers"; then
        echo -e "${GREEN}✅ Admin API works!${NC}"
    fi
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "   Response: $RESPONSE"
fi

echo ""

# ============================================
# STEP 6: Browser Instructions
# ============================================
echo -e "${BLUE}┌─ STEP 6: Open in Browser${NC}"
echo -e "${BLUE}└─────────────────────────${NC}"
echo ""

echo "🌐 Visit these URLs:"
echo ""
echo "   Login:     ${BLUE}http://localhost:3000/login${NC}"
echo "   Dashboard: ${BLUE}http://localhost:3000/admin/dashboard${NC}"
echo "   Farmers:   ${BLUE}http://localhost:3000/admin/farmers${NC}"
echo "   Reports:   ${BLUE}http://localhost:3000/admin/reports${NC}"
echo ""

read -p "Open in default browser? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then
        open http://localhost:3000/login
    elif command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3000/login
    elif command -v start &> /dev/null; then
        start http://localhost:3000/login
    fi
fi

echo ""

# ============================================
# STEP 7: Mobile App Setup (Optional)
# ============================================
echo -e "${BLUE}┌─ STEP 7: Mobile App (Optional)${NC}"
echo -e "${BLUE}└───────────────────────────────${NC}"
echo ""

read -p "Would you like to set up the mobile app? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd ../mobile
    echo "📦 Installing mobile dependencies..."
    npm install > /dev/null 2>&1 || npm install
    
    echo ""
    echo "To run the mobile app:"
    echo "  ${BLUE}npm run ios${NC}     # iOS simulator"
    echo "  ${BLUE}npm run android${NC} # Android emulator"
    echo "  ${BLUE}npm run web${NC}     # Web browser"
    echo ""
fi

echo ""

# ============================================
# Summary
# ============================================
echo "╔════════════════════════════════════════╗"
echo "║     ✅ Setup Complete!                 ║"
echo "╚════════════════════════════════════════╝"
echo ""

echo "📋 Next Steps:"
echo "   1. Open ${BLUE}http://localhost:3000/login${NC} in your browser"
echo "   2. Use admin credentials to login"
echo "   3. Explore Farmers, Reports, and Dashboard pages"
echo ""

echo "📚 Documentation:"
echo "   • Setup Guide:  ${BLUE}IMPLEMENTATION.md${NC}"
echo "   • Testing Guide: ${BLUE}TESTING.md${NC}"
echo ""

echo "🛑 To stop the server:"
echo "   ${BLUE}kill $SERVER_PID${NC}"
echo ""

echo "💡 For more info, see IMPLEMENTATION.md and TESTING.md"
echo ""
