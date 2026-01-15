// Script to fix the ieee_membership_id index
// Run this once: node fix-index.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ieee_rgipt';

async function fixIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    // Drop the existing index
    try {
      await collection.dropIndex('ieee_membership_id_1');
      console.log('✅ Dropped existing ieee_membership_id_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('ℹ️  Index does not exist, will create new one');
      } else {
        throw err;
      }
    }

    // Create a sparse unique index
    await collection.createIndex(
      { ieee_membership_id: 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'ieee_membership_id_1'
      }
    );
    console.log('✅ Created sparse unique index on ieee_membership_id');

    // Verify the index
    const indexes = await collection.indexes();
    const ieeeIndex = indexes.find(idx => idx.name === 'ieee_membership_id_1');
    console.log('📋 Index details:', JSON.stringify(ieeeIndex, null, 2));

    console.log('✅ Index fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing index:', error);
    process.exit(1);
  }
}

fixIndex();




