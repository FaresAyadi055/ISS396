// MongoDB Shell Script - Run with: mongosh < mongodb-setup.js
// This script sets up the database structure and creates test data

// Switch to the project database
db = db.getSiblingDB('iss396');

console.log('🔄 Setting up ISS396 database...\n');

// ============================================
// Drop existing collections (for fresh start)
// ============================================
console.log('📋 Dropping existing collections...');
try {
  db.users.drop();
  db.reports.drop();
  console.log('✅ Collections dropped\n');
} catch (e) {
  console.log('ℹ️  No existing collections to drop\n');
}

// ============================================
// Create Users Collection
// ============================================
console.log('👤 Creating users collection...');
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email', 'password', 'role'],
      properties: {
        _id: { bsonType: 'objectId' },
        name: { bsonType: 'string', description: 'User full name' },
        email: { bsonType: 'string', description: 'Unique email address' },
        password: { bsonType: 'string', description: 'Hashed password' },
        role: {
          enum: ['admin', 'farmer'],
          description: 'User role'
        },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

// Create indexes for users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });
console.log('✅ Users collection created with indexes\n');

// ============================================
// Create Reports Collection
// ============================================
console.log('📊 Creating reports collection...');
db.createCollection('reports', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['farmerId', 'imageUrl', 'diagnosis', 'treatment'],
      properties: {
        _id: { bsonType: 'objectId' },
        farmerId: { bsonType: 'objectId', description: 'Reference to User' },
        imageUrl: { bsonType: 'string', description: 'URL to crop image' },
        diagnosis: { bsonType: 'string', description: 'Disease diagnosis' },
        treatment: { bsonType: 'string', description: 'Recommended treatment' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

// Create indexes for reports
db.reports.createIndex({ farmerId: 1 });
db.reports.createIndex({ createdAt: -1 });
console.log('✅ Reports collection created with indexes\n');

// ============================================
// Verify Collections
// ============================================
console.log('🔍 Verifying database structure...');
const collections = db.getCollectionNames();
console.log('📦 Collections:', collections);
console.log('✅ Database setup complete!\n');

// ============================================
// Display Connection Info
// ============================================
console.log('===============================================');
console.log('✅ ISS396 Database Ready for Testing');
console.log('===============================================');
console.log('Database: iss396');
console.log('Collections:');
console.log('  - users (schema validated)');
console.log('  - reports (schema validated)');
console.log('\n⚠️  NEXT STEP:');
console.log('Run the seed data script to create test users:');
console.log('  node web/scripts/seed-database.js');
console.log('===============================================\n');

// Exit
quit();
