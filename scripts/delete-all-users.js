import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

// Load environment variables
dotenv.config({ path: './.env' });

const deleteAllUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Count users before deletion
    const countBefore = await User.countDocuments();
    console.log(`📊 Found ${countBefore} users in database`);

    if (countBefore === 0) {
      console.log('ℹ️  No users to delete');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Delete all users
    const result = await User.deleteMany({});
    console.log(`🗑️  Deleted ${result.deletedCount} users`);

    // Verify deletion
    const countAfter = await User.countDocuments();
    console.log(`✅ Verification: ${countAfter} users remaining`);

    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Run the script
deleteAllUsers();












