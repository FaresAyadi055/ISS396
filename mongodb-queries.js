/**
 * MongoDB Testing Queries
 * Run these commands in: mongosh
 * 
 * Step 1: Set database
 *   use iss396
 * 
 * Then copy-paste the commands below
 */

// ============================================
// COLLECTION INFO
// ============================================

// Show all collections
show collections;

// Get collection stats
db.users.stats();
db.reports.stats();

// ============================================
// USER QUERIES
// ============================================

// Find all users
db.users.find().pretty();

// Count all users
db.users.countDocuments();

// Count by role
db.users.countDocuments({ role: 'admin' });
db.users.countDocuments({ role: 'farmer' });

// Find admin user
db.users.findOne({ email: 'admin@example.com' });

// Find specific user
db.users.findOne({ email: 'john.doe@example.com' });

// Find users by role
db.users.find({ role: 'farmer' }).pretty();

// Find users created in last 7 days
db.users.find({ 
  createdAt: { $gte: new Date(new Date().getTime() - 7*24*60*60*1000) }
}).pretty();

// Find user by ID (replace with actual ID)
db.users.findOne({ _id: ObjectId('PASTE_ID_HERE') });

// Count users with specific email pattern
db.users.countDocuments({ email: /example.com/ });

// Get user email addresses only
db.users.find({}, { email: 1, name: 1, role: 1 }).pretty();

// ============================================
// REPORT QUERIES
// ============================================

// Find all reports
db.reports.find().pretty();

// Count all reports
db.reports.countDocuments();

// Find reports by farmer (replace ID)
db.reports.find({ 
  farmerId: ObjectId('PASTE_FARMER_ID_HERE') 
}).pretty();

// Find reports with specific diagnosis
db.reports.find({ diagnosis: 'Powdery Mildew' }).pretty();

// Find recent reports (last 30 days)
db.reports.find({ 
  createdAt: { $gte: new Date(new Date().getTime() - 30*24*60*60*1000) }
}).pretty();

// Count reports by diagnosis
db.reports.aggregate([
  { $group: { _id: '$diagnosis', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]).pretty();

// Get reports with farmer details (aggregation)
db.reports.aggregate([
  {
    $lookup: {
      from: 'users',
      localField: 'farmerId',
      foreignField: '_id',
      as: 'farmer'
    }
  },
  { $unwind: '$farmer' },
  {
    $project: {
      _id: 1,
      farmerName: '$farmer.name',
      farmerEmail: '$farmer.email',
      diagnosis: 1,
      treatment: 1,
      createdAt: 1
    }
  }
]).pretty();

// Find reports with specific farmer name
db.reports.aggregate([
  {
    $lookup: {
      from: 'users',
      localField: 'farmerId',
      foreignField: '_id',
      as: 'farmer'
    }
  },
  { $match: { 'farmer.name': 'John Doe' } },
  { $unwind: '$farmer' },
  { $sort: { createdAt: -1 } }
]).pretty();

// ============================================
// PAGINATION EXAMPLE
// ============================================

// Get reports with pagination (page 1, 10 per page)
db.reports.find()
  .sort({ createdAt: -1 })
  .skip(0)
  .limit(10)
  .pretty();

// Get reports (page 2, 10 per page)
db.reports.find()
  .sort({ createdAt: -1 })
  .skip(10)
  .limit(10)
  .pretty();

// ============================================
// INDEX QUERIES
// ============================================

// Get all indexes
db.users.getIndexes();
db.reports.getIndexes();

// Verify email unique index
db.users.getIndex('email_1');

// ============================================
// DATA MODIFICATION TESTS
// ============================================

// Insert test user (if needed)
db.users.insertOne({
  name: 'Test User',
  email: 'test-user@example.com',
  password: 'will-be-hashed-by-app',
  role: 'farmer',
  createdAt: new Date(),
  updatedAt: new Date()
});

// Update user field
db.users.updateOne(
  { email: 'john.doe@example.com' },
  { $set: { name: 'Updated Name', updatedAt: new Date() } }
);

// Delete test user (use actual email)
db.users.deleteOne({ email: 'test-user@example.com' });

// Clear all test data and collections
db.users.drop();
db.reports.drop();

// ============================================
// VALIDATION & PERFORMANCE
// ============================================

// Check database size
db.stats();

// Explain query performance
db.users.explain('executionStats').find({ email: 'admin@example.com' });
db.reports.explain('executionStats').find({ farmerId: ObjectId('...') });

// ============================================
// BACKUP & EXPORT
// ============================================

// Export users to JSON (run in terminal, not in mongosh)
// mongoexport -d iss396 -c users -o users.json

// Export reports to JSON (run in terminal)
// mongoexport -d iss396 -c reports -o reports.json

// Import from JSON backup (run in terminal)
// mongoimport -d iss396 -c users users.json --drop

// ============================================
// USEFUL AGGREGATION QUERIES
// ============================================

// Get farmer statistics
db.reports.aggregate([
  {
    $group: {
      _id: '$farmerId',
      reportsCount: { $sum: 1 },
      lastReport: { $max: '$createdAt' },
      diagnoses: { $push: '$diagnosis' }
    }
  },
  { $sort: { reportsCount: -1 } }
]).pretty();

// Get report statistics
db.reports.aggregate([
  {
    $group: {
      _id: null,
      totalReports: { $sum: 1 },
      uniqueFarmers: { $addToSet: '$farmerId' },
      uniqueDiagnoses: { $addToSet: '$diagnosis' },
      avgTreatmentLength: { $avg: { $strLenCP: '$treatment' } }
    }
  }
]).pretty();

// ============================================
// TESTING SCRIPT (JS Format)
// ============================================

// Run all tests
function runTests() {
  console.log('🧪 Running MongoDB Tests...\n');
  
  // Test 1: Collections exist
  const collections = db.getCollectionNames();
  console.log('✓ Collections:', collections);
  
  // Test 2: User count
  const userCount = db.users.countDocuments();
  console.log('✓ Total users:', userCount);
  
  // Test 3: Admin user exists
  const adminUser = db.users.findOne({ role: 'admin' });
  console.log('✓ Admin user:', adminUser ? adminUser.email : 'NOT FOUND');
  
  // Test 4: Farmer count
  const farmerCount = db.users.countDocuments({ role: 'farmer' });
  console.log('✓ Total farmers:', farmerCount);
  
  // Test 5: Report count
  const reportCount = db.reports.countDocuments();
  console.log('✓ Total reports:', reportCount);
  
  // Test 6: Indexes
  const userIndexes = db.users.getIndexKeys();
  console.log('✓ User indexes:', userIndexes);
  
  // Test 7: Email unique index
  try {
    db.users.insertOne({ 
      name: 'Duplicate Test',
      email: 'admin@example.com',
      password: 'test',
      role: 'farmer'
    });
    console.log('❌ Email unique index NOT working!');
  } catch (e) {
    console.log('✓ Email unique index working (duplicate rejected)');
  }
  
  console.log('\n✅ All tests completed!');
}

// Uncomment to run: runTests();

// ============================================
// QUICK VERIFICATION
// ============================================

// Quick check - run these to verify setup
db.users.countDocuments();           // Should be > 0
db.reports.countDocuments();         // Should be > 0
db.users.countDocuments({ role: 'admin' }); // Should be 1
db.users.findOne({ role: 'admin' }); // Should show admin user
