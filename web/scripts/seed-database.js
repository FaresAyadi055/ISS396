/**
 * Database Seed Script
 * Run with: node web/scripts/seed-database.js
 * 
 * Creates test users and reports with proper bcrypt hashing
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Import models
const User = require('../src/models/User').default;
const Report = require('../src/models/Report').default;

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/iss396';

async function seedDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    console.log('🗑️  Clearing existing test data...');
    await User.deleteMany({});
    await Report.deleteMany({});
    console.log('✅ Collections cleared\n');

    // ============================================
    // Create Admin User
    // ============================================
    console.log('👤 Creating admin user...');
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123', // Will be hashed by model
      role: 'admin'
    });
    console.log('✅ Admin user created');
    console.log(`   ID: ${adminUser._id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}\n`);

    // ============================================
    // Create Sample Farmers
    // ============================================
    console.log('👨‍🌾 Creating sample farmers...');
    const farmers = await User.insertMany([
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'farmer123',
        role: 'farmer'
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        password: 'farmer123',
        role: 'farmer'
      },
      {
        name: 'Ahmed Hassan',
        email: 'ahmed.hassan@example.com',
        password: 'farmer123',
        role: 'farmer'
      },
      {
        name: 'Maria Garcia',
        email: 'maria.garcia@example.com',
        password: 'farmer123',
        role: 'farmer'
      },
      {
        name: 'David Wilson',
        email: 'david.wilson@example.com',
        password: 'farmer123',
        role: 'farmer'
      }
    ]);
    console.log(`✅ Created ${farmers.length} farmers\n`);

    // ============================================
    // Create Sample Reports
    // ============================================
    console.log('📋 Creating sample reports...');
    const reports = await Report.insertMany([
      {
        farmerId: farmers[0]._id,
        imageUrl: 'https://example.com/images/crop-01.jpg',
        diagnosis: 'Powdery Mildew',
        treatment: 'Apply sulfur-based fungicide spray every 7-10 days. Ensure good air circulation by pruning affected leaves.'
      },
      {
        farmerId: farmers[0]._id,
        imageUrl: 'https://example.com/images/crop-02.jpg',
        diagnosis: 'Leaf Spot Disease',
        treatment: 'Remove infected leaves. Spray with copper fungicide. Improve drainage to reduce moisture.'
      },
      {
        farmerId: farmers[1]._id,
        imageUrl: 'https://example.com/images/crop-03.jpg',
        diagnosis: 'Rust',
        treatment: 'Apply phosphite fungicide. Increase air circulation. Remove infected plant parts.'
      },
      {
        farmerId: farmers[1]._id,
        imageUrl: 'https://example.com/images/crop-04.jpg',
        diagnosis: 'Blight',
        treatment: 'Remove infected plants completely. Apply copper sulfate spray. Quarantine diseased area.'
      },
      {
        farmerId: farmers[2]._id,
        imageUrl: 'https://example.com/images/crop-05.jpg',
        diagnosis: 'Mildew',
        treatment: 'Spray with organic fungicide. Reduce watering from overhead. Ensure good ventilation.'
      },
      {
        farmerId: farmers[3]._id,
        imageUrl: 'https://example.com/images/crop-06.jpg',
        diagnosis: 'Root Rot',
        treatment: 'Improve soil drainage. Reduce watering frequency. Use well-draining potting mix.'
      }
    ]);
    console.log(`✅ Created ${reports.length} reports\n`);

    // ============================================
    // Display Summary
    // ============================================
    console.log('===============================================');
    console.log('✅ Database Seeding Complete!');
    console.log('===============================================\n');

    console.log('📊 Summary:');
    console.log(`   Users: 1 admin + ${farmers.length} farmers = ${1 + farmers.length} total`);
    console.log(`   Reports: ${reports.length}`);
    console.log('\n🔐 Test Credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: password123');
    console.log('   Role: admin\n');

    console.log('👨‍🌾 Farmer Credentials (all use password: farmer123):');
    farmers.forEach((farmer, idx) => {
      console.log(`   ${idx + 1}. ${farmer.email} (${farmer.name})`);
    });

    console.log('\n🚀 Next Steps:');
    console.log('   1. Start backend: npm run dev (in web/)');
    console.log('   2. Login to http://localhost:3000/login');
    console.log('   3. Use admin credentials above');
    console.log('   4. Navigate to Farmers or Reports pages\n');

    console.log('===============================================\n');

    await mongoose.disconnect();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run seed
seedDatabase();
