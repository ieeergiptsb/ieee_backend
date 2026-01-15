// Cleanup script: remove ieee_membership_id field where it is explicitly null
// Run once: node scripts/cleanup-ieee-membership-id-null.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined. Please set it in your environment.');
  process.exit(1);
}

async function cleanupNullIeeeMembershipId() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    // Count documents with ieee_membership_id explicitly set to null
    const countBefore = await collection.countDocuments({ ieee_membership_id: null });
    console.log(`📊 Documents with ieee_membership_id: null before cleanup: ${countBefore}`);

    if (countBefore > 0) {
      const result = await collection.updateMany(
        { ieee_membership_id: null },
        { $unset: { ieee_membership_id: "" } }
      );
      console.log(`✅ Updated documents: ${result.modifiedCount}`);
    } else {
      console.log('ℹ️ No documents with ieee_membership_id: null found.');
    }

    const countAfter = await collection.countDocuments({ ieee_membership_id: null });
    console.log(`📊 Documents with ieee_membership_id: null after cleanup: ${countAfter}`);

    // Show index definition for verification
    const indexes = await collection.indexes();
    const ieeeIndex = indexes.find(idx => idx.name === 'ieee_membership_id_1');
    console.log('📋 Current ieee_membership_id_1 index:', JSON.stringify(ieeeIndex, null, 2));

    console.log('✅ Cleanup completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupNullIeeeMembershipId();


