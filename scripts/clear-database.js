import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import EventRegistration from '../src/models/EventRegistration.js';

// Load environment variables
dotenv.config({ path: './.env' });

const clearDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Get database name
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📊 Database: ${dbName}`);

    // Count documents before deletion
    const userCount = await User.countDocuments();
    const registrationCount = await EventRegistration.countDocuments();
    
    console.log(`\n📋 Current data:`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Event Registrations: ${registrationCount}`);

    if (userCount === 0 && registrationCount === 0) {
      console.log('\nℹ️  Database is already empty');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Delete all users
    const userResult = await User.deleteMany({});
    console.log(`\n🗑️  Deleted ${userResult.deletedCount} users`);

    // Delete all event registrations
    const registrationResult = await EventRegistration.deleteMany({});
    console.log(`🗑️  Deleted ${registrationResult.deletedCount} event registrations`);

    // Verify deletion
    const userCountAfter = await User.countDocuments();
    const registrationCountAfter = await EventRegistration.countDocuments();
    
    console.log(`\n✅ Verification:`);
    console.log(`   Users remaining: ${userCountAfter}`);
    console.log(`   Event Registrations remaining: ${registrationCountAfter}`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    console.log('✅ Database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Run the script
clearDatabase();











