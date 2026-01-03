import dotenv from 'dotenv';
import mongoose from 'mongoose';
import EventRegistration from '../src/models/EventRegistration.js';

// Load environment variables
dotenv.config({ path: './.env' });

const clearEventRegistrations = async () => {
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
    const registrationCount = await EventRegistration.countDocuments();
    
    console.log(`\n📋 Current Event Registrations: ${registrationCount}`);

    if (registrationCount === 0) {
      console.log('\nℹ️  No event registrations to delete');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Delete all event registrations
    const registrationResult = await EventRegistration.deleteMany({});
    console.log(`\n🗑️  Deleted ${registrationResult.deletedCount} event registrations`);

    // Verify deletion
    const registrationCountAfter = await EventRegistration.countDocuments();
    
    console.log(`\n✅ Verification:`);
    console.log(`   Event Registrations remaining: ${registrationCountAfter}`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    console.log('✅ Event registrations cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Run the script
clearEventRegistrations();





